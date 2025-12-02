from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.model_run import ModelRun, RunStatus
from app.models.inference_result import InferenceResult
from app.models.image import Image, ImageType
from app.models.inspection_model import InspectionModel
import os
import shutil
from pathlib import Path

class RunService:
    @staticmethod
    def create_run(db: Session, model_id: int) -> ModelRun:
        """Create a new run for a model"""
        # Get next run number
        last_run = db.query(ModelRun).filter(ModelRun.inspection_model_id == model_id).order_by(ModelRun.run_number.desc()).first()
        run_number = (last_run.run_number + 1) if last_run else 1

        run = ModelRun(
            inspection_model_id=model_id,
            run_number=run_number,
            status=RunStatus.CREATED
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def add_image_to_run(db: Session, run_id: int, file_path: str, filename: str) -> Image:
        """Add an image to a run"""
        run = db.query(ModelRun).filter(ModelRun.id == run_id).first()
        if not run:
            raise ValueError("Run not found")

        # Create Image record
        image = Image(
            filename=filename,
            file_path=file_path,
            image_type="inference", # Hardcoded to avoid Enum issues
            inspection_model_id=run.inspection_model_id,
            is_synthetic=False
        )
        print(f"Adding image to run {run_id}: {filename}, type='inference'")
        db.add(image)
        db.commit()
        db.refresh(image)

        # Create empty InferenceResult linked to this image and run
        result = InferenceResult(
            model_run_id=run_id,
            image_id=image.id
        )
        db.add(result)
        db.commit()
        
        return image

    @staticmethod
    def get_run(db: Session, run_id: int) -> Optional[ModelRun]:
        return db.query(ModelRun).filter(ModelRun.id == run_id).first()

    @staticmethod
    def get_runs_by_model(db: Session, model_id: int, skip: int = 0, limit: int = 100) -> List[ModelRun]:
        return db.query(ModelRun).filter(ModelRun.inspection_model_id == model_id).order_by(ModelRun.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_status(db: Session, run_id: int, status: RunStatus) -> ModelRun:
        run = db.query(ModelRun).filter(ModelRun.id == run_id).first()
        if run:
            run.status = status
            if status in [RunStatus.COMPLETED, RunStatus.FAILED]:
                run.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(run)
        return run

run_service = RunService()
