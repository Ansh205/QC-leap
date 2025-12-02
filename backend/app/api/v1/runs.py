from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.services.run_service import run_service
from app.services.inspection_model_service import inspection_model_service
from app.models.model_run import RunStatus
import shutil
import os
from pathlib import Path

from app.schemas.model_run import ModelRun

router = APIRouter()

@router.post("/models/{model_id}/runs", response_model=ModelRun)
def create_run(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new run for a model"""
    # Check access
    if not inspection_model_service.can_access(db, model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    run = run_service.create_run(db, model_id)
    return run

@router.post("/runs/{run_id}/upload")
async def upload_run_image(
    run_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload an image to a run"""
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Check access to model
    if not inspection_model_service.can_access(db, run.inspection_model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save file
    upload_dir = Path(os.getcwd()) / "uploads" / "runs" / str(run_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Add to DB
    image = run_service.add_image_to_run(db, run_id, str(file_path), file.filename)
    return image

@router.post("/runs/{run_id}/execute")
def execute_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Trigger inference for a run"""
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if not inspection_model_service.can_access(db, run.inspection_model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update status
    run_service.update_status(db, run_id, RunStatus.RUNNING)

    # Dispatch Celery task
    from app.ml.tasks import execute_run_task
    execute_run_task.delay(run_id)

    return {"status": "started"}

@router.get("/models/{model_id}/runs", response_model=List[ModelRun])
def list_runs(
    model_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List runs for a model"""
    if not inspection_model_service.can_access(db, model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return run_service.get_runs_by_model(db, model_id, skip, limit)

@router.get("/runs/{run_id}", response_model=ModelRun)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get run details"""
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if not inspection_model_service.can_access(db, run.inspection_model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return run

@router.get("/runs/{run_id}/results")
def get_run_results(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get results for a run"""
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if not inspection_model_service.can_access(db, run.inspection_model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return run.inference_results
