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
from fastapi.responses import FileResponse
from app.services.llm_service import llm_report, generate_pdf_report
from app.models.image import Image, ImageType
from app.models.inference_result import InferenceResult
import random

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

import uuid

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
    
    # Generate unique filename to prevent overwriting
    ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Add to DB (store original filename for display, but unique path for storage)
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

    # Log count
    print(f"Executing run {run_id} with {len(run.inference_results)} images")

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
    
    results = run.inference_results
    print(f"Returning {len(results)} results for run {run_id}")
    return results

@router.get("/runs/{run_id}/results/{result_id}/report")
def download_report(
    run_id: int,
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate and download a PDF report for a defective image"""
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if not inspection_model_service.can_access(db, run.inspection_model_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the inference result
    result = db.query(InferenceResult).filter(InferenceResult.id == result_id, InferenceResult.model_run_id == run_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    # Get the defective image
    defective_image = db.query(Image).filter(Image.id == result.image_id).first()
    if not defective_image:
        raise HTTPException(status_code=404, detail="Defective image not found")
        
    # Get a random normal image from the training set
    normal_images = db.query(Image).filter(
        Image.inspection_model_id == run.inspection_model_id,
        Image.image_type == ImageType.REAL_NORMAL
    ).all()
    
    if not normal_images:
        # Fallback: try to find any normal image, maybe from synthetic?
        # Or just fail gracefully?
        # Let's try synthetic if no real normal
        normal_images = db.query(Image).filter(
            Image.inspection_model_id == run.inspection_model_id,
            Image.image_type == ImageType.SYNTHETIC
        ).all()
        
    if not normal_images:
         raise HTTPException(status_code=400, detail="No reference normal images found for this model to generate report")
         
    normal_image = random.choice(normal_images)
    
    # Generate Report
    print(f"Generating report for result {result_id} using reference {normal_image.id}")
    
    # Prepare paths
    # Ensure paths are absolute if stored relative
    def resolve_path(path_str):
        path = Path(path_str)
        if not path.is_absolute():
            return str(Path(os.getcwd()) / path)
        return str(path)

    defective_path = resolve_path(defective_image.file_path)
    normal_path = resolve_path(normal_image.file_path)
    
    # Call LLM
    report_data = llm_report(normal_path, defective_path, model_features=result.prediction)
    
    if "response" not in report_data or report_data["response"].startswith("Error"):
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {report_data.get('response')}")
        
    report_text = report_data["response"]
    
    # Generate PDF
    reports_dir = Path(os.getcwd()) / "uploads" / "runs" / str(run_id) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_filename = f"report_{result_id}.pdf"
    pdf_path = reports_dir / pdf_filename
    
    generated_pdf_path = generate_pdf_report(report_text, str(pdf_path), defective_path)
    
    if not generated_pdf_path:
        raise HTTPException(status_code=500, detail="Failed to create PDF file")
        
    return FileResponse(
        path=generated_pdf_path, 
        filename=pdf_filename, 
        media_type='application/pdf'
    )
