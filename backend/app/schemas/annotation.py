from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.annotation import AnnotationType


# Base schema
class AnnotationBase(BaseModel):
    defect_labels: str = Field(..., description="Comma-separated defect types, e.g., 'burnt,spot'")
    mask_path: Optional[str] = Field(None, description="Path to segmentation mask PNG file")
    canvas_data: Optional[str] = Field(None, description="JSON string of canvas drawing data")
    notes: Optional[str] = Field(None, description="Optional notes about the annotation")


# Schema for creating annotation (manual or uploaded)
class AnnotationCreate(AnnotationBase):
    image_id: int
    annotation_type: AnnotationType = AnnotationType.MANUAL


# Schema for updating annotation
class AnnotationUpdate(BaseModel):
    defect_labels: Optional[str] = None
    mask_path: Optional[str] = None
    canvas_data: Optional[str] = None
    notes: Optional[str] = None


# Schema for annotation response
class AnnotationResponse(AnnotationBase):
    id: int
    image_id: int
    annotation_type: AnnotationType
    created_by_user_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Schema for uploading annotation CSV
class AnnotationCSVRow(BaseModel):
    """Represents a single row in the annotation CSV"""
    image_path: str = Field(..., description="Relative path to image, e.g., 'defective/005.JPG'")
    defect_labels: str = Field(..., description="Comma-separated defect types or 'normal'")
    mask_path: Optional[str] = Field(None, description="Path to mask file, e.g., 'masks/005.png'")


# Schema for canvas annotation (polygon-based)
class CanvasPolygon(BaseModel):
    """Represents a polygon drawn on canvas"""
    points: list[tuple[float, float]] = Field(..., description="List of (x, y) coordinates")
    label: str = Field(..., description="Defect type for this polygon")


class CanvasAnnotationData(BaseModel):
    """Complete canvas annotation for an image"""
    image_width: int
    image_height: int
    polygons: list[CanvasPolygon] = Field(default_factory=list)


# Schema for manual annotation submission
class ManualAnnotationCreate(BaseModel):
    image_id: int
    defect_labels: str
    canvas_data: CanvasAnnotationData
    notes: Optional[str] = None
