"""
Normal Image Balancer
Automatically balances the normal class to match defective class size
Prevents massive class imbalance when generating many synthetic defective images
"""
import cv2
import numpy as np
import albumentations as A
from pathlib import Path
from typing import List
import random
import os


class NormalImageBalancer:
    """Balance normal images to match defective class size using augmentation"""

    def __init__(self):
        # Heavy augmentation pipeline for normal images
        # This creates diverse variations to balance the dataset
        self.augment = A.Compose([
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.3),
            A.RandomRotate90(p=0.5),
            A.Affine(
                scale=(0.9, 1.1),
                translate_percent=0.05,
                rotate=(-15, 15),
                p=0.7
            ),
            A.RandomBrightnessContrast(
                brightness_limit=0.2,
                contrast_limit=0.2,
                p=0.6
            ),
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
            A.GaussianBlur(blur_limit=(3, 5), p=0.2),
            A.ColorJitter(
                brightness=0.2,
                contrast=0.2,
                saturation=0.2,
                hue=0.1,
                p=0.5
            ),
        ])

    def balance_normal_images(
        self,
        normal_images_dir: str,
        target_count: int,
        output_dir: str
    ) -> int:
        """
        Balance normal images by augmenting to match target count

        Args:
            normal_images_dir: Directory with real normal images
            target_count: Target number of normal images (should match defective count)
            output_dir: Where to save augmented normal images

        Returns:
            Total number of normal images after balancing
        """
        os.makedirs(output_dir, exist_ok=True)

        # Find all real normal images
        normal_images = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            normal_images.extend(Path(normal_images_dir).glob(ext))

        num_real_normal = len(normal_images)

        if num_real_normal == 0:
            raise ValueError(f"No normal images found in {normal_images_dir}")

        print(f"\n{'='*60}")
        print(f"AUTOMATIC CLASS BALANCING")
        print(f"{'='*60}")
        print(f"Real Normal Images: {num_real_normal}")
        print(f"Target Normal Images: {target_count}")

        # Calculate how many augmented images we need
        if num_real_normal >= target_count:
            print(f"✅ Normal class already balanced (no augmentation needed)")
            return num_real_normal

        num_to_generate = target_count - num_real_normal
        print(f"Generating {num_to_generate} augmented normal images...")

        generated_count = 0

        # Generate augmented images by oversampling real images
        while generated_count < num_to_generate:
            # Randomly select a source image
            source_img_path = random.choice(normal_images)

            # Load image
            image = cv2.imread(str(source_img_path))
            if image is None:
                continue

            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Apply augmentation
            augmented = self.augment(image=image)
            aug_image = augmented['image']

            # Convert back to BGR for saving
            aug_image = cv2.cvtColor(aug_image, cv2.COLOR_RGB2BGR)

            # Save with unique name
            output_path = Path(output_dir) / f"aug_normal_{generated_count:05d}.jpg"
            cv2.imwrite(str(output_path), aug_image)

            generated_count += 1

            # Progress indicator every 100 images
            if generated_count % 100 == 0:
                print(f"  Generated {generated_count}/{num_to_generate} images...")

        print(f"✅ Generated {generated_count} augmented normal images")
        print(f"{'='*60}\n")

        return num_real_normal + generated_count


# Global instance
normal_balancer = NormalImageBalancer()
