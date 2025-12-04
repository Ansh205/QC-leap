from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import asyncio
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.models.training_job import TrainingJob
from app.schemas.inspection_model import (
    InspectionModelCreate,
    InspectionModelUpdate,
    InspectionModelResponse
)
from app.services.inspection_model_service import inspection_model_service

router = APIRouter()


class PredictBatchRequest(BaseModel):
    image_paths: List[str]


@router.post("/", response_model=InspectionModelResponse, status_code=status.HTTP_201_CREATED)
def create_inspection_model(
    model_in: InspectionModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new inspection model"""
    model = inspection_model_service.create(
        db=db,
        model_in=model_in,
        owner_id=current_user.id
    )
    return model


@router.get("/", response_model=List[InspectionModelResponse])
def list_inspection_models(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all inspection models accessible to the current user (public + owned + company models)"""
    from app.models.image import Image
    import random

    models = inspection_model_service.get_accessible_models(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )

    # Add thumbnail URL for each model
    result = []
    for model in models:
        model_dict = {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "num_synthetic_images": model.num_synthetic_images,
            "enable_human_validation": model.enable_human_validation,
            "is_public": model.is_public,
            "status": model.status,
            "owner_id": model.owner_id,
            "company_id": model.company_id,
            "accuracy": model.accuracy,
            "precision": model.precision,
            "recall": model.recall,
            "f1_score": model.f1_score,
            "created_at": model.created_at,
            "updated_at": model.updated_at,
            "thumbnail_url": None
        }

        # Get a random image for thumbnail
        images = db.query(Image).filter(Image.inspection_model_id == model.id).limit(10).all()
        if images:
            random_image = random.choice(images)
            model_dict["thumbnail_url"] = f"/images/{random_image.id}/file"

        result.append(model_dict)

    return result


@router.get("/{model_id}", response_model=InspectionModelResponse)
def get_inspection_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access (public + owned + company)
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return model


@router.put("/{model_id}", response_model=InspectionModelResponse)
def update_inspection_model(
    model_id: int,
    model_update: InspectionModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    updated_model = inspection_model_service.update(
        db=db,
        model_id=model_id,
        model_update=model_update
    )
    return updated_model


@router.post("/{model_id}/start-training")
def start_training(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start training for an inspection model (Copy-Paste + MobileNetV3 pipeline)"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Check if model is in correct state to start training
    from app.models.inspection_model import ModelStatus
    if model.status not in [ModelStatus.CREATED, ModelStatus.AWAITING_VALIDATION, ModelStatus.FAILED, ModelStatus.READY]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model is in {model.status} state and cannot start training"
        )

    # Create training job
    from app.services.training_job_service import training_job_service
    from app.models.training_job import JobType

    training_job = training_job_service.create(
        db=db,
        job_type=JobType.FULL_TRAINING,
        inspection_model_id=model_id,
        start_immediately=True
    )

    return {
        "message": "Training started successfully",
        "model_id": model_id,
        "training_job_id": training_job.id,
        "status": training_job.status,
        "celery_task_id": training_job.celery_task_id
    }


@router.post("/{model_id}/generate-synthetic")
def generate_synthetic_images(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Start synthetic image generation for a model
    """
    print(f"Endpoint hit: generate_synthetic_images for model {model_id}")
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update model status immediately
    from app.models.inspection_model import ModelStatus
    model.status = ModelStatus.GENERATING_DATA
    db.commit()

    # Create training job for synthetic generation
    from app.services.training_job_service import training_job_service
    from app.models.training_job import JobType

    # Log Redis configuration
    from app.ml.celery_app import celery_app
    print(f"API using Redis URL: {os.getenv('REDIS_URL', 'Not Set')}")
    print(f"Celery Broker URL: {celery_app.conf.broker_url}")

    training_job = training_job_service.create(
        db=db,
        job_type=JobType.SYNTHETIC_GENERATION,
        inspection_model_id=model_id,
        start_immediately=True
    )

    return {
        "message": "Synthetic generation started successfully",
        "model_id": model_id,
        "training_job_id": training_job.id,
        "status": training_job.status,
        "celery_task_id": training_job.celery_task_id
    }


@router.get("/{model_id}/statistics")
def get_model_statistics(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for an inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access (public + owned + company)
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Get image counts
    from app.models.image import Image, ImageType
    from app.models.annotation import Annotation

    normal_count = db.query(Image).filter(
        Image.inspection_model_id == model_id,
        Image.image_type == ImageType.REAL_NORMAL
    ).count()

    defective_count = db.query(Image).filter(
        Image.inspection_model_id == model_id,
        Image.image_type == ImageType.REAL_DEFECTIVE
    ).count()

    synthetic_count = db.query(Image).filter(
        Image.inspection_model_id == model_id,
        Image.image_type == ImageType.SYNTHETIC
    ).count()

    # Get annotation count
    annotation_count = db.query(Annotation).join(Image).filter(
        Image.inspection_model_id == model_id
    ).count()

    return {
        "model_id": model_id,
        "normal_images": normal_count,
        "defective_images": defective_count,
        "synthetic_images": synthetic_count,
        "annotated_images": annotation_count,
        "total_images": normal_count + defective_count + synthetic_count,
        "status": model.status,
        "accuracy": model.accuracy,
        "precision": model.precision,
        "recall": model.recall,
        "f1_score": model.f1_score
    }


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    inspection_model_service.delete(db=db, model_id=model_id)
    return None


@router.get("/{model_id}/training-jobs")
def get_training_jobs(
    model_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all training jobs for an inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    from app.services.training_job_service import training_job_service

    jobs = training_job_service.get_by_model(
        db=db,
        model_id=model_id,
        skip=skip,
        limit=limit
    )

    return jobs


@router.get("/{model_id}/training-status")
def get_training_status(
    model_id: int,
    job_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current training status for an inspection model"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    from app.services.training_job_service import training_job_service
    from app.models.training_job import TrainingStatus, JobType

    # Get most recent training job
    # Convert string job_type to Enum if provided
    job_type_enum = None
    if job_type:
        try:
            job_type_enum = JobType(job_type)
        except ValueError:
            pass # Ignore invalid types or handle error

    jobs = training_job_service.get_by_model(db=db, model_id=model_id, skip=0, limit=1, job_type=job_type_enum)

    if not jobs:
        return {
            "model_id": model_id,
            "has_training_job": False,
            "status": model.status
        }

    current_job = jobs[0]
    detailed_status = training_job_service.get_task_status(db=db, job_id=current_job.id)

    return {
        "model_id": model_id,
        "has_training_job": True,
        "training_job": detailed_status
    }


@router.get("/task-status/{task_id}")
async def get_celery_task_status(task_id: str):
    """
    Get real-time status of a Celery training task for live progress updates.
    This endpoint is polled by the frontend to display real-time progress.
    """
    from celery.result import AsyncResult
    from app.ml.celery_app import celery_app

    # Get the task result from Celery's backend (Redis)
    task_result = AsyncResult(task_id, app=celery_app)

    if not task_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get metadata from task state
    meta_info = task_result.info or {}

    if task_result.state == 'PENDING':
        response = {
            'status': 'PENDING',
            'message': 'Task is waiting to be processed.',
            'progress': 0
        }
    elif task_result.state == 'FAILURE':
        response = {
            'status': 'FAILURE',
            'message': meta_info.get('error', str(task_result.info)) if isinstance(task_result.info, Exception) else 'An unknown error occurred.',
            'progress': 0
        }
    elif task_result.state == 'SUCCESS':
        response = {
            'status': 'SUCCESS',
            'message': 'Training complete!',
            'progress': 100,
            'result': task_result.result
        }
    elif task_result.state == 'STARTED':
        # Training in progress
        response = {
            'status': 'IN_PROGRESS',
            'message': meta_info.get('status_key', 'Training started...'),
            'progress': meta_info.get('current_progress', 0),
            'stage': meta_info.get('stage', 'initializing')
        }
    else:
        # Handle other states like 'RETRY', 'REVOKED'
        response = {
            'status': task_result.state,
            'message': str(meta_info),
            'progress': 0
        }

    return response


@router.post("/{model_id}/predict")
def predict_single_image(
    model_id: int,
    image_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Predict if a single image contains defects"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Check if model is trained
    from app.models.inspection_model import ModelStatus
    if model.status != ModelStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model is not ready for prediction. Current status: {model.status}"
        )

    # Make prediction
    from app.ml.mobilenet_service import mobilenet_service

    try:
        checkpoint_path = mobilenet_service.get_model_checkpoint_path(model_id)
        result = mobilenet_service.predict(image_path, checkpoint_path=checkpoint_path)

        return {
            "model_id": model_id,
            "image_path": image_path,
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post("/{model_id}/predict-batch")
def predict_batch_images(
    model_id: int,
    request: PredictBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Predict defects for multiple images"""
    model = inspection_model_service.get_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection model not found"
        )

    # Check access
    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Check if model is trained
    from app.models.inspection_model import ModelStatus
    if model.status != ModelStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model is not ready for prediction. Current status: {model.status}"
        )

    # Make batch prediction
    from app.ml.mobilenet_service import mobilenet_service

    try:
        checkpoint_path = mobilenet_service.get_model_checkpoint_path(model_id)
        results = mobilenet_service.predict_batch(request.image_paths, checkpoint_path=checkpoint_path)

        return {
            "model_id": model_id,
            "total_images": len(request.image_paths),
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


@router.get("/{model_id}/progress/stream")
async def stream_training_progress(
    model_id: int,
    token: str = None,
    db: Session = Depends(get_db)
):
    """Stream training progress in real-time using Server-Sent Events"""
    # Authenticate via token query param
    current_user = None
    if token:
        from jose import jwt, JWTError
        from app.core.config import settings
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id)).first()
        except JWTError:
            pass

    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    async def progress_generator():
        # Get initial training job
        from app.models.inspection_model import InspectionModel
        model = db.query(InspectionModel).filter(InspectionModel.id == model_id).first()
        if not model:
            yield f"data: {json.dumps({'error': 'Model not found'})}\n\n"
            return

        # Stream progress updates for up to 2 hours
        for _ in range(7200):  # 2 hours
            await asyncio.sleep(0.5)  # Update every 500ms for smoother progress

            # Refresh database session
            db.expire_all()

            # Get latest training job
            from app.models.training_job import TrainingJob
            training_job = db.query(TrainingJob).filter(
                TrainingJob.inspection_model_id == model_id
            ).order_by(TrainingJob.created_at.desc()).first()

            if not training_job:
                continue

            progress_data = {
                'progress': training_job.progress,
                'status': training_job.status.value if hasattr(training_job.status, 'value') else str(training_job.status),
                'current_stage': training_job.current_stage,
                'error_message': training_job.error_message
            }

            yield f"data: {json.dumps(progress_data)}\n\n"

            # Stop streaming if training is complete or failed
            if training_job.status in ['completed', 'failed', 'cancelled']:
                break

    import json
    return StreamingResponse(
        progress_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
    )


