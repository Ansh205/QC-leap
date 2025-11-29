from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ImageType(str, enum.Enum):
    REAL_NORMAL = "normal"
    REAL_DEFECTIVE = "defective"
    SYNTHETIC = "synthetic"
    inference = "inference"
    TEST = "test"


class ImageStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    VALIDATED = "validated"
    REJECTED = "rejected"
    PROCESSED = "processed"


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    image_type = Column(Enum(ImageType), nullable=False)
    status = Column(Enum(ImageStatus), default=ImageStatus.UPLOADED)

    inspection_model_id = Column(Integer, ForeignKey("inspection_models.id"), nullable=False)

    # For synthetic images
    is_synthetic = Column(Boolean, default=False)

    # For predictions
    prediction = Column(String, nullable=True)  # "defective" or "non-defective"
    confidence_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    inspection_model = relationship("InspectionModel", back_populates="images")
    annotation = relationship("Annotation", back_populates="image", uselist=False, cascade="all, delete-orphan")
