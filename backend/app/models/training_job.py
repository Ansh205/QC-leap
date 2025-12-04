from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class JobType(str, enum.Enum):
    FULL_TRAINING = "FULL_TRAINING"  # Complete pipeline: Copy-Paste + MobileNetV3
    SYNTHETIC_GENERATION = "SYNTHETIC_GENERATION"
    MOBILENET_TRAINING = "MOBILENET_TRAINING"


class TrainingStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# Alias for backward compatibility
JobStatus = TrainingStatus


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(TrainingStatus), default=TrainingStatus.PENDING, nullable=False)

    inspection_model_id = Column(Integer, ForeignKey("inspection_models.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("inspection_models.id"), nullable=True)  # Alias for inspection_model_id

    # Celery task tracking
    celery_task_id = Column(String, nullable=True, index=True)
    current_stage = Column(String, nullable=True)  # gan_training, synthetic_generation, vit_training, etc.

    # Job details
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    error_message = Column(Text, nullable=True)
    metrics = Column(JSON, nullable=True)  # Store training metrics

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    inspection_model = relationship("InspectionModel", back_populates="training_jobs", foreign_keys=[inspection_model_id])
