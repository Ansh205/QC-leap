from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.inspection_model import ModelStatus


class InspectionModelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    num_synthetic_images: int = Field(default=1000, ge=1, le=10000)
    enable_human_validation: bool = True
    is_public: bool = False


class InspectionModelCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    num_synthetic_images: Optional[int] = Field(default=1000, ge=1, le=10000)
    enable_human_validation: Optional[bool] = True
    is_public: Optional[bool] = False


class InspectionModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    num_synthetic_images: Optional[int] = None
    enable_human_validation: Optional[bool] = None
    is_public: Optional[bool] = None
    status: Optional[ModelStatus] = None


class InspectionModelResponse(InspectionModelBase):
    id: int
    status: ModelStatus
    owner_id: int
    company_id: Optional[int] = None
    is_public: bool
    thumbnail_url: Optional[str] = None
    accuracy: Optional[str] = None
    precision: Optional[str] = None
    recall: Optional[str] = None
    f1_score: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InspectionModel(InspectionModelResponse):
    """Full inspection model schema"""
    gan_model_path: Optional[str] = None
    vit_model_path: Optional[str] = None


class DeleteInspectionModel(BaseModel):
    current_password: str
