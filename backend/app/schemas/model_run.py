from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class RunStatus(str, Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ModelRunBase(BaseModel):
    run_number: int
    status: RunStatus
    inspection_model_id: int

class ModelRunCreate(ModelRunBase):
    pass

class ModelRunUpdate(BaseModel):
    status: Optional[RunStatus] = None
    completed_at: Optional[datetime] = None

class ModelRun(ModelRunBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    preview_image_id: Optional[int] = None

    class Config:
        from_attributes = True
