"""
Sanity Check for Training Data Quality
Ensures normal and defective images are from the same distribution
"""
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
from pathlib import Path
from typing import List, Tuple


class DataSanityChecker:
    """Check if normal and defective images are from the same object class"""

    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # Use pretrained MobileNetV3 for feature extraction
        self.model = models.mobilenet_v3_small(weights='DEFAULT')
        # Remove classifier to get features
        self.model.classifier = nn.Identity()
        self.model = self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def extract_features(self, image_dir: str, max_images: int = 20) -> np.ndarray:
        """
        Extract feature vectors from images using pretrained model

        Args:
            image_dir: Directory with images
            max_images: Maximum number of images to sample

        Returns:
            numpy array of shape (N, feature_dim)
        """
        image_paths = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            image_paths.extend(Path(image_dir).glob(ext))

        # Sample random images if too many
        if len(image_paths) > max_images:
            import random
            image_paths = random.sample(image_paths, max_images)

        features = []
        with torch.no_grad():
            for img_path in image_paths:
                try:
                    img = Image.open(img_path).convert('RGB')
                    img_tensor = self.transform(img).unsqueeze(0).to(self.device)

                    # Extract features
                    feat = self.model(img_tensor)
                    features.append(feat.cpu().numpy().flatten())
                except Exception as e:
                    print(f"Warning: Failed to process {img_path.name}: {e}")
                    continue

        if len(features) == 0:
            raise ValueError(f"No valid images found in {image_dir}")

        return np.array(features)

    def check_similarity(
        self,
        normal_dir: str,
        defective_dir: str,
        threshold: float = 0.5
    ) -> Tuple[bool, str, float]:
        """
        Check if normal and defective images are from the same distribution

        Args:
            normal_dir: Directory with normal images
            defective_dir: Directory with defective images
            threshold: Similarity threshold (cosine similarity, 0-1)

        Returns:
            (is_valid, message, similarity_score)
        """
        print("🔍 Running sanity check on training data...")

        # Extract features from both sets
        normal_features = self.extract_features(normal_dir)
        defective_features = self.extract_features(defective_dir)

        # Compute mean feature vectors
        normal_mean = np.mean(normal_features, axis=0)
        defective_mean = np.mean(defective_features, axis=0)

        # Compute cosine similarity
        cosine_sim = np.dot(normal_mean, defective_mean) / (
            np.linalg.norm(normal_mean) * np.linalg.norm(defective_mean)
        )

        print(f"   Normal images: {len(normal_features)} samples")
        print(f"   Defective images: {len(defective_features)} samples")
        print(f"   Feature similarity: {cosine_sim:.4f}")

        if cosine_sim < threshold:
            message = (
                f"❌ SANITY CHECK FAILED!\n\n"
                f"   Normal and defective images appear to be from DIFFERENT object classes.\n"
                f"   Similarity score: {cosine_sim:.4f} (threshold: {threshold:.4f})\n\n"
                f"   Example problems:\n"
                f"   - Normal = cashews, Defective = fryums\n"
                f"   - Normal = product A, Defective = product B\n"
                f"   - Images from completely different domains\n\n"
                f"   Please verify you uploaded the correct images!\n"
                f"   Both normal and defective images should be of the SAME object type."
            )
            return False, message, cosine_sim
        else:
            message = f"✅ Sanity check passed! Images appear to be from the same class (similarity: {cosine_sim:.4f})"
            return True, message, cosine_sim


# Global instance
sanity_checker = DataSanityChecker()
