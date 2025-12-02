from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.image import ImageType, ImageStatus


class ImageBase(BaseModel):
    filename: str
    image_type: ImageType


class ImageResponse(ImageBase):
    id: int
    file_path: str
    status: ImageStatus
    inspection_model_id: int
    is_synthetic: bool
    prediction: Optional[str] = None
    confidence_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Image(ImageResponse):
    """Full image schema"""
    pass
