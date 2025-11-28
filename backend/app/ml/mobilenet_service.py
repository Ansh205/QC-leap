"""
MobileNetV3 Service for Defect Classification
Lightweight, fast, and efficient - perfect for 4GB GPU
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, models
from PIL import Image
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import os

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_WEIGHTS_DIR = PROJECT_ROOT / "model_weights"

class MobileNetService:
    """Service for MobileNetV3-based defect classification"""

    def __init__(self, model_weights_dir: str = "model_weights"):
        self.device = None
        self.model_weights_dir = Path(model_weights_dir)
        self.model_weights_dir.mkdir(exist_ok=True)
        self.model = None
        self.current_checkpoint_path = None  # Track loaded checkpoint
        self.img_size = 224  # Standard ImageNet size

        # Transform for TRAINING (with augmentation to prevent overfitting)
        self.train_transform = transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.3),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Transform for VALIDATION/PREDICTION (no augmentation)
        self.val_transform = transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def initialize_model(self, checkpoint_path: Optional[str] = None):
        """Initialize or load MobileNetV3 model"""
        if self.device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {self.device}")

        # Use MobileNetV3-Small (fastest, lowest memory)
        print("Loading MobileNetV3-Small (optimized for 4GB GPU)")
        self.model = models.mobilenet_v3_small(weights='DEFAULT')

        # Replace classifier for binary classification
        in_features = self.model.classifier[0].in_features
        self.model.classifier = nn.Sequential(
            nn.Linear(in_features, 1024),
            nn.Hardswish(),
            nn.Dropout(0.5),  # Increased from 0.2 to 0.5 to fight overfitting
            nn.Linear(1024, 2)  # Binary: normal vs defective
        )

        self.model = self.model.to(self.device)

        # Load checkpoint if provided
        if checkpoint_path and os.path.exists(checkpoint_path):
            self.model.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
            self.current_checkpoint_path = checkpoint_path

        self.model.eval()
        return self.model

    def train_classifier(
        self,
        normal_images_dir: str,
        defective_images_dir: str,
        output_checkpoint: str,
        epochs: int = 30,
        batch_size: int = 16,  # Can use larger batch with MobileNet
        learning_rate: float = 1e-4,
        validation_split: float = 0.2,
        progress_callback: callable = None
    ) -> Dict:
        """
        Train MobileNetV3 classifier on normal and defective images

        Args:
            normal_images_dir: Directory with normal images
            defective_images_dir: Directory with defective images
            output_checkpoint: Path to save trained model
            epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate
            validation_split: Validation data split ratio
            progress_callback: Callback for progress updates

        Returns:
            dict with training metrics
        """
        # Initialize device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")

        # Initialize model
        self.initialize_model()

        # Load datasets
        normal_images = self._load_labeled_images(normal_images_dir, label=0)
        defective_images = self._load_labeled_images(defective_images_dir, label=1)

        # Combine and split
        all_data = normal_images + defective_images
        np.random.shuffle(all_data)

        split_idx = int(len(all_data) * (1 - validation_split))
        train_data = all_data[:split_idx]
        val_data = all_data[split_idx:]

        print(f"Training samples: {len(train_data)}, Validation samples: {len(val_data)}")

        # Calculate class weights for imbalanced data
        num_normal = len(normal_images)
        num_defective = len(defective_images)
        total = num_normal + num_defective

        weight_normal = total / (2.0 * num_normal)
        weight_defective = total / (2.0 * num_defective)
        class_weights = torch.tensor([weight_normal, weight_defective]).to(self.device)

        print(f"Class distribution: Normal={num_normal}, Defective={num_defective}")
        print(f"Class weights: Normal={weight_normal:.3f}, Defective={weight_defective:.3f}")

        # Optimizer and loss (with weight_decay to fight overfitting)
        optimizer = optim.AdamW(self.model.parameters(), lr=learning_rate, weight_decay=1e-4)
        criterion = nn.CrossEntropyLoss(weight=class_weights)

        # Learning Rate Scheduler - reduces LR when val_loss plateaus
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode='min',      # Monitor validation loss
            patience=2,      # Reduce LR if val_loss flat for 2 epochs
            factor=0.1,      # Reduce LR by 90%
            verbose=True
        )

        # Early Stopping parameters
        patience = 5  # Stop after 5 epochs with no improvement
        epochs_without_improvement = 0
        best_val_loss = float('inf')  # Track best validation loss

        # Training metrics
        metrics = {
            'train_losses': [],
            'train_accuracies': [],
            'val_losses': [],
            'val_accuracies': [],
            'best_val_accuracy': 0.0,
            'best_val_loss': float('inf'),
            'epochs_completed': 0,
            'early_stopped': False
        }

        best_val_acc = 0.0

        print("Starting MobileNetV3 training with Early Stopping (patience=5)...")

        # Training loop
        for epoch in range(epochs):
            # Training phase
            self.model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0

            for i in range(0, len(train_data), batch_size):
                batch = train_data[i:i + batch_size]
                images = torch.stack([item[0] for item in batch]).to(self.device)
                labels = torch.tensor([item[1] for item in batch]).to(self.device)

                optimizer.zero_grad()
                outputs = self.model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                _, predicted = torch.max(outputs, 1)
                train_total += labels.size(0)
                train_correct += (predicted == labels).sum().item()
                train_loss += loss.item()

            avg_train_loss = train_loss / (len(train_data) / batch_size)
            train_accuracy = 100 * train_correct / train_total

            # Validation phase
            self.model.eval()
            val_loss = 0.0
            val_correct = 0
            val_total = 0

            with torch.no_grad():
                for i in range(0, len(val_data), batch_size):
                    batch = val_data[i:i + batch_size]
                    images = torch.stack([item[0] for item in batch]).to(self.device)
                    labels = torch.tensor([item[1] for item in batch]).to(self.device)

                    outputs = self.model(images)
                    loss = criterion(outputs, labels)

                    _, predicted = torch.max(outputs, 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()
                    val_loss += loss.item()

            avg_val_loss = val_loss / max(1, len(val_data) / batch_size)
            val_accuracy = 100 * val_correct / val_total

            # Record metrics
            metrics['train_losses'].append(avg_train_loss)
            metrics['train_accuracies'].append(train_accuracy)
            metrics['val_losses'].append(avg_val_loss)
            metrics['val_accuracies'].append(val_accuracy)
            metrics['epochs_completed'] = epoch + 1

            # Step the learning rate scheduler
            scheduler.step(avg_val_loss)

            # Early Stopping Logic - save only when model improves
            if avg_val_loss < best_val_loss:
                # This is the new best model!
                best_val_loss = avg_val_loss
                best_val_acc = val_accuracy
                epochs_without_improvement = 0
                metrics['best_val_accuracy'] = best_val_acc
                metrics['best_val_loss'] = best_val_loss

                # Save checkpoint ONLY when it's the best
                torch.save(self.model.state_dict(), output_checkpoint)
                print(f"  ✅ New best model saved! Val Loss: {best_val_loss:.4f}, Val Acc: {best_val_acc:.2f}%")
            else:
                # No improvement
                epochs_without_improvement += 1
                print(f"  ⚠️  No improvement for {epochs_without_improvement} epoch(s)")

            # Check if we should stop early
            if epochs_without_improvement >= patience:
                print(f"\n🛑 Early stopping triggered after {epoch + 1} epochs (no improvement for {patience} epochs)")
                metrics['early_stopped'] = True
                break

            # Update progress callback (50% to 95%)
            if progress_callback:
                progress = 50 + int((epoch + 1) / epochs * 45)
                progress_callback(progress, f"mobilenet_training_epoch_{epoch+1}")

            # Log progress EVERY epoch
            print(f"MobileNet Epoch [{epoch+1}/{epochs}]")
            print(f"  Train Loss: {avg_train_loss:.4f}, Train Acc: {train_accuracy:.2f}%")
            print(f"  Val Loss: {avg_val_loss:.4f}, Val Acc: {val_accuracy:.2f}%")
            if self.device.type == 'cuda' and (epoch + 1) % 5 == 0:
                print(f"  GPU Memory: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")

            # Clear CUDA cache periodically
            if (epoch + 1) % 5 == 0 and self.device.type == 'cuda':
                torch.cuda.empty_cache()

        # Load best model from checkpoint
        print(f"\n📦 Loading best model with Val Loss: {best_val_loss:.4f}, Val Acc: {best_val_acc:.2f}%")
        self.model.load_state_dict(torch.load(output_checkpoint, map_location=self.device))
        self.model.eval()

        # Final cleanup
        if self.device.type == 'cuda':
            torch.cuda.empty_cache()
            print(f"Training complete. Final GPU memory: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")

        return metrics

    def _load_labeled_images(self, images_dir: str, label: int) -> List[Tuple[torch.Tensor, int]]:
        """
        Load and preprocess labeled images for TRAINING
        Uses train_transform with augmentation to prevent overfitting
        """
        labeled_images = []
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']
        image_paths = []

        for ext in image_extensions:
            image_paths.extend(Path(images_dir).glob(ext))

        image_paths = list(set(image_paths))
        label_name = "normal" if label == 0 else "defective"
        print(f"Found {len(image_paths)} {label_name} images in {images_dir}")

        for img_path in image_paths:
            try:
                img = Image.open(img_path).convert('RGB')
                # Use TRAIN transform with augmentation
                img_tensor = self.train_transform(img)
                labeled_images.append((img_tensor, label))
            except Exception as e:
                print(f"Error loading {img_path}: {e}")

        print(f"Successfully loaded {len(labeled_images)} {label_name} images (with augmentation)")
        return labeled_images

    def predict(self, image_path: str, checkpoint_path: Optional[str] = None) -> Dict:
        """Predict if image is defective or normal"""
        # CRITICAL FIX: Reload model if checkpoint changed
        if self.model is None or self.current_checkpoint_path != checkpoint_path:
            print(f"Loading model from checkpoint: {checkpoint_path}")
            self.initialize_model(checkpoint_path)

        self.model.eval()

        img = Image.open(image_path).convert('RGB')
        # Use validation transform (no augmentation) for prediction
        img_tensor = self.val_transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(img_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)

        label = "normal" if predicted.item() == 0 else "defective"

        return {
            'label': label,
            'confidence': float(confidence.item()),
            'probabilities': {
                'normal': float(probabilities[0][0].item()),
                'defective': float(probabilities[0][1].item())
            }
        }

    def predict_batch(self, image_paths: List[str], checkpoint_path: Optional[str] = None) -> List[Dict]:
        """Batch prediction for multiple images"""
        if self.model is None:
            self.initialize_model(checkpoint_path)

        self.model.eval()
        results = []

        for img_path in image_paths:
            result = self.predict(img_path, checkpoint_path)
            results.append(result)

        return results

    def get_model_checkpoint_path(self, model_id: int) -> str:
        """Get checkpoint path for a specific model"""
        return str(self.model_weights_dir / f"mobilenet_model_{model_id}.pth")


# Global MobileNet service instance
# mobilenet_service = MobileNetService(model_weights_dir="/home/kabilan/se-project/backend/model_weights")
mobilenet_service = MobileNetService()
