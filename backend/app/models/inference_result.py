from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class InferenceResult(Base):
    __tablename__ = "inference_results"

    id = Column(Integer, primary_key=True, index=True)
    model_run_id = Column(Integer, ForeignKey("model_runs.id"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    confidence = Column(Float, nullable=True)
    prediction = Column(String, nullable=True) # "Normal" or "Defective"
    details = Column(JSON, nullable=True) # Bounding boxes, etc.

    # Relationships
    model_run = relationship("ModelRun", back_populates="inference_results")
    image = relationship("Image")
