from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.models.inspection_model import InspectionModel
from app.models.image import Image, ImageType
from app.models.training_job import TrainingStatus
from app.models.training_job import TrainingJob

router = APIRouter()


@router.get("/overview")
def get_stats_overview(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overview statistics for the current user/company"""

    # Get models accessible to the user
    if current_user.company_id:
        models_query = db.query(InspectionModel).filter(
            (InspectionModel.owner_id == current_user.id) |
            (InspectionModel.company_id == current_user.company_id) |
            (InspectionModel.is_public == True)
        )
    else:
        models_query = db.query(InspectionModel).filter(
            (InspectionModel.owner_id == current_user.id) |
            (InspectionModel.is_public == True)
        )

    model_ids = [m.id for m in models_query.all()]

    # Total models
    total_models = len(model_ids)

    # Total images by type
    total_normal = db.query(Image).filter(
        Image.inspection_model_id.in_(model_ids),
        Image.image_type == ImageType.REAL_NORMAL
    ).count() if model_ids else 0

    total_defective = db.query(Image).filter(
        Image.inspection_model_id.in_(model_ids),
        Image.image_type == ImageType.REAL_DEFECTIVE
    ).count() if model_ids else 0

    total_synthetic = db.query(Image).filter(
        Image.inspection_model_id.in_(model_ids),
        Image.image_type == ImageType.SYNTHETIC
    ).count() if model_ids else 0

    # Training jobs stats
    total_training_jobs = db.query(TrainingJob).filter(
        TrainingJob.inspection_model_id.in_(model_ids)
    ).count() if model_ids else 0

    completed_jobs = db.query(TrainingJob).filter(
        TrainingJob.inspection_model_id.in_(model_ids),
        TrainingJob.status == TrainingStatus.COMPLETED  
    ).count() if model_ids else 0

    failed_jobs = db.query(TrainingJob).filter(
        TrainingJob.inspection_model_id.in_(model_ids),
        TrainingJob.status == TrainingStatus.FAILED   
    ).count() if model_ids else 0

    # --- FIX: Daily inspection stats logic ---
    # We want the range to end at 'Tomorrow 00:00' so that 'Today' is fully included.
    # Start date is (Today - (days - 1)) to get exactly 'days' number of bars including today.
    
    now = datetime.utcnow()
    # Reset to start of today (00:00:00)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate start date (e.g. 6 days ago + today = 7 days)
    start_date = today_start - timedelta(days=days - 1)

    daily_stats = []
    for i in range(days):
        # Calculate window for this specific day
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)

        defective_count = db.query(Image).filter(
            Image.inspection_model_id.in_(model_ids),
            Image.image_type == ImageType.REAL_DEFECTIVE,
            Image.created_at >= day_start,
            Image.created_at < day_end
        ).count() if model_ids else 0

        normal_count = db.query(Image).filter(
            Image.inspection_model_id.in_(model_ids),
            Image.image_type == ImageType.REAL_NORMAL,
            Image.created_at >= day_start,
            Image.created_at < day_end
        ).count() if model_ids else 0

        daily_stats.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day_label": day_start.strftime("%a"), # Mon, Tue...
            "defective": defective_count,
            "normal": normal_count
        })

    return {
        "total_models": total_models,
        "total_images": {
            "normal": total_normal,
            "defective": total_defective,
            "synthetic": total_synthetic,
            "total": total_normal + total_defective + total_synthetic
        },
        "training_jobs": {
            "total": total_training_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
            "success_rate": round((completed_jobs / total_training_jobs * 100) if total_training_jobs > 0 else 0, 1)
        },
        "daily_inspections": daily_stats
    }