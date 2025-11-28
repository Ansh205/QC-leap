"""
Service for managing annotations
"""

import os
import json
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.annotation import Annotation, AnnotationType
from app.models.image import Image
from app.schemas.annotation import (
    AnnotationCreate,
    AnnotationUpdate,
    ManualAnnotationCreate,
    AnnotationCSVRow
)
from app.utils.image_processing import (
    generate_mask_from_polygons,
    parse_annotation_csv
)


class AnnotationService:
    """Service for annotation CRUD operations"""

    def create(
        self,
        db: Session,
        annotation_in: AnnotationCreate,
        user_id: int
    ) -> Annotation:
        """Create a new annotation"""
        # Check if image exists
        image = db.query(Image).filter(Image.id == annotation_in.image_id).first()
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )

        # Check if annotation already exists for this image
        existing = db.query(Annotation).filter(
            Annotation.image_id == annotation_in.image_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Annotation already exists for this image"
            )

        # Create annotation
        annotation = Annotation(
            image_id=annotation_in.image_id,
            defect_labels=annotation_in.defect_labels,
            mask_path=annotation_in.mask_path,
            annotation_type=annotation_in.annotation_type,
            canvas_data=annotation_in.canvas_data,
            notes=annotation_in.notes,
            created_by_user_id=user_id
        )

        db.add(annotation)
        db.commit()
        db.refresh(annotation)
        return annotation

    def create_manual_annotation(
        self,
        db: Session,
        annotation_in: ManualAnnotationCreate,
        user_id: int,
        upload_dir: str
    ) -> Annotation:
        """
        Create annotation from manual canvas drawing.
        Generates segmentation mask from canvas data.
        """
        # Check if image exists
        image = db.query(Image).filter(Image.id == annotation_in.image_id).first()
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )

        # Get image dimensions
        from app.utils.image_processing import get_image_dimensions
        try:
            width, height = get_image_dimensions(image.file_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read image dimensions: {str(e)}"
            )

        # Generate mask from canvas polygons
        canvas_data = annotation_in.canvas_data
        mask_filename = f"{os.path.splitext(image.filename)[0]}_mask.png"

        # Determine mask save path
        model_id = image.inspection_model_id
        model = image.inspection_model
        user_id_str = str(model.owner_id)

        mask_dir = os.path.join(upload_dir, user_id_str, str(model_id), 'masks')
        os.makedirs(mask_dir, exist_ok=True)

        mask_path = os.path.join(mask_dir, mask_filename)

        # Convert canvas data to format expected by generate_mask_from_polygons
        polygons_data = [
            {'points': [(p[0], p[1]) for p in polygon.points], 'label': polygon.label}
            for polygon in canvas_data.polygons
        ]

        try:
            generate_mask_from_polygons(
                image_width=canvas_data.image_width,
                image_height=canvas_data.image_height,
                polygons=polygons_data,
                output_path=mask_path
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate mask: {str(e)}"
            )

        # Create annotation record
        annotation = Annotation(
            image_id=annotation_in.image_id,
            defect_labels=annotation_in.defect_labels,
            mask_path=mask_path,
            annotation_type=AnnotationType.MANUAL,
            canvas_data=canvas_data.model_dump_json(),
            notes=annotation_in.notes,
            created_by_user_id=user_id
        )

        db.add(annotation)
        db.commit()
        db.refresh(annotation)
        return annotation

    def get_by_image_id(self, db: Session, image_id: int) -> Optional[Annotation]:
        """Get annotation for an image"""
        return db.query(Annotation).filter(Annotation.image_id == image_id).first()

    def update(
        self,
        db: Session,
        annotation_id: int,
        annotation_update: AnnotationUpdate
    ) -> Annotation:
        """Update an annotation"""
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Annotation not found"
            )

        # Update fields
        update_data = annotation_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(annotation, field, value)

        db.commit()
        db.refresh(annotation)
        return annotation

    def delete(self, db: Session, annotation_id: int) -> bool:
        """Delete an annotation"""
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Annotation not found"
            )

        db.delete(annotation)
        db.commit()
        return True

    def upload_csv_annotations(
        self,
        db: Session,
        model_id: int,
        csv_content: str,
        user_id: int
    ) -> List[Annotation]:
        """
        Parse and upload annotations from CSV file.

        CSV Format: image_path,defect_labels,mask_path
        """
        # Parse CSV
        annotation_rows = parse_annotation_csv(csv_content)

        created_annotations = []

        for row in annotation_rows:
            # Find matching image by filename
            filename = os.path.basename(row['image_path'])
            image = db.query(Image).filter(
                Image.inspection_model_id == model_id,
                Image.filename == filename
            ).first()

            if not image:
                # Skip if image not found
                continue

            # Check if annotation already exists
            existing = self.get_by_image_id(db, image.id)
            if existing:
                continue

            # Create annotation
            annotation = Annotation(
                image_id=image.id,
                defect_labels=row['defect_labels'],
                mask_path=row['mask_path'],
                annotation_type=AnnotationType.UPLOADED,
                created_by_user_id=user_id
            )

            db.add(annotation)
            created_annotations.append(annotation)

        db.commit()
        return created_annotations


annotation_service = AnnotationService()
