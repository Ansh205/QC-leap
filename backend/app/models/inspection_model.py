from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ModelStatus(str, enum.Enum):
    CREATED = "created"
    UPLOADING = "uploading"
    GENERATING_DATA = "generating_data"
    AWAITING_VALIDATION = "awaiting_validation"
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"


class InspectionModel(Base):
    __tablename__ = "inspection_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(ModelStatus), default=ModelStatus.CREATED, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)

    # Access control
    is_public = Column(Boolean, default=False, nullable=False, index=True)

    # Configuration
    num_synthetic_images = Column(Integer, default=1000)
    enable_human_validation = Column(Boolean, default=True)

    # Model paths
    gan_model_path = Column(String, nullable=True)
    vit_model_path = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    # Metrics
    accuracy = Column(String, nullable=True)
    precision = Column(String, nullable=True)
    recall = Column(String, nullable=True)
    f1_score = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="inspection_models")
    company = relationship("Company", back_populates="inspection_models")
    images = relationship("Image", back_populates="inspection_model", cascade="all, delete-orphan")
    training_jobs = relationship("TrainingJob", back_populates="inspection_model", cascade="all, delete-orphan", foreign_keys="TrainingJob.inspection_model_id")
    runs = relationship("ModelRun", back_populates="inspection_model", cascade="all, delete-orphan")
