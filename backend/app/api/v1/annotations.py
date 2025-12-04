"""
Annotation management endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.models.image import Image
from app.models.inspection_model import InspectionModel
from app.schemas.annotation import (
    AnnotationResponse,
    AnnotationCreate,
    AnnotationUpdate,
    ManualAnnotationCreate
)
from app.services.annotation_service import annotation_service

router = APIRouter()

UPLOAD_DIR = "uploads"


@router.post("/manual", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
def create_manual_annotation(
    annotation_in: ManualAnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create annotation from manual canvas drawing.
    Automatically generates segmentation mask from canvas polygons.
    """
    # Check if image exists and user has access
    image = db.query(Image).filter(Image.id == annotation_in.image_id).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Check ownership via model
    model = image.inspection_model
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to annotate this image"
        )

    annotation = annotation_service.create_manual_annotation(
        db=db,
        annotation_in=annotation_in,
        user_id=current_user.id,
        upload_dir=UPLOAD_DIR
    )

    return annotation


@router.post("/upload-csv/{model_id}", response_model=List[AnnotationResponse])
async def upload_annotation_csv(
    model_id: int,
    file: UploadFile = File(...),
    masks_zip: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload annotation CSV file and optionally mask files.

    CSV Format:
        image_path,defect_labels,mask_path
        defective/005.JPG,"burnt,spot",masks/005.png

    If masks_zip is provided, it should be a ZIP file containing mask PNG files.
    Mask filenames should match the image stems (e.g., 005.png for 005.JPG).
    """
    import os
    import shutil
    import zipfile
    import tempfile
    from app.utils.image_processing import validate_image_file

    # Check if model exists and belongs to user
    model = db.query(InspectionModel).filter(
        InspectionModel.id == model_id,
        InspectionModel.owner_id == current_user.id
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Process mask ZIP if provided
    masks_uploaded = 0
    if masks_zip and masks_zip.filename:
        # Create masks directory
        masks_dir = os.path.join(UPLOAD_DIR, str(current_user.id), str(model_id), 'masks')
        os.makedirs(masks_dir, exist_ok=True)

        # Extract and save masks
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded zip
            zip_path = os.path.join(temp_dir, masks_zip.filename)
            with open(zip_path, "wb") as buffer:
                shutil.copyfileobj(masks_zip.file, buffer)

            # Extract zip
            try:
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
            except zipfile.BadZipFile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid mask ZIP file"
                )

            # Process extracted mask files
            for root, dirs_in_zip, files_in_zip in os.walk(temp_dir):
                for filename in files_in_zip:
                    # Skip hidden files and non-PNG files
                    if filename.startswith('.') or not filename.lower().endswith('.png'):
                        continue

                    temp_file_path = os.path.join(root, filename)

                    # Validate image
                    if not validate_image_file(temp_file_path):
                        continue

                    # Copy to masks directory with just the filename
                    base_name = os.path.basename(filename)
                    file_path = os.path.join(masks_dir, base_name)

                    shutil.copy2(temp_file_path, file_path)
                    masks_uploaded += 1

        print(f"✅ Uploaded {masks_uploaded} mask files to {masks_dir}")

    # Read CSV content
    csv_content = await file.read()
    csv_text = csv_content.decode('utf-8')

    # Process annotations
    annotations = annotation_service.upload_csv_annotations(
        db=db,
        model_id=model_id,
        csv_content=csv_text,
        user_id=current_user.id
    )

    return annotations


@router.get("/image/{image_id}", response_model=AnnotationResponse)
def get_image_annotation(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get annotation for a specific image"""
    # Check if image exists and user has access
    image = db.query(Image).filter(Image.id == image_id).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Check ownership
    model = image.inspection_model
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this annotation"
        )

    annotation = annotation_service.get_by_image_id(db=db, image_id=image_id)

    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found for this image"
        )

    return annotation


@router.put("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_update: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an annotation"""
    annotation = annotation_service.update(
        db=db,
        annotation_id=annotation_id,
        annotation_update=annotation_update
    )

    return annotation


@router.delete("/{annotation_id}")
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an annotation"""
    annotation_service.delete(db=db, annotation_id=annotation_id)

    return {"message": "Annotation deleted successfully"}


@router.get("/model/{model_id}", response_model=List[AnnotationResponse])
def list_model_annotations(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all annotations for a model"""
    # Check if model exists and belongs to user
    model = db.query(InspectionModel).filter(
        InspectionModel.id == model_id,
        InspectionModel.owner_id == current_user.id
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Get all images for this model with annotations
    from app.models.annotation import Annotation

    annotations = db.query(Annotation).join(Image).filter(
        Image.inspection_model_id == model_id
    ).all()

    return annotations
