from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os
import shutil
from pathlib import Path
from app.models.inspection_model import InspectionModel, ModelStatus
from app.models.user import User
from app.models.image import Image
from app.schemas.inspection_model import InspectionModelCreate, InspectionModelUpdate


class InspectionModelService:
    @staticmethod
    def get_by_id(db: Session, model_id: int) -> Optional[InspectionModel]:
        """Get inspection model by ID"""
        return db.query(InspectionModel).filter(InspectionModel.id == model_id).first()

    @staticmethod
    def get_by_owner(db: Session, owner_id: int, skip: int = 0, limit: int = 100) -> List[InspectionModel]:
        """Get all inspection models for a user"""
        return (
            db.query(InspectionModel)
            .filter(InspectionModel.owner_id == owner_id)
            .order_by(InspectionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_accessible_models(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[InspectionModel]:
        """Get all models accessible to a user (public + owned + company models)"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []

        query = db.query(InspectionModel)

        # Build access filter: public models OR owned by user OR same company
        filters = [InspectionModel.is_public == True, InspectionModel.owner_id == user_id]

        if user.company_id:
            filters.append(InspectionModel.company_id == user.company_id)

        query = query.filter(or_(*filters))

        return (
            query
            .order_by(InspectionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def can_access(db: Session, model_id: int, user_id: int) -> bool:
        """Check if user can access a model"""
        model = InspectionModelService.get_by_id(db, model_id)
        if not model:
            return False

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        # User can access if:
        # 1. Model is public
        # 2. User is the owner
        # 3. User is in the same company as the model
        if model.is_public:
            return True
        if model.owner_id == user_id:
            return True
        if user.company_id and model.company_id == user.company_id:
            return True

        return False

    @staticmethod
    def create(db: Session, model_in: InspectionModelCreate, owner_id: int) -> InspectionModel:
        """Create new inspection model"""
        # Get user to set company_id
        user = db.query(User).filter(User.id == owner_id).first()

        db_model = InspectionModel(
            name=model_in.name,
            description=model_in.description,
            num_synthetic_images=model_in.num_synthetic_images,
            enable_human_validation=model_in.enable_human_validation,
            is_public=model_in.is_public,
            owner_id=owner_id,
            company_id=user.company_id if user else None,
            status=ModelStatus.CREATED,
        )
        db.add(db_model)
        db.commit()
        db.refresh(db_model)
        return db_model

    @staticmethod
    def update(
        db: Session,
        model_id: int,
        model_update: InspectionModelUpdate
    ) -> Optional[InspectionModel]:
        """Update inspection model"""
        db_model = InspectionModelService.get_by_id(db, model_id)
        if not db_model:
            return None

        update_data = model_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_model, field, value)

        db.commit()
        db.refresh(db_model)
        return db_model

    @staticmethod
    def update_status(db: Session, model_id: int, status: ModelStatus) -> Optional[InspectionModel]:
        """Update inspection model status"""
        db_model = InspectionModelService.get_by_id(db, model_id)
        if not db_model:
            return None

        db_model.status = status
        db.commit()
        db.refresh(db_model)
        return db_model

    @staticmethod
    def delete(db: Session, model_id: int) -> bool:
        """Delete inspection model and all related files"""
        db_model = InspectionModelService.get_by_id(db, model_id)
        if not db_model:
            return False

        # 1. Delete all image files from filesystem
        images = db.query(Image).filter(Image.inspection_model_id == model_id).all()
        for image in images:
            if image.file_path and os.path.exists(image.file_path):
                try:
                    os.remove(image.file_path)
                except Exception as e:
                    # Log error but continue deletion
                    print(f"Error deleting image file {image.file_path}: {e}")
        
        # Fix paths
        BASE_DIR = Path(__file__).resolve().parent.parent.parent

        # 2. Delete model weight files
        model_weights_dir = BASE_DIR / "model_weights"

        # 3. Delete uploads directory for this model
        uploads_dir = BASE_DIR / "uploads"

        # Delete MobileNetV3 model weights
        mobilenet_checkpoint = model_weights_dir / f"mobilenet_model_{model_id}.pth"
        if mobilenet_checkpoint.exists():
            try:
                mobilenet_checkpoint.unlink()
            except Exception as e:
                print(f"Error deleting MobileNetV3 checkpoint: {e}")

        # 3. Delete uploads directory for this model

        model_upload_dir = uploads_dir / str(db_model.owner_id) / str(model_id)
        if model_upload_dir.exists():
            try:
                shutil.rmtree(model_upload_dir)
            except Exception as e:
                print(f"Error deleting uploads directory: {e}")

        # 4. Delete from database (cascade will handle images, training_jobs, annotations)
        db.delete(db_model)
        db.commit()
        return True


inspection_model_service = InspectionModelService()
