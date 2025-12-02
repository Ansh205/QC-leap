"""
Image upload and management endpoints
"""

import os
import shutil
import zipfile
import tempfile
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_current_active_user_optional
from app.database import get_db
from app.models.user import User
from app.models.image import Image, ImageType
from app.models.inspection_model import InspectionModel, ModelStatus
from app.models.inference_result import InferenceResult
from app.schemas.image import ImageResponse
from app.utils.image_processing import validate_image_file, organize_uploaded_files
from app.services.inspection_model_service import inspection_model_service

router = APIRouter()

# Upload directory configuration
import os
UPLOAD_DIR = os.path.abspath("uploads")


@router.post("/{model_id}/upload", response_model=List[ImageResponse])
async def upload_images(
    model_id: int,
    image_type: str = Form(..., description="Type: 'normal' or 'defective'"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload images to an inspection model.

    Args:
        model_id: ID of the inspection model
        image_type: Type of images ('normal' or 'defective')
        files: List of image files to upload
    """
    # Validate image type
    if image_type not in ['normal', 'defective']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_type must be 'normal' or 'defective'"
        )

    # Check if model exists and user has access
    model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check if user can access this model (only owner can upload)
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the model owner can upload images"
        )

    # Organize file structure
    dirs = organize_uploaded_files(
        files=[],
        base_upload_dir=UPLOAD_DIR,
        user_id=current_user.id,
        model_id=model_id
    )

    # Determine target directory
    target_dir = dirs['normal_dir'] if image_type == 'normal' else dirs['defective_dir']

    uploaded_images = []

    for file in files:
        # Validate file extension
        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue

        # Extract just the filename (remove any directory path from upload)
        filename = os.path.basename(file.filename)

        # Save file
        file_path = os.path.join(target_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Validate image
        if not validate_image_file(file_path):
            os.remove(file_path)
            continue

        # Determine image type enum
        db_image_type = ImageType.REAL_NORMAL if image_type == 'normal' else ImageType.REAL_DEFECTIVE

        # Create image record
        image = Image(
            filename=filename,
            file_path=file_path,
            image_type=db_image_type,
            inspection_model_id=model_id,
            is_synthetic=False
        )

        db.add(image)
        uploaded_images.append(image)

    db.commit()

    # Set model thumbnail to first uploaded image if not already set
    if uploaded_images and not model.thumbnail_url:
        first_image = uploaded_images[0]
        model.thumbnail_url = f"/api/v1/images/{first_image.id}/file"
    
    # Update model status to CREATED to indicate data has changed
    model.status = ModelStatus.CREATED
    db.commit()

    return uploaded_images


@router.post("/{model_id}/upload-zip", response_model=List[ImageResponse])
async def upload_images_from_zip(
    model_id: int,
    image_type: str = Form(..., description="Type: 'normal' or 'defective'"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload images from a ZIP file to an inspection model.

    Args:
        model_id: ID of the inspection model
        image_type: Type of images ('normal' or 'defective')
        file: ZIP file containing images
    """
    # Validate image type
    if image_type not in ['normal', 'defective']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_type must be 'normal' or 'defective'"
        )

    # Check if file is a zip
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a ZIP archive"
        )

    # Check if model exists and user has access
    model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check if user can access this model (only owner can upload)
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the model owner can upload images"
        )

    # Organize file structure
    dirs = organize_uploaded_files(
        files=[],
        base_upload_dir=UPLOAD_DIR,
        user_id=current_user.id,
        model_id=model_id
    )

    # Determine target directory
    target_dir = dirs['normal_dir'] if image_type == 'normal' else dirs['defective_dir']

    uploaded_images = []

    # Create temporary directory for extraction
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save uploaded zip
        zip_path = os.path.join(temp_dir, file.filename)
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract zip
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ZIP file"
            )

        # Process extracted files
        for root, dirs_in_zip, files_in_zip in os.walk(temp_dir):
            for filename in files_in_zip:
                # Skip the zip file itself and hidden files
                if filename == file.filename or filename.startswith('.'):
                    continue

                # Check if it's an image file
                if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue

                temp_file_path = os.path.join(root, filename)

                # Validate image
                if not validate_image_file(temp_file_path):
                    continue

                # Copy to target directory with unique name if needed
                base_name = filename
                file_path = os.path.join(target_dir, base_name)
                counter = 1
                while os.path.exists(file_path):
                    name, ext = os.path.splitext(filename)
                    base_name = f"{name}_{counter}{ext}"
                    file_path = os.path.join(target_dir, base_name)
                    counter += 1

                shutil.copy2(temp_file_path, file_path)

                # Determine image type enum
                db_image_type = ImageType.REAL_NORMAL if image_type == 'normal' else ImageType.REAL_DEFECTIVE

                # Create image record
                image = Image(
                    filename=base_name,
                    file_path=file_path,
                    image_type=db_image_type,
                    inspection_model_id=model_id,
                    is_synthetic=False
                )

                db.add(image)
                uploaded_images.append(image)

    # Update model status to CREATED to indicate data has changed
    model.status = ModelStatus.CREATED
    db.commit()

    return uploaded_images


