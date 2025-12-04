from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.image import Image, ImageType, ImageStatus


class ImageService:
    @staticmethod
    def get_by_id(db: Session, image_id: int) -> Optional[Image]:
        """Get image by ID"""
        return db.query(Image).filter(Image.id == image_id).first()

    @staticmethod
    def get_by_model(
        db: Session,
        model_id: int,
        image_type: Optional[ImageType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Image]:
        """Get images for an inspection model"""
        query = db.query(Image).filter(Image.inspection_model_id == model_id)

        if image_type:
            query = query.filter(Image.image_type == image_type)

        return query.order_by(Image.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def create(
        db: Session,
        filename: str,
        file_path: str,
        image_type: ImageType,
        inspection_model_id: int,
        is_synthetic: bool = False
    ) -> Image:
        """Create new image record"""
        db_image = Image(
            filename=filename,
            file_path=file_path,
            image_type=image_type,
            inspection_model_id=inspection_model_id,
            is_synthetic=is_synthetic,
            status=ImageStatus.UPLOADED,
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        return db_image

    @staticmethod
    def update_status(db: Session, image_id: int, status: ImageStatus) -> Optional[Image]:
        """Update image status"""
        db_image = ImageService.get_by_id(db, image_id)
        if not db_image:
            return None

        db_image.status = status
        db.commit()
        db.refresh(db_image)
        return db_image

    @staticmethod
    def update_prediction(
        db: Session,
        image_id: int,
        prediction: str,
        confidence_score: float
    ) -> Optional[Image]:
        """Update image prediction results"""
        db_image = ImageService.get_by_id(db, image_id)
        if not db_image:
            return None

        db_image.prediction = prediction
        db_image.confidence_score = confidence_score
        db_image.status = ImageStatus.PROCESSED
        db.commit()
        db.refresh(db_image)
        return db_image

    @staticmethod
    def delete(db: Session, image_id: int) -> bool:
        """Delete image"""
        db_image = ImageService.get_by_id(db, image_id)
        if not db_image:
            return False

        db.delete(db_image)
        db.commit()
        return True


image_service = ImageService()
