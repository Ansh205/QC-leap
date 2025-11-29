from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class RunStatus(str, enum.Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_number = Column(Integer, nullable=False)
    inspection_model_id = Column(Integer, ForeignKey("inspection_models.id"), nullable=False)
    status = Column(Enum(RunStatus), default=RunStatus.CREATED)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    inspection_model = relationship("InspectionModel", back_populates="runs")
    inference_results = relationship("InferenceResult", back_populates="model_run", cascade="all, delete-orphan")

    @property
    def preview_image_id(self):
        if self.inference_results and len(self.inference_results) > 0:
            return self.inference_results[0].image_id
        return None
