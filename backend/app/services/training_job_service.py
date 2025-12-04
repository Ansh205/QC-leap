from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from app.models.training_job import TrainingJob, JobType, TrainingStatus, JobStatus
from app.ml.tasks import train_model_task, generate_synthetic_task


class TrainingJobService:
    @staticmethod
    def get_by_id(db: Session, job_id: int) -> Optional[TrainingJob]:
        """Get training job by ID"""
        return db.query(TrainingJob).filter(TrainingJob.id == job_id).first()

    @staticmethod
    def get_by_model(
        db: Session,
        model_id: int,
        skip: int = 0,
        limit: int = 100,
        job_type: Optional[JobType] = None
    ) -> List[TrainingJob]:
        """Get all training jobs for an inspection model"""
        query = db.query(TrainingJob).filter(TrainingJob.inspection_model_id == model_id)
        
        if job_type:
            query = query.filter(TrainingJob.job_type == job_type)
            
        return (
            query
            .order_by(TrainingJob.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create(
        db: Session,
        job_type: JobType,
        inspection_model_id: int,
        start_immediately: bool = True
    ) -> TrainingJob:
        """Create new training job and optionally start it"""
        db_job = TrainingJob(
            job_type=job_type,
            inspection_model_id=inspection_model_id,
            model_id=inspection_model_id,  # Set alias
            status=TrainingStatus.PENDING,
            progress=0.0,
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        # Start training task if requested
        if start_immediately:
            if job_type == JobType.SYNTHETIC_GENERATION:
                TrainingJobService.start_synthetic_generation(db, db_job.id)
            else:
                TrainingJobService.start_training(db, db_job.id)
            db.refresh(db_job)

        return db_job

    @staticmethod
    def start_training(db: Session, job_id: int) -> Optional[TrainingJob]:
        """Start training job by dispatching to Celery"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        if db_job.status != TrainingStatus.PENDING:
            return db_job

        # Dispatch to Celery
        task = train_model_task.apply_async(args=[job_id])

        # Update job with Celery task ID
        db_job.celery_task_id = task.id
        db_job.status = TrainingStatus.PENDING
        db.commit()
        db.refresh(db_job)

        return db_job

    @staticmethod
    def start_synthetic_generation(db: Session, job_id: int) -> Optional[TrainingJob]:
        """Start synthetic generation job by dispatching to Celery"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        if db_job.status != TrainingStatus.PENDING:
            return db_job

        # Dispatch to Celery
        print(f"Dispatching generate_synthetic_task for job {job_id}")
        task = generate_synthetic_task.apply_async(args=[job_id])
        print(f"Task dispatched. ID: {task.id}")

        # Update job with Celery task ID
        db_job.celery_task_id = task.id
        db_job.status = TrainingStatus.PENDING
        db.commit()
        db.refresh(db_job)

        return db_job

    @staticmethod
    def update_status(
        db: Session,
        job_id: int,
        status: TrainingStatus,
        error_message: Optional[str] = None
    ) -> Optional[TrainingJob]:
        """Update training job status"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        db_job.status = status

        if status == TrainingStatus.RUNNING and not db_job.started_at:
            db_job.started_at = datetime.utcnow()
        elif status in [TrainingStatus.COMPLETED, TrainingStatus.FAILED, TrainingStatus.CANCELLED]:
            db_job.completed_at = datetime.utcnow()

        if error_message:
            db_job.error_message = error_message

        db.commit()
        db.refresh(db_job)
        return db_job

    @staticmethod
    def update_progress(db: Session, job_id: int, progress: float, current_stage: Optional[str] = None) -> Optional[TrainingJob]:
        """Update training job progress and current stage"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        db_job.progress = min(100.0, max(0.0, progress))

        if current_stage:
            db_job.current_stage = current_stage

        db.commit()
        db.refresh(db_job)
        return db_job

    @staticmethod
    def get_task_status(db: Session, job_id: int) -> Optional[Dict]:
        """Get detailed status of training job including Celery task info"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        status_info = {
            'job_id': db_job.id,
            'status': db_job.status,
            'progress': db_job.progress,
            'current_stage': db_job.current_stage,
            'started_at': db_job.started_at.isoformat() if db_job.started_at else None,
            'completed_at': db_job.completed_at.isoformat() if db_job.completed_at else None,
            'error_message': db_job.error_message,
            'metrics': db_job.metrics
        }

        # Get Celery task status if available
        if db_job.celery_task_id:
            from app.ml.celery_app import celery_app
            task_result = celery_app.AsyncResult(db_job.celery_task_id)
            status_info['celery_status'] = task_result.status
            status_info['celery_info'] = str(task_result.info) if task_result.info else None

        return status_info

    @staticmethod
    def cancel_job(db: Session, job_id: int) -> Optional[TrainingJob]:
        """Cancel a running training job"""
        db_job = TrainingJobService.get_by_id(db, job_id)
        if not db_job:
            return None

        if db_job.status not in [TrainingStatus.PENDING, TrainingStatus.RUNNING]:
            return db_job

        # Revoke Celery task if exists
        if db_job.celery_task_id:
            from app.ml.celery_app import celery_app
            celery_app.control.revoke(db_job.celery_task_id, terminate=True)

        # Update status
        db_job.status = TrainingStatus.CANCELLED
        db_job.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(db_job)

        return db_job


training_job_service = TrainingJobService()
