"""
Celery tasks for ML model training
Uses Copy-Paste augmentation + MobileNetV3 for efficiency
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
from app.services import notification_service
from pathlib import Path
import os
import traceback


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
    """
    Background task to train defect detection model using Copy-Paste augmentation and MobileNetV3

    Args:
        training_job_id: ID of the training job
    """
    db = self.db

    try:
        # Get training job
        training_job = db.query(TrainingJob).filter(TrainingJob.id == training_job_id).first()
        if not training_job:
            raise ValueError(f"Training job {training_job_id} not found")

        # Get inspection model
        model = db.query(InspectionModel).filter(InspectionModel.id == training_job.model_id).first()
        if not model:
            raise ValueError(f"Inspection model {training_job.model_id} not found")

        # Update status to running
        training_job.status = TrainingStatus.RUNNING
        model.status = ModelStatus.TRAINING
        db.commit()

        # Prepare directories - use absolute path consistent with upload location
        import os
        upload_base = os.path.abspath("uploads")
        base_dir = Path(f"{upload_base}/{model.owner_id}/{model.id}")
        normal_images_dir = base_dir / "raw_images" / "normal"
        defective_images_dir = base_dir / "raw_images" / "defective"
        synthetic_dir = base_dir / "synthetic_images"
        synthetic_dir.mkdir(parents=True, exist_ok=True)

        # CRITICAL: Sanity check - verify normal and defective images are from same class
        print("=" * 60)
        print("SANITY CHECK: Verifying data quality...")
        print("=" * 60)
        try:
            is_valid, message, similarity = sanity_checker.check_similarity(
                normal_dir=str(normal_images_dir),
                defective_dir=str(defective_images_dir),
                threshold=0.4  # Cosine similarity threshold (0.4 = reasonably similar)
            )
            print(message)

            if not is_valid:
                # Sanity check failed - halt training
                training_job.status = TrainingStatus.FAILED
                training_job.error_message = message
                model.status = ModelStatus.FAILED
                db.commit()

                # Notify user
                notification_service.create_notification(
                    db=db,
                    user_id=model.owner_id,
                    notification_type='training_complete',
                    title='Training Failed - Data Quality Issue',
                    message=f'Sanity check failed for model "{model.name}". Normal and defective images appear to be from different object classes.',
                    related_type='model',
                    related_id=model.id
                )

                raise ValueError(message)
        except Exception as sanity_error:
            if "SANITY CHECK FAILED" in str(sanity_error):
                raise  # Re-raise sanity check failures
            else:
                # If sanity check itself fails (e.g., not enough images), warn but continue
                print(f"⚠️  Warning: Sanity check could not complete: {sanity_error}")
                print("   Continuing with training anyway...")

        print("=" * 60)

        # Check if we need to generate synthetic data
        if model.num_synthetic_images > 0:
            # Update progress
            training_job.progress = 10
            training_job.current_stage = "defect_extraction"
            db.commit()

            # Step 1: Extract defect library from annotated images
            print("Extracting defect library using copy-paste augmentation")
            defect_library_dir = base_dir / "defect_library"

            # Try multiple possible mask locations
            possible_mask_dirs = [
                base_dir / "masks" / "defective",  # uploads/{user}/{model}/masks/defective
                base_dir / "masks",  # uploads/{user}/{model}/masks
                base_dir.parent.parent / "masks" / "defective",  # Legacy location
            ]

            masks_dir = None
            for mask_path in possible_mask_dirs:
                if mask_path.exists() and list(mask_path.glob('*.png')):
                    masks_dir = mask_path
                    print(f"✅ Found masks in: {masks_dir}")
                    break

            # CRITICAL: No fallback - fail loudly if masks not found
            if masks_dir is None:
                error_msg = (
                    "❌ CRITICAL ERROR: No annotation masks found!\n"
                    f"   Checked locations:\n"
                    f"   - {possible_mask_dirs[0]}\n"
                    f"   - {possible_mask_dirs[1]}\n"
                    f"   - {possible_mask_dirs[2]}\n\n"
                    "   Copy-paste augmentation REQUIRES masks.\n"
                    "   Please upload annotation masks or set num_synthetic_images=0"
                )
                raise FileNotFoundError(error_msg)

            defect_count = copy_paste_service.extract_defect_library(
                defect_images_dir=str(defective_images_dir),
                masks_dir=str(masks_dir),
                output_dir=str(defect_library_dir)
            )

            # Update progress
            training_job.progress = 20
            training_job.current_stage = "synthetic_generation"
            db.commit()

            # Step 2: Generate synthetic images with copy-paste
            print(f"Generating {model.num_synthetic_images} synthetic images with copy-paste")

            # Use copy-paste with extracted defects
            generated_paths = copy_paste_service.generate_synthetic_images(
                defect_library_dir=str(defect_library_dir),
                background_images_dir=str(normal_images_dir),
                output_dir=str(synthetic_dir),
                num_images=model.num_synthetic_images
            )

            # Save synthetic images to database
            for img_path in generated_paths:
                filename = os.path.basename(img_path)
                db_image = Image(
                    filename=filename,
                    file_path=img_path,
                    image_type=ImageType.SYNTHETIC,
                    inspection_model_id=model.id,
                    is_synthetic=True
                )
                db.add(db_image)

            training_job.progress = 50
            db.commit()

        # CRITICAL: Balance normal images to match defective count (1:1 ratio)
        # This prevents class imbalance when generating many synthetic defectives
        print("=" * 60)
        print("BALANCING NORMAL IMAGES TO MATCH DEFECTIVE COUNT")
        print("=" * 60)

        # Calculate total defective count (real + synthetic)
        num_real_defective = len(list(defective_images_dir.glob('*.jpg')) +
                                  list(defective_images_dir.glob('*.JPG')) +
                                  list(defective_images_dir.glob('*.png')) +
                                  list(defective_images_dir.glob('*.PNG')))
        num_synthetic_defective = model.num_synthetic_images if model.num_synthetic_images > 0 else 0
        total_defective = num_real_defective + num_synthetic_defective

        print(f"Real defective images: {num_real_defective}")
        print(f"Synthetic defective images: {num_synthetic_defective}")
        print(f"Total defective images: {total_defective}")

        # Balance normal images
        training_job.progress = 55
        training_job.current_stage = "normal_balancing"
        db.commit()

        augmented_normal_dir = base_dir / "augmented_normal"
        total_normal = normal_balancer.balance_normal_images(
            normal_images_dir=str(normal_images_dir),
            target_count=total_defective,
            output_dir=str(augmented_normal_dir)
        )

        print(f"✅ Final class distribution: Normal={total_normal}, Defective={total_defective}")
        print(f"   Class ratio: {total_normal}:{total_defective} (1:1 balanced)")
        print("=" * 60)

        # Create combined normal directory (real + augmented)
        combined_normal_dir = base_dir / "combined_normal"
        combined_normal_dir.mkdir(exist_ok=True)

        import shutil
        # Copy real normal images
        for img in normal_images_dir.glob('*'):
            if img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                shutil.copy(img, combined_normal_dir / img.name)

        # Copy augmented normal images
        for img in augmented_normal_dir.glob('*'):
            if img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                shutil.copy(img, combined_normal_dir / img.name)

        print(f"Created combined normal directory with {len(list(combined_normal_dir.glob('*')))} images")

        # Train MobileNetV3 classifier
        training_job.current_stage = "mobilenet_training"
        db.commit()

        # Combine real and synthetic defective images if synthetic data exists
        defective_dir_for_training = defective_images_dir
        if model.num_synthetic_images > 0:
            # Use both real and synthetic
            combined_defective_dir = base_dir / "combined_defective"
            combined_defective_dir.mkdir(exist_ok=True)

            # Create symlinks or copy files
            import shutil
            for img in defective_images_dir.glob('*'):
                shutil.copy(img, combined_defective_dir / img.name)
            for img in synthetic_dir.glob('*'):
                shutil.copy(img, combined_defective_dir / img.name)

            defective_dir_for_training = combined_defective_dir

        # Define progress callback for live updates
        def update_mobilenet_progress(progress: int, stage: str):
            training_job.progress = progress
            training_job.current_stage = stage
            db.commit()
            db.refresh(training_job)

            # Update Celery task state for real-time frontend polling
            try:
                from celery.states import STARTED
                self.update_state(
                    state=STARTED,
                    meta={
                        'status_key': stage,
                        'current_progress': progress,
                        'total_progress': 100,
                        'stage': stage
                    }
                )
            except Exception as e:
                print(f"Failed to update Celery task state: {e}")

        mobilenet_checkpoint = mobilenet_service.get_model_checkpoint_path(model.id)
        print(f"Starting MobileNetV3 training with 30 epochs (lightweight & fast)")
        print(f"Using balanced dataset: {combined_normal_dir} (normal) vs {defective_dir_for_training} (defective)")
        mobilenet_metrics = mobilenet_service.train_classifier(
            normal_images_dir=str(combined_normal_dir),  # Use balanced normal images
            defective_images_dir=str(defective_dir_for_training),
            output_checkpoint=mobilenet_checkpoint,
            epochs=30,  # Good convergence for MobileNet
            batch_size=16,  # Can use larger batch with MobileNet (less memory)
            learning_rate=1e-4,  # Standard for MobileNet fine-tuning
            validation_split=0.2,
            progress_callback=update_mobilenet_progress  # Pass callback for live progress
        )

        # Update final progress
        training_job.progress = 100
        training_job.current_stage = "completed"
        training_job.status = TrainingStatus.COMPLETED
        training_job.metrics = {
            'mobilenet_metrics': mobilenet_metrics,
            'synthetic_count': model.num_synthetic_images if model.num_synthetic_images > 0 else 0
        }

        # Update model status
        model.status = ModelStatus.READY
        accuracy_value = mobilenet_metrics.get('best_val_accuracy', 0.0)
        model.accuracy = accuracy_value

        # Store model paths
        model.vit_model_path = mobilenet_checkpoint  # Store MobileNetV3 checkpoint
        model.gan_model_path = None  # Not used

        db.commit()
        db.refresh(model)  # Refresh to get updated values

        # Send notification to user
        # Convert accuracy to float if it's Decimal/string
        try:
            accuracy_display = float(accuracy_value) if accuracy_value else 0.0
        except:
            accuracy_display = 0.0

        notification_service.create_notification(
            db=db,
            user_id=model.owner_id,
            type='training_complete',
            title='Model Training Complete',
            message=f'Your model "{model.name}" has finished training with {accuracy_display:.2f}% validation accuracy.',
            related_type='model',
            related_id=model.id
        )

        return {
            'status': 'success',
            'training_job_id': training_job_id,
            'model_id': model.id,
            'accuracy': model.accuracy
        }

    except Exception as e:
        # Handle errors
        error_msg = str(e)
        error_trace = traceback.format_exc()

        print(f"Training failed: {error_msg}")
        print(error_trace)

        # Rollback any pending transactions
        try:
            db.rollback()
        except:
            pass

        # Update job status with fresh query
        try:
            training_job = db.query(TrainingJob).filter(TrainingJob.id == training_job_id).first()
            if training_job:
                training_job.status = TrainingStatus.FAILED
                training_job.error_message = error_msg

                # Update model status
                model = db.query(InspectionModel).filter(InspectionModel.id == training_job.model_id).first()
                if model:
                    model.status = ModelStatus.FAILED

                db.commit()
        except Exception as db_error:
            print(f"Failed to update database: {db_error}")
            db.rollback()

            # Send failure notification
            notification_service.create_notification(
                db=db,
                user_id=model.owner_id,
                type='system',
                title='Model Training Failed',
                message=f'Training failed for model "{model.name}": {error_msg}',
                related_type='model',
                related_id=model.id
            )

        return {
            'status': 'failed',
            'error': error_msg
        }


@celery_app.task(bind=True, name='app.ml.tasks.predict_image')
def predict_image_task(self, model_id: int, image_path: str):
    """
    Background task for image prediction using MobileNetV3

    Args:
        model_id: ID of the inspection model
        image_path: Path to image file

    Returns:
        Prediction results
    """
    try:
        # Get model checkpoint
        mobilenet_checkpoint = mobilenet_service.get_model_checkpoint_path(model_id)

        # Make prediction
        result = mobilenet_service.predict(image_path, checkpoint_path=mobilenet_checkpoint)

        return {
            'status': 'success',
            'model_id': model_id,
            'image_path': image_path,
            'result': result
        }

    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e),
            'model_id': model_id,
            'image_path': image_path
        }


@celery_app.task(bind=True, name='app.ml.tasks.predict_batch')
def predict_batch_task(self, model_id: int, image_paths: list):
    """
    Background task for batch prediction using MobileNetV3

    Args:
        model_id: ID of the inspection model
        image_paths: List of image file paths

    Returns:
        Batch prediction results
    """
    try:
        # Get model checkpoint
        mobilenet_checkpoint = mobilenet_service.get_model_checkpoint_path(model_id)

        # Make batch prediction
        results = mobilenet_service.predict_batch(image_paths, checkpoint_path=mobilenet_checkpoint)

        return {
            'status': 'success',
            'model_id': model_id,
            'results': results
        }

    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e),
            'model_id': model_id
        }
