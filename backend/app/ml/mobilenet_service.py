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

class MobileNetService:
    """Service for MobileNetV3-based defect classification"""

    def __init__(self, model_weights_dir: str = None):
        self.device = None
        # Use relative path if not provided
        if model_weights_dir:
            self.model_weights_dir = Path(model_weights_dir)
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.model_weights_dir = Path(base_dir) / "model_weights"
            
        self.model_weights_dir.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.current_checkpoint_path = None
        self.img_size = 224

        # Transform for TRAINING (with augmentation)
        self.train_transform = transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.3),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Transform for VALIDATION (no augmentation)
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

        if self.model is None:
            print("Loading MobileNetV3-Small...")
            self.model = models.mobilenet_v3_small(weights='DEFAULT')
            in_features = self.model.classifier[0].in_features
            self.model.classifier = nn.Sequential(
                nn.Linear(in_features, 1024),
                nn.Hardswish(),
                nn.Dropout(0.5),
                nn.Linear(1024, 2)
            )
            self.model = self.model.to(self.device)

        if checkpoint_path and os.path.exists(checkpoint_path):
            try:
                self.model.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
                self.current_checkpoint_path = checkpoint_path
            except Exception as e:
                print(f"Failed to load checkpoint: {e}")

        return self.model

    def train_classifier(
        self,
        normal_images_dir: str,
        defective_images_dir: str,
        output_checkpoint: str,
        epochs: int = 30,
        batch_size: int = 16,
        learning_rate: float = 1e-4,
        validation_split: float = 0.2,
        progress_callback: callable = None
    ) -> Dict:
        """Train MobileNetV3 classifier"""
        self.initialize_model()

        # Load datasets
        normal_images = self._load_labeled_images(normal_images_dir, label=0)
        defective_images = self._load_labeled_images(defective_images_dir, label=1)

        all_data = normal_images + defective_images
        np.random.shuffle(all_data)

        if not all_data:
            raise ValueError("No training data available")

        split_idx = int(len(all_data) * (1 - validation_split))
        train_data = all_data[:split_idx]
        val_data = all_data[split_idx:]

        # Class weights
        num_normal = len(normal_images)
        num_defective = len(defective_images)
        total = num_normal + num_defective
        
        # Handle zero division
        w_norm = total / (2.0 * num_normal) if num_normal > 0 else 1.0
        w_def = total / (2.0 * num_defective) if num_defective > 0 else 1.0
        
        class_weights = torch.tensor([w_norm, w_def]).float().to(self.device)

        optimizer = optim.AdamW(self.model.parameters(), lr=learning_rate, weight_decay=1e-4)
        criterion = nn.CrossEntropyLoss(weight=class_weights)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3, factor=0.1)

        metrics = {
            'train_losses': [], 'train_accuracies': [],
            'val_losses': [], 'val_accuracies': [],
            'best_val_accuracy': 0.0,
            'epochs_completed': 0
        }

        best_val_loss = float('inf')
        epochs_without_improvement = 0
        total_batches = len(train_data) // batch_size
        if total_batches == 0: total_batches = 1

        print("Starting training...")

        for epoch in range(epochs):
            self.model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0

            # --- TRAINING LOOP WITH REAL-TIME PROGRESS ---
            for batch_idx, i in enumerate(range(0, len(train_data), batch_size)):
                batch = train_data[i:i + batch_size]
                if not batch: continue

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

                # Update progress every 5 batches (or at least once)
                if progress_callback and (batch_idx % 5 == 0 or batch_idx == total_batches - 1):
                    # Calculate granular progress (50% to 95% of total job)
                    current_global_step = (epoch * total_batches) + batch_idx
                    total_global_steps = epochs * total_batches
                    
                    # Map 0-100% of training steps to 50-95% of total job progress
                    progress_pct = 50 + int((current_global_step / total_global_steps) * 45)
                    
                    # Log message
                    status_msg = f"Epoch {epoch+1}/{epochs} - Batch {batch_idx+1}/{total_batches}"
                    progress_callback(progress_pct, status_msg)
            # ---------------------------------------------

            avg_train_loss = train_loss / max(1, total_batches)
            train_accuracy = 100 * train_correct / max(1, train_total)

            # Validation
            self.model.eval()
            val_loss = 0.0
            val_correct = 0
            val_total = 0

            with torch.no_grad():
                for i in range(0, len(val_data), batch_size):
                    batch = val_data[i:i + batch_size]
                    if not batch: continue
                    
                    images = torch.stack([item[0] for item in batch]).to(self.device)
                    labels = torch.tensor([item[1] for item in batch]).to(self.device)

                    outputs = self.model(images)
                    loss = criterion(outputs, labels)
                    _, predicted = torch.max(outputs, 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()
                    val_loss += loss.item()

            avg_val_loss = val_loss / max(1, len(val_data) // batch_size)
            val_accuracy = 100 * val_correct / max(1, val_total)

            metrics['train_losses'].append(avg_train_loss)
            metrics['val_losses'].append(avg_val_loss)
            metrics['epochs_completed'] = epoch + 1

            scheduler.step(avg_val_loss)

            print(f"Epoch {epoch+1}: Train Acc: {train_accuracy:.2f}%, Val Acc: {val_accuracy:.2f}%")

            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                metrics['best_val_accuracy'] = val_accuracy
                torch.save(self.model.state_dict(), output_checkpoint)
                epochs_without_improvement = 0
            else:
                epochs_without_improvement += 1

            if epochs_without_improvement >= 5:
                print("Early stopping triggered")
                break

        return metrics

    def _load_labeled_images(self, images_dir: str, label: int) -> List[Tuple[torch.Tensor, int]]:
        labeled_images = []
        image_paths = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            image_paths.extend(Path(images_dir).glob(ext))

        for img_path in image_paths:
            try:
                img = Image.open(img_path).convert('RGB')
                img_tensor = self.train_transform(img)
                labeled_images.append((img_tensor, label))
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
        
        return labeled_images

    def predict(self, image_path: str, checkpoint_path: Optional[str] = None) -> Dict:
        self.initialize_model(checkpoint_path)
        self.model.eval()
        
        try:
            img = Image.open(image_path).convert('RGB')
            img_tensor = self.val_transform(img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.model(img_tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)

            return {
                'label': "normal" if predicted.item() == 0 else "defective",
                'confidence': float(confidence.item()),
                'probabilities': {
                    'normal': float(probs[0][0].item()),
                    'defective': float(probs[0][1].item())
                }
            }
        except Exception as e:
            raise ValueError(f"Prediction failed: {e}")

    def predict_batch(self, image_paths: List[str], checkpoint_path: Optional[str] = None) -> List[Dict]:
        return [self.predict(path, checkpoint_path) for path in image_paths]

    def get_model_checkpoint_path(self, model_id: int) -> str:
        return str(self.model_weights_dir / f"mobilenet_model_{model_id}.pth")

# Global instance with dynamic path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_WEIGHTS_DIR = os.path.join(BASE_DIR, "model_weights")
mobilenet_service = MobileNetService(model_weights_dir=MODEL_WEIGHTS_DIR)
