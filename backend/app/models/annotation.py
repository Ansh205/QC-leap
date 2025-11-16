from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AnnotationType(str, enum.Enum):
    """Type of annotation source"""
    UPLOADED = "uploaded"  # From uploaded CSV
    MANUAL = "manual"      # User-drawn on canvas
    AUTO = "auto"          # System-generated


class Annotation(Base):
    """
    Stores defect annotations for images.

    For defective images, annotations contain:
    - Defect labels (e.g., "burnt,spot")
    - Segmentation mask path (PNG file showing defect regions)
    - Annotation source (uploaded CSV, manual canvas, or auto-generated)
    """
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False, unique=True)

    # Defect information
    defect_labels = Column(String, nullable=False)  # Comma-separated: "burnt,spot,breakage"
    mask_path = Column(String, nullable=True)  # Path to segmentation mask PNG

    # Annotation metadata
    annotation_type = Column(Enum(AnnotationType), default=AnnotationType.MANUAL, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL if system-generated

    # Additional metadata (for canvas annotations)
    canvas_data = Column(Text, nullable=True)  # JSON string of canvas polygons/shapes
    notes = Column(Text, nullable=True)  # Optional user notes

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    image = relationship("Image", back_populates="annotation")
    created_by = relationship("User")
