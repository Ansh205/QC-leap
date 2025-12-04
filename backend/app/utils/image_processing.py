"""
Image processing utilities for annotation and mask generation
"""

import os
import json
from typing import List, Tuple
from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path


def generate_mask_from_polygons(
    image_width: int,
    image_height: int,
    polygons: List[dict],
    output_path: str
) -> str:
    """
    Generate a binary segmentation mask from polygon annotations.

    Args:
        image_width: Width of the source image
        image_height: Height of the source image
        polygons: List of polygon dicts with 'points' key containing [(x, y), ...]
        output_path: Path where the mask PNG will be saved

    Returns:
        str: Path to the generated mask file
    """
    # Create a blank binary mask (black background)
    mask = Image.new('L', (image_width, image_height), 0)
    draw = ImageDraw.Draw(mask)

    # Draw each polygon as white (255)
    for polygon in polygons:
        points = polygon.get('points', [])
        if len(points) >= 3:  # Need at least 3 points for a polygon
            # Flatten the points list for PIL
            flat_points = [coord for point in points for coord in point]
            draw.polygon(flat_points, fill=255, outline=255)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save the mask
    mask.save(output_path, 'PNG')

    return output_path


def parse_annotation_csv(csv_content: str) -> List[dict]:
    """
    Parse annotation CSV content into structured data.

    CSV Format:
        image_path,defect_labels,mask_path
        defective/005.JPG,"burnt,spot",masks/005.png

    Args:
        csv_content: String content of the CSV file

    Returns:
        List of dicts with keys: image_path, defect_labels, mask_path
    """
    import csv
    from io import StringIO

    annotations = []
    reader = csv.reader(StringIO(csv_content))

    for row in reader:
        if len(row) >= 2:  # Must have at least image_path and defect_labels
            annotation = {
                'image_path': row[0].strip(),
                'defect_labels': row[1].strip(),
                'mask_path': row[2].strip() if len(row) > 2 else None
            }

            # Skip normal images (we only annotate defective ones)
            if annotation['defect_labels'].lower() != 'normal':
                annotations.append(annotation)

    return annotations


def validate_image_file(file_path: str) -> bool:
    """
    Validate if a file is a valid image.

    Args:
        file_path: Path to the image file

    Returns:
        bool: True if valid image, False otherwise
    """
    try:
        with Image.open(file_path) as img:
            img.verify()
        return True
    except Exception:
        return False


def get_image_dimensions(file_path: str) -> Tuple[int, int]:
    """
    Get image width and height.

    Args:
        file_path: Path to the image file

    Returns:
        Tuple of (width, height)
    """
    with Image.open(file_path) as img:
        return img.size


def organize_uploaded_files(
    files: List[str],
    base_upload_dir: str,
    user_id: int,
    model_id: int
) -> dict:
    """
    Organize uploaded files into the proper directory structure.

    Structure:
        uploads/{user_id}/{model_id}/
            ├── raw_images/
            │   ├── normal/
            │   └── defective/
            ├── masks/
            └── synthetic_images/

    Args:
        files: List of file paths to organize
        base_upload_dir: Base upload directory
        user_id: User ID
        model_id: Model ID

    Returns:
        dict: Mapping of file types to organized paths
    """
    # Create directory structure
    model_dir = Path(base_upload_dir) / str(user_id) / str(model_id)

    dirs = {
        'normal': model_dir / 'raw_images' / 'normal',
        'defective': model_dir / 'raw_images' / 'defective',
        'masks': model_dir / 'masks',
        'synthetic': model_dir / 'synthetic_images'
    }

    # Create all directories
    for dir_path in dirs.values():
        dir_path.mkdir(parents=True, exist_ok=True)

    return {
        'model_dir': str(model_dir),
        'normal_dir': str(dirs['normal']),
        'defective_dir': str(dirs['defective']),
        'masks_dir': str(dirs['masks']),
        'synthetic_dir': str(dirs['synthetic'])
    }
