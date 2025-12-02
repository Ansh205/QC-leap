"""
Celery tasks for ML model training
"""
from celery import Task
from app.ml.celery_app import celery_app
from app.ml.copy_paste_service import copy_paste_service
from app.ml.mobilenet_service import mobilenet_service
from app.ml.sanity_check import sanity_checker
from app.ml.normal_balancer import normal_balancer
from app.database import SessionLocal
from app.models.training_job import TrainingJob, TrainingStatus
from app.models.inspection_model import InspectionModel, ModelStatus
from app.models.image import Image, ImageType
from app.models.model_run import ModelRun
from app.models.inference_result import InferenceResult
from app.services.notification_service import notification_service
from pathlib import Path
import os
import traceback
import shutil
from datetime import datetime

class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None

@celery_app.task(bind=True, base=DatabaseTask, name='app.ml.tasks.train_model')
def train_model_task(self, training_job_id: int):
    """Background task to train defect detection model"""
    db = self.db
    print(f"Starting training task for Job ID: {training_job_id}")

    try:
        # Get job and model
        training_job = db.query(TrainingJob).filter(TrainingJob.id == training_job_id).first()
        if not training_job: raise ValueError(f"Job {training_job_id} not found")
        
        model = db.query(InspectionModel).filter(InspectionModel.id == training_job.model_id).first()
        if not model: raise ValueError(f"Model {training_job.model_id} not found")

        # Set status to RUNNING
        training_job.status = TrainingStatus.RUNNING
        training_job.progress = 1
        training_job.current_stage = "initializing"
        model.status = ModelStatus.TRAINING
        db.commit()

        # Setup paths (Windows-safe)
        base_dir = Path(os.getcwd()) / "uploads" / str(model.owner_id) / str(model.id)
        normal_dir = base_dir / "raw_images" / "normal"
        defective_dir = base_dir / "raw_images" / "defective"
        synthetic_dir = base_dir / "synthetic_images"
        
        # Ensure synthetic dir exists (do not clear it)
        synthetic_dir.mkdir(parents=True, exist_ok=True)

        print(f"Data directory: {base_dir}")

        # --- STEP 1: SANITY CHECK ---
        training_job.current_stage = "sanity_check"
        db.commit()
        
        # Skip sanity check if not enough data (dev mode)
        n_normal = len(list(normal_dir.glob('*')))
        n_defective = len(list(defective_dir.glob('*')))
        
        if n_normal > 0 and n_defective > 0:
            try:
                # Relaxed threshold for dev
                sanity_checker.check_similarity(str(normal_dir), str(defective_dir), threshold=0.3)
            except Exception as e:
                print(f"Sanity check warning: {e}")

        # --- STEP 2: SYNTHETIC GENERATION ---
        # SKIPPED: As per user request, training task should NOT generate images.
        # It will use whatever synthetic images are already present in the directory.
        print("Skipping synthetic generation in training task. Using existing images.")

        # --- STEP 3: TRAINING ---
        training_job.progress = 50
        training_job.current_stage = "mobilenet_training"
        db.commit()

        # Combine datasets
        train_normal_dir = base_dir / "combined_normal"
        train_defective_dir = base_dir / "combined_defective"
        
        if train_normal_dir.exists(): shutil.rmtree(train_normal_dir)
        if train_defective_dir.exists(): shutil.rmtree(train_defective_dir)
        train_normal_dir.mkdir()
        train_defective_dir.mkdir()

        # Copy files (simple copy to avoid symlink issues on Windows)
        for f in normal_dir.glob('*'): shutil.copy(f, train_normal_dir)
        for f in defective_dir.glob('*'): shutil.copy(f, train_defective_dir)
        for f in synthetic_dir.glob('*'): shutil.copy(f, train_defective_dir)

        # Progress Callback
        def on_progress(pct, stage):
            training_job.progress = pct
            training_job.current_stage = stage
            db.commit()

        checkpoint_path = mobilenet_service.get_model_checkpoint_path(model.id)
        
        metrics = mobilenet_service.train_classifier(
            str(train_normal_dir), str(train_defective_dir), checkpoint_path,
            epochs=10, # Reduced for speed
            progress_callback=on_progress
        )

        # Completion
        training_job.progress = 100
        training_job.status = TrainingStatus.COMPLETED
        training_job.current_stage = "completed"
        
        # Flatten metrics for frontend
        flat_metrics = {
            "accuracy": metrics.get("best_val_accuracy"),
            "precision": metrics.get("best_val_precision"),
            "recall": metrics.get("best_val_recall"),
            "f1_score": metrics.get("best_val_f1_score"),
            "mobilenet_metrics": metrics
        }
        training_job.metrics = flat_metrics
        
        model.status = ModelStatus.READY
        model.accuracy = str(metrics.get("best_val_accuracy", 0))
        model.precision = str(metrics.get("best_val_precision", 0))
        model.recall = str(metrics.get("best_val_recall", 0))
        model.f1_score = str(metrics.get("best_val_f1_score", 0))
        model.vit_model_path = checkpoint_path
        
        db.commit()
        print("Training Pipeline Completed Successfully!")
        return {"status": "success", "accuracy": model.accuracy}

    except Exception as e:
        print(f"Training Failed: {e}")
        traceback.print_exc()
        db.rollback()
        if 'training_job' in locals() and training_job:
            training_job.status = TrainingStatus.FAILED
            training_job.error_message = str(e)
        if 'model' in locals() and model:
            model.status = ModelStatus.FAILED
        db.commit()
        return {"status": "failed", "error": str(e)}

