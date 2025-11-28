"""
Copy-Paste Augmentation Service - Fail-Safe Edition
"""
import cv2
import numpy as np
import albumentations as A
from pathlib import Path
from typing import List
import random
import os

class CopyPasteService:
    def __init__(self):
        # Augmentation pipeline
        self.defect_augment = A.Compose([
            A.RandomRotate90(p=0.5),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.2),
        ])

    def extract_defect_library(self, defect_images_dir: str, masks_dir: str, output_dir: str) -> int:
        """Extract defects using masks"""
        os.makedirs(output_dir, exist_ok=True)
        defect_count = 0
        
        defect_images = []
        # Find all images (case insensitive extensions)
        for ext in ['*.jpg', '*.png', '*.jpeg', '*.JPG', '*.PNG', '*.JPEG']:
            defect_images.extend(Path(defect_images_dir).glob(ext))

        print(f"  - Found {len(defect_images)} defective images to process")

        for img_path in defect_images:
            # Try to find matching mask (exact name or with _mask suffix)
            possible_names = [img_path.name, img_path.stem + ".png", img_path.stem + "_mask.png"]
            mask_path = next((Path(masks_dir) / m for m in possible_names if (Path(masks_dir) / m).exists()), None)

            if not mask_path:
                print(f"  -Missing mask for {img_path.name}")
                continue

            # Read images
            image = cv2.imread(str(img_path))
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

            if image is None or mask is None: continue

            # Find defect bounding box
            coords = cv2.findNonZero(mask)
            if coords is None: continue
            
            x, y, w, h = cv2.boundingRect(coords)
            
            # Crop
            defect = image[y:y+h, x:x+w]
            defect_mask = mask[y:y+h, x:x+w]

            if defect.size == 0: continue

            # Save extraction
            cv2.imwrite(str(Path(output_dir) / f"defect_{defect_count}.png"), defect)
            cv2.imwrite(str(Path(output_dir) / f"defect_{defect_count}_mask.png"), defect_mask)
            defect_count += 1

        print(f"  - Extracted {defect_count} unique defects")
        return defect_count

    def generate_synthetic_images(self, defect_dir: str, bg_dir: str, out_dir: str, num_images: int = 100) -> List[str]:
        """Generate synthetic images"""
        os.makedirs(out_dir, exist_ok=True)
        
        # Load all defect patches
        defects = list(Path(defect_dir).glob("defect_*.png"))
        defects = [d for d in defects if "_mask" not in d.name]
        
        # Load all background images
        backgrounds = []
        for ext in ['*.jpg', '*.png', '*.jpeg', '*.JPG', '*.PNG', '*.JPEG']:
            backgrounds.extend(Path(bg_dir).glob(ext))

        if not defects:
            print("  - No defects found in library!")
            return []
        if not backgrounds:
            print("  - No background images found!")
            return []

        print(f"  - Generating {num_images} images using {len(defects)} defects and {len(backgrounds)} backgrounds...")
        
        generated = []
        count = 0
        
        while count < num_images:
            try:
                # 1. Load Random Components
                bg_path = random.choice(backgrounds)
                defect_path = random.choice(defects)
                mask_path = str(defect_path).replace(".png", "_mask.png")

                bg = cv2.imread(str(bg_path))
                fg = cv2.imread(str(defect_path))
                mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

                if bg is None or fg is None or mask is None: continue

                # 2. Augment Defect
                aug = self.defect_augment(image=fg, mask=mask)
                fg, mask = aug['image'], aug['mask']

                # 3. Smart Resize (Ensure defect fits inside background)
                h_bg, w_bg = bg.shape[:2]
                h_fg, w_fg = fg.shape[:2]

                # Max defect size is 40% of background
                max_scale = 0.4
                if h_fg > h_bg * max_scale or w_fg > w_bg * max_scale:
                    scale = min((h_bg * max_scale) / h_fg, (w_bg * max_scale) / w_fg)
                    fg = cv2.resize(fg, (0,0), fx=scale, fy=scale)
                    mask = cv2.resize(mask, (0,0), fx=scale, fy=scale)
                    h_fg, w_fg = fg.shape[:2]

                # 4. Random Position
                if w_bg - w_fg <= 0 or h_bg - h_fg <= 0: continue # Skip if still too big
                x = random.randint(0, w_bg - w_fg)
                y = random.randint(0, h_bg - h_fg)
                
                # 5. Fail-Safe Blending (Direct Overlay)
                # Create Region of Interest (ROI)
                roi = bg[y:y+h_fg, x:x+w_fg]
                
                # Ensure mask is binary and 3 channels
                _, mask_bin = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
                mask_inv = cv2.bitwise_not(mask_bin)
                
                # Black-out the area of the defect in the ROI
                img_bg = cv2.bitwise_and(roi, roi, mask=mask_inv)
                
                # Take only the region of the defect from the defect image
                img_fg = cv2.bitwise_and(fg, fg, mask=mask_bin)
                
                # Combine
                dst = cv2.add(img_bg, img_fg)
                
                # 6. Smooth Edges (Optional: Gaussian Blur on ROI)
                # dst = cv2.GaussianBlur(dst, (3, 3), 0)

                # Place back into main image
                bg[y:y+h_fg, x:x+w_fg] = dst

                # 7. Validation Check
                if np.mean(bg) < 5: # If image is Pitch Black
                    print("    - Skipped black image generation")
                    continue

                # Save
                out_path = Path(out_dir) / f"syn_{count}.jpg"
                cv2.imwrite(str(out_path), bg)
                generated.append(str(out_path))
                count += 1
                
                if count % 50 == 0:
                    print(f"    - Generated {count}/{num_images}")

            except Exception as e:
                # print(f"    - Error: {e}")
                continue

        return generated

copy_paste_service = CopyPasteService()