@router.get("/{model_id}/images", response_model=List[ImageResponse])
def list_model_images(
    model_id: int,
    image_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all images for a model.

    Args:
        model_id: ID of the inspection model
        image_type: Optional filter by type (normal/defective/synthetic)
    """
    # Check if model exists and user can access
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this model"
        )

    model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Build query
    query = db.query(Image).filter(Image.inspection_model_id == model_id)

    # Apply filter if provided
    if image_type:
        if image_type == 'normal':
            query = query.filter(Image.image_type == ImageType.REAL_NORMAL)
        elif image_type == 'defective':
            query = query.filter(Image.image_type == ImageType.REAL_DEFECTIVE)
        elif image_type == 'synthetic':
            query = query.filter(Image.image_type == ImageType.SYNTHETIC)

    images = query.all()
    return images


@router.get("/{image_id}/file")
def serve_image(
    image_id: int,
    token: str = None,  # Optional token for img tag usage
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user_optional)
):
    """Serve image file - supports both header auth and query param token"""
    from jose import jwt, JWTError
    from app.core.config import settings

    # If no user from header, try token from query param
    if not current_user and token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
        except JWTError:
            pass

    # Require authentication
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access images"
        )

    # Get image
    image = db.query(Image).filter(Image.id == image_id).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Check access via model
    if not inspection_model_service.can_access(db=db, model_id=image.inspection_model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this image"
        )

    # Check if file exists
    if not os.path.exists(image.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found on server"
        )

    # Determine media type from file extension
    import mimetypes
    media_type, _ = mimetypes.guess_type(image.file_path)
    if not media_type:
        # Default to jpeg if can't determine
        media_type = "image/jpeg"

    # Serve the file
    return FileResponse(
        image.file_path,
        media_type=media_type,
        filename=image.filename
    )


@router.post("/{model_id}/upload-masks")
async def upload_mask_files(
    model_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload mask PNG files for defective images.
    These masks are used by the copy-paste augmentation system.

    Args:
        model_id: ID of the inspection model
        files: List of mask PNG files (must match filenames in annotation CSV)
    """
    # Check if model exists and user has access
    model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check if user can access this model (only owner can upload)
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the model owner can upload masks"
        )

    # Create masks directory
    masks_dir = os.path.join(UPLOAD_DIR, str(current_user.id), str(model_id), 'masks')
    os.makedirs(masks_dir, exist_ok=True)

    uploaded_masks = []

    for file in files:
        # Validate file extension - only PNG masks
        if not file.filename.lower().endswith('.png'):
            continue

        # Extract just the filename (remove any directory path from upload)
        filename = os.path.basename(file.filename)

        # Save file
        file_path = os.path.join(masks_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Validate it's a valid image
        if not validate_image_file(file_path):
            os.remove(file_path)
            continue

        uploaded_masks.append({
            'filename': filename,
            'path': file_path
        })

    return {
        'message': f'Uploaded {len(uploaded_masks)} mask files',
        'masks': uploaded_masks,
        'masks_directory': masks_dir
    }


@router.post("/{model_id}/upload-masks-zip")
async def upload_masks_from_zip(
    model_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload mask files from a ZIP archive.
    Useful when you have many mask files to upload at once.

    Args:
        model_id: ID of the inspection model
        file: ZIP file containing mask PNG files
    """
    # Check if file is a zip
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a ZIP archive"
        )

    # Check if model exists and user has access
    model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check if user can access this model (only owner can upload)
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the model owner can upload masks"
        )

    # Create masks directory
    masks_dir = os.path.join(UPLOAD_DIR, str(current_user.id), str(model_id), 'masks')
    os.makedirs(masks_dir, exist_ok=True)

    uploaded_masks = []

    # Create temporary directory for extraction
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save uploaded zip
        zip_path = os.path.join(temp_dir, file.filename)
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract zip
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ZIP file"
            )

        # Process extracted files
        for root, dirs_in_zip, files_in_zip in os.walk(temp_dir):
            for filename in files_in_zip:
                # Skip hidden files and non-PNG files
                if filename.startswith('.') or not filename.lower().endswith('.png'):
                    continue

                temp_file_path = os.path.join(root, filename)

                # Validate image
                if not validate_image_file(temp_file_path):
                    continue

                # Copy to masks directory with just the filename (no subdirs)
                base_name = filename
                file_path = os.path.join(masks_dir, base_name)
                counter = 1
                while os.path.exists(file_path):
                    name, ext = os.path.splitext(filename)
                    base_name = f"{name}_{counter}{ext}"
                    file_path = os.path.join(masks_dir, base_name)
                    counter += 1

                shutil.copy2(temp_file_path, file_path)

                uploaded_masks.append({
                    'filename': base_name,
                    'path': file_path
                })

    return {
        'message': f'Uploaded {len(uploaded_masks)} mask files from ZIP',
        'masks': uploaded_masks,
        'masks_directory': masks_dir
    }


@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an image"""
    # Get image
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
            detail="Not authorized to delete this image"
        )

    # Delete file from filesystem
    if os.path.exists(image.file_path):
        os.remove(image.file_path)

    # Delete associated inference results
    db.query(InferenceResult).filter(InferenceResult.image_id == image.id).delete()

    # Delete from database
    db.delete(image)
    
    # Update model status to CREATED to indicate data has changed
    model.status = ModelStatus.CREATED
    db.commit()

    return {"message": "Image deleted successfully"}