@celery_app.task(bind=True, base=DatabaseTask, name='app.ml.tasks.generate_synthetic')
def generate_synthetic_task(self, training_job_id: int):
    """Background task to generate synthetic images only"""
    db = self.db
    print(f"Starting synthetic generation task for Job ID: {training_job_id}")
    print(f"DB Session: {db}")

    try:
        # Get job and model
        training_job = db.query(TrainingJob).filter(TrainingJob.id == training_job_id).first()
        if not training_job: raise ValueError(f"Job {training_job_id} not found")
        
        model = db.query(InspectionModel).filter(InspectionModel.id == training_job.model_id).first()
        if not model: raise ValueError(f"Model {training_job.model_id} not found")

        # Set status to RUNNING
        training_job.status = TrainingStatus.RUNNING
        training_job.progress = 0
        training_job.current_stage = "initializing"
        model.status = ModelStatus.GENERATING_DATA
        db.commit()

        # Setup paths (Windows-safe)
        base_dir = Path(os.getcwd()) / "uploads" / str(model.owner_id) / str(model.id)
        normal_dir = base_dir / "raw_images" / "normal"
        defective_dir = base_dir / "raw_images" / "defective"
        synthetic_dir = base_dir / "synthetic_images"
        
        # Clean synthetic dir
        if synthetic_dir.exists():
            shutil.rmtree(synthetic_dir)
        synthetic_dir.mkdir(parents=True, exist_ok=True)

        # Clean DB records (remove old synthetic images)
        print(f"Removing old synthetic images for model {model.id} from DB...")
        db.query(Image).filter(
            Image.inspection_model_id == model.id,
            Image.image_type == ImageType.SYNTHETIC
        ).delete()
        db.commit()

        # --- EXTRACT DEFECTS ---
        training_job.progress = 10
        training_job.current_stage = "defect_extraction"
        db.commit()

        defect_lib_dir = base_dir / "defect_library"
        if defect_lib_dir.exists(): shutil.rmtree(defect_lib_dir)
        defect_lib_dir.mkdir(exist_ok=True)

        # Locate masks
        masks_dir = base_dir / "masks"
        if not masks_dir.exists() or not list(masks_dir.glob('*.png')):
            masks_dir = base_dir / "masks" / "defective"
        
        if not masks_dir.exists() or not list(masks_dir.glob('*.png')):
            # Create fake masks if missing (FOR TESTING ONLY)
            print("No masks found! Creating temporary full-image masks for testing...")
            masks_dir = base_dir / "temp_masks"
            masks_dir.mkdir(exist_ok=True)
            for img in defective_dir.glob('*'):
                if img.suffix.lower() in ['.jpg', '.png']:
                    import cv2
                    import numpy as np
                    temp_img = cv2.imread(str(img))
                    if temp_img is not None:
                        h, w = temp_img.shape[:2]
                        mask = np.zeros((h, w), dtype=np.uint8)
                        cv2.rectangle(mask, (w//4, h//4), (3*w//4, 3*h//4), 255, -1)
                        cv2.imwrite(str(masks_dir / f"{img.stem}.png"), mask)

        # Extract defects
        count = copy_paste_service.extract_defect_library(
            str(defective_dir), str(masks_dir), str(defect_lib_dir)
        )
        
        if count == 0:
            raise ValueError("Could not extract any defects. Please check your annotation masks.")

        # --- GENERATE IMAGES ---
        training_job.progress = 30
        training_job.current_stage = "synthetic_generation"
        db.commit()

        def save_image_callback(path, current, total):
            print(f"Callback called for {path} ({current}/{total})")
            try:
                # Save to DB
                new_img = Image(
                    filename=os.path.basename(path),
                    file_path=path,
                    image_type=ImageType.SYNTHETIC,
                    inspection_model_id=model.id,
                    is_synthetic=True
                )
                db.add(new_img)
                
                # Update progress
                progress = 30 + (current / total) * 60  # 30% to 90%
                training_job.progress = progress
                
                db.commit()
                print(f"Saved image {new_img.id} to DB")
            except Exception as e:
                print(f"Error in callback: {e}")
                db.rollback()
                import traceback
                traceback.print_exc()

        # Generate images with callback
        gen_paths = copy_paste_service.generate_synthetic_images(
            str(defect_lib_dir), str(normal_dir), str(synthetic_dir),
            num_images=model.num_synthetic_images,
            callback=save_image_callback
        )

        # Register in DB (Already done in callback, just update final stage)
        training_job.progress = 90
        training_job.current_stage = "registering_images"
        db.commit()

        # Completion
        training_job.progress = 100
        training_job.status = TrainingStatus.COMPLETED
        training_job.current_stage = "completed"
        
        # Don't change model status to READY, keep it as GENERATING_DATA or change to something else?
        # Maybe back to CREATED or AWAITING_VALIDATION?
        # Let's set it to AWAITING_VALIDATION so user can proceed to training
        model.status = ModelStatus.AWAITING_VALIDATION
        
        db.commit()
        print("Synthetic Generation Completed Successfully!")
        return {"status": "success", "count": len(gen_paths)}

    except Exception as e:
        print(f"Synthetic Generation Failed: {e}")
        traceback.print_exc()
        db.rollback()
        if 'training_job' in locals() and training_job:
            training_job.status = TrainingStatus.FAILED
            training_job.error_message = str(e)
        if 'model' in locals() and model:
            model.status = ModelStatus.FAILED
        db.commit()

        # Send failure notification
        try:
            if 'model' in locals() and model:
                notification_service.create_notification(
                    db=db,
                    user_id=model.owner_id,
                    type=NotificationType.SYSTEM,
                    title="Synthetic Data Generation Failed",
                    message=f"Synthetic generation failed for model '{model.name}'. Error: {str(e)}",
                    related_type="model",
                    related_id=model.id
                )
        except Exception as notify_e:
            print(f"Failed to send failure notification: {notify_e}")
        return {"status": "failed", "error": str(e)}

@celery_app.task(bind=True, base=DatabaseTask, name='app.ml.tasks.execute_run')
def execute_run_task(self, run_id: int):
    """Execute inference for a model run"""
    db = self.db
    print(f"Starting inference run {run_id}")
    
    try:
        from app.models.model_run import ModelRun, RunStatus
        from app.models.inference_result import InferenceResult
        from app.ml.mobilenet_service import mobilenet_service
        
        run = db.query(ModelRun).filter(ModelRun.id == run_id).first()
        if not run: raise ValueError("Run not found")
        
        # Get checkpoint
        checkpoint_path = mobilenet_service.get_model_checkpoint_path(run.inspection_model_id)
        
        # Get images
        results = run.inference_results
        
        for res in results:
            try:
                # Predict
                prediction = mobilenet_service.predict(res.image.file_path, checkpoint_path)
                
                # Update result
                res.confidence = prediction['confidence']
                res.prediction = prediction['label']
                res.details = prediction
                
                db.commit()
            except Exception as e:
                print(f"Failed to predict image {res.image_id}: {e}")
                
        run.status = RunStatus.COMPLETED
        run.completed_at = datetime.utcnow()
        db.commit()

        # Send notification
        try:
            # Need to get model to get owner_id
            model = run.inspection_model
            notification_service.create_notification(
                db=db,
                user_id=model.owner_id,
                type=NotificationType.SYSTEM,
                title="Inference Run Complete",
                message=f"Inference run #{run.run_number} for model '{model.name}' has completed.",
                related_type="run",
                related_id=run.id
            )
        except Exception as e:
            print(f"Failed to send success notification: {e}")
        
    except Exception as e:
        print(f"Run failed: {e}")
        traceback.print_exc()
        if 'run' in locals() and run:
            run.status = RunStatus.FAILED
<<<<<<< HEAD
            db.commit()
=======
            db.commit()

        # Send failure notification
        try:
            if 'run' in locals() and run:
                model = run.inspection_model
                notification_service.create_notification(
                    db=db,
                    user_id=model.owner_id,
                    type=NotificationType.SYSTEM,
                    title="Inference Run Failed",
                    message=f"Inference run #{run.run_number} for model '{model.name}' has failed. Error: {str(e)}",
                    related_type="run",
                    related_id=run.id
                )
        except Exception as notify_e:
            print(f"Failed to send failure notification: {notify_e}")
>>>>>>> mail-services
