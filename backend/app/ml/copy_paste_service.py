"""
Copy-Paste Augmentation Service
Intelligent defect synthesis using copy-paste augmentation and Poisson blending
"""
import cv2
import numpy as np
import albumentations as A
from pathlib import Path
from typing import List, Tuple, Optional
import random
import os


class CopyPasteService:
    """Service for copy-paste augmentation of defects"""

    def __init__(self):
        # Augmentation pipeline for defect patches
        self.defect_augment = A.Compose([
            A.RandomRotate90(p=0.7),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.Affine(
                scale=(0.7, 1.3),      # scale_limit=0.3 -> (1-0.3, 1+0.3)
                translate_percent=0.1,  # shift_limit=0.1
                rotate=(-180, 180),     # rotate_limit=180
                p=0.7
            ),
            A.RandomBrightnessContrast(
                brightness_limit=0.2,
                contrast_limit=0.2,
                p=0.5
            ),
            A.GaussianBlur(blur_limit=(3, 5), p=0.2)
        ])

    def extract_defect_library(
        self,
        defect_images_dir: str,
        masks_dir: str,
        output_dir: str
    ) -> int:
        """
        Extract defects from annotated images using masks

        Args:
            defect_images_dir: Directory with defective images
            masks_dir: Directory with corresponding masks
            output_dir: Where to save extracted defect patches

        Returns:
            Number of defects extracted
        """
        os.makedirs(output_dir, exist_ok=True)

        defect_count = 0

        # Find all defect images
        defect_images = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            defect_images.extend(Path(defect_images_dir).glob(ext))

        print(f"Found {len(defect_images)} defective images")

        for img_path in defect_images:
            # Find corresponding mask
            img_stem = img_path.stem
            mask_path = Path(masks_dir) / f"{img_stem}.png"

            if not mask_path.exists():
                print(f"⚠️  No mask found for {img_path.name}, skipping")
                continue

            # Load image and mask
            image = cv2.imread(str(img_path))
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

            if image is None or mask is None:
                print(f"⚠️  Failed to load {img_path.name} or its mask")
                continue

            # Find defect region bounding box
            coords = cv2.findNonZero(mask)
            if coords is None:
                print(f"⚠️  No defect region in mask for {img_path.name}")
                continue

            x, y, w, h = cv2.boundingRect(coords)

            # Add padding around defect (20% on each side)
            pad = int(max(w, h) * 0.2)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(image.shape[1], x + w + pad)
            y2 = min(image.shape[0], y + h + pad)

            # Extract defect patch and mask
            defect_patch = image[y1:y2, x1:x2]
            defect_mask = mask[y1:y2, x1:x2]

            # Save defect patch and its mask
            patch_path = Path(output_dir) / f"defect_{img_stem}.png"
            mask_out_path = Path(output_dir) / f"defect_{img_stem}_mask.png"

            cv2.imwrite(str(patch_path), defect_patch)
            cv2.imwrite(str(mask_out_path), defect_mask)

            defect_count += 1

        print(f"✅ Extracted {defect_count} defect patches to {output_dir}")
        return defect_count

    def generate_synthetic_images(
        self,
        defect_library_dir: str,
        background_images_dir: str,
        output_dir: str,
        num_images: int = 1000
    ) -> List[str]:
        """
        Generate synthetic defective images using copy-paste

        Args:
            defect_library_dir: Directory with extracted defect patches
            background_images_dir: Directory with clean/normal cashew images
            output_dir: Where to save synthetic images
            num_images: Number of synthetic images to generate

        Returns:
            List of paths to generated images
        """
        os.makedirs(output_dir, exist_ok=True)

        # Load defect library
        defect_patches = []
        for patch_file in Path(defect_library_dir).glob("defect_*.png"):
            if "_mask" not in str(patch_file):
                mask_file = Path(str(patch_file).replace(".png", "_mask.png"))
                if mask_file.exists():
                    defect_patches.append((str(patch_file), str(mask_file)))

        if len(defect_patches) == 0:
            raise ValueError(f"No defect patches found in {defect_library_dir}")

        print(f"Loaded {len(defect_patches)} defect patches from library")

        # Load background images
        backgrounds = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            backgrounds.extend(list(Path(background_images_dir).glob(ext)))

        if len(backgrounds) == 0:
            raise ValueError(f"No background images found in {background_images_dir}")

        print(f"Loaded {len(backgrounds)} background images")
        print(f"Generating {num_images} synthetic defective images...")

        generated_paths = []

        for i in range(num_images):
            # Pick random background and defect
            bg_path = random.choice(backgrounds)
            defect_patch_path, defect_mask_path = random.choice(defect_patches)

            # Load images
            background = cv2.imread(str(bg_path))
            defect_patch = cv2.imread(defect_patch_path)
            defect_mask = cv2.imread(defect_mask_path, cv2.IMREAD_GRAYSCALE)

            if background is None or defect_patch is None or defect_mask is None:
                continue

            # Augment the defect patch
            augmented = self.defect_augment(
                image=defect_patch,
                mask=defect_mask
            )
            aug_defect = augmented['image']
            aug_mask = augmented['mask']

            # Ensure mask is binary
            _, aug_mask = cv2.threshold(aug_mask, 127, 255, cv2.THRESH_BINARY)

            # Find a random position on the background
            h_bg, w_bg = background.shape[:2]
            h_d, w_d = aug_defect.shape[:2]

            # Ensure defect fits on background
            if h_d >= h_bg * 0.8 or w_d >= w_bg * 0.8:
                # Defect too large, resize to 30% of background size
                target_size = min(h_bg, w_bg) // 3
                scale = target_size / max(h_d, w_d)
                new_h = int(h_d * scale)
                new_w = int(w_d * scale)
                aug_defect = cv2.resize(aug_defect, (new_w, new_h))
                aug_mask = cv2.resize(aug_mask, (new_w, new_h))
                h_d, w_d = new_h, new_w

            # Calculate safe placement range
            max_x = w_bg - w_d
            max_y = h_bg - h_d

            if max_x < 1 or max_y < 1:
                # Still too large, skip this image
                print(f"⚠️  Defect too large after resize, skipping")
                continue

            # Random position (prefer center region for cashews)
            center_y, center_x = h_bg // 2, w_bg // 2
            offset_x = min(max_x // 2, w_bg // 4)
            offset_y = min(max_y // 2, h_bg // 4)

            x_min = max(0, center_x - offset_x)
            x_max = min(max_x, center_x + offset_x)
            y_min = max(0, center_y - offset_y)
            y_max = min(max_y, center_y + offset_y)

            x = random.randint(x_min, max(x_min, x_max))
            y = random.randint(y_min, max(y_min, y_max))

            # Poisson blending for seamless paste
            try:
                # Create center point for Poisson blending
                center = (x + w_d // 2, y + h_d // 2)

                # Blend the defect onto background
                result = cv2.seamlessClone(
                    aug_defect,
                    background,
                    aug_mask,
                    center,
                    cv2.MIXED_CLONE  # Better for defects (preserves gradients)
                )
            except Exception as e:
                # Fallback to simple paste if Poisson fails
                print(f"⚠️  Poisson blending failed for image {i}, using alpha blending")
                result = background.copy()
                mask_3ch = cv2.cvtColor(aug_mask, cv2.COLOR_GRAY2BGR) / 255.0
                result[y:y+h_d, x:x+w_d] = (
                    result[y:y+h_d, x:x+w_d] * (1 - mask_3ch) +
                    aug_defect * mask_3ch
                ).astype(np.uint8)

            # Save synthetic image
            output_path = Path(output_dir) / f"synthetic_{i:04d}.png"
            cv2.imwrite(str(output_path), result)
            generated_paths.append(str(output_path))

            if (i + 1) % 100 == 0:
                print(f"  Generated {i + 1}/{num_images} images...")

        print(f"✅ Generated {len(generated_paths)} synthetic images")
        return generated_paths


# Global copy-paste service instance
copy_paste_service = CopyPasteService()