@router.get("/{model_id}/logs/stream")
async def stream_training_logs(
    model_id: int,
    token: str = None,
    db: Session = Depends(get_db)
):
    """Stream Celery training logs in real-time"""
    # Authenticate via token query param (EventSource doesn't support headers)
    current_user = None
    if token:
        from jose import jwt, JWTError
        from app.core.config import settings
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id)).first()
        except JWTError:
            pass

    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not inspection_model_service.can_access(db=db, model_id=model_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    async def log_generator():
        log_file = "/home/kabilan/se-project/backend/celery.log"
        try:
            # Send initial connection message
            yield f"data: connected\n\n"

            # Send last 100 lines if file exists
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-100:]:
                        line = line.rstrip('\n\r')
                        if line.strip():  # Only send non-empty lines
                            yield f"data: {line}\n\n"

            # Stream new lines for 10 minutes
            last_size = os.path.getsize(log_file) if os.path.exists(log_file) else 0
            for _ in range(600):  # 10 minutes
                await asyncio.sleep(1)
                if os.path.exists(log_file):
                    current_size = os.path.getsize(log_file)
                    if current_size > last_size:
                        with open(log_file, 'r') as f:
                            f.seek(last_size)
                            new_lines = f.readlines()
                            for line in new_lines:
                                line = line.rstrip('\n\r')
                                if line.strip():  # Only send non-empty lines
                                    yield f"data: {line}\n\n"
                        last_size = current_size
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(
        log_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
