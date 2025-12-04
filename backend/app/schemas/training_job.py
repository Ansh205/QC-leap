from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.training_job import JobType, JobStatus


class TrainingJobBase(BaseModel):
    job_type: JobType


class TrainingJobResponse(TrainingJobBase):
    id: int
    status: JobStatus
    inspection_model_id: int
    progress: float
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrainingJob(TrainingJobResponse):
    """Full training job schema"""
    pass
