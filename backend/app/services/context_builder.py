"""
Dynamic Context Builder for LLM Chatbot
Gathers real-time information from the database to provide personalized assistance
"""
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.inspection_model import InspectionModel, ModelStatus
from app.models.training_job import TrainingJob, TrainingStatus
from app.models.image import Image, ImageType
from datetime import datetime, timedelta
from typing import Dict, Any


def build_user_context(db: Session, user: User) -> str:
    """
    Build comprehensive context about the user and their data

    Args:
        db: Database session
        user: Current user object

    Returns:
        Formatted string with user context for LLM
    """
    context_parts = []

    # ============================================================
    # 1. USER INFORMATION
    # ============================================================
    context_parts.append("## USER INFORMATION")
    context_parts.append(f"- Name: {user.full_name or user.username}")
    context_parts.append(f"- Email: {user.email}")
    context_parts.append(f"- Role: {user.role}")
    context_parts.append(f"- Permission Level: {user.permission}")

    if user.company:
        context_parts.append(f"- Company: {user.company.name}")
        if user.company.industry:
            context_parts.append(f"- Industry: {user.company.industry}")

    context_parts.append("")  # Blank line

    # ============================================================
    # 2. MODELS OVERVIEW
    # ============================================================
    models = db.query(InspectionModel).filter(
        InspectionModel.owner_id == user.id
    ).all()

    context_parts.append("## USER'S MODELS")
    context_parts.append(f"- Total Models: {len(models)}")

    if models:
        # Count by status
        status_counts = {}
        for model in models:
            status = model.status.value if hasattr(model.status, 'value') else str(model.status)
            status_counts[status] = status_counts.get(status, 0) + 1

        context_parts.append("- Models by Status:")
        for status, count in status_counts.items():
            context_parts.append(f"  * {status}: {count}")

        # List recent models
        recent_models = sorted(models, key=lambda m: m.created_at, reverse=True)[:5]
        context_parts.append("\n- Recent Models:")
        for i, model in enumerate(recent_models, 1):
            status_str = model.status.value if hasattr(model.status, 'value') else str(model.status)
            context_parts.append(f"  {i}. '{model.name}' (ID: {model.id})")
            context_parts.append(f"     - Status: {status_str}")
            context_parts.append(f"     - Created: {model.created_at.strftime('%Y-%m-%d %H:%M')}")

            if model.accuracy:
                context_parts.append(f"     - Accuracy: {float(model.accuracy):.2%}")

            if model.num_synthetic_images:
                context_parts.append(f"     - Synthetic Images: {model.num_synthetic_images}")
    else:
        context_parts.append("- No models created yet")

    context_parts.append("")

    # ============================================================
    # 3. TRAINING STATUS
    # ============================================================
    context_parts.append("## TRAINING STATUS")

    # Get recent training jobs
    recent_jobs = db.query(TrainingJob).join(
        InspectionModel, TrainingJob.model_id == InspectionModel.id
    ).filter(
        InspectionModel.owner_id == user.id
    ).order_by(TrainingJob.created_at.desc()).limit(5).all()

    if recent_jobs:
        # Check for active training
        active_training = [j for j in recent_jobs if j.status == TrainingStatus.RUNNING]

        if active_training:
            context_parts.append("- ACTIVE TRAINING IN PROGRESS:")
            for job in active_training:
                model_name = job.inspection_model.name if job.inspection_model else "Unknown"
                context_parts.append(f"  * Model '{model_name}' (ID: {job.model_id})")
                context_parts.append(f"    - Progress: {job.progress}%")
                if job.current_stage:
                    context_parts.append(f"    - Stage: {job.current_stage}")
                if job.started_at:
                    elapsed = datetime.utcnow() - job.started_at
                    context_parts.append(f"    - Running for: {elapsed.seconds // 60} minutes")
        else:
            context_parts.append("- No active training jobs")

        # Recent completed/failed trainings
        recent_completed = [j for j in recent_jobs if j.status in [TrainingStatus.COMPLETED, TrainingStatus.FAILED]][:3]
        if recent_completed:
            context_parts.append("\n- Recent Training History:")
            for job in recent_completed:
                model_name = job.inspection_model.name if job.inspection_model else "Unknown"
                status_str = job.status.value if hasattr(job.status, 'value') else str(job.status)
                context_parts.append(f"  * Model '{model_name}': {status_str}")

                if job.status == TrainingStatus.COMPLETED and job.metrics:
                    metrics = job.metrics
                    if isinstance(metrics, dict):
                        mobilenet_metrics = metrics.get('mobilenet_metrics', {})
                        if mobilenet_metrics.get('best_val_accuracy'):
                            context_parts.append(f"    - Best Accuracy: {float(mobilenet_metrics['best_val_accuracy']):.2%}")

                if job.status == TrainingStatus.FAILED and job.error_message:
                    # Show first 100 chars of error
                    error_preview = job.error_message[:100] + "..." if len(job.error_message) > 100 else job.error_message
                    context_parts.append(f"    - Error: {error_preview}")
    else:
        context_parts.append("- No training history yet")

    context_parts.append("")

    # ============================================================
    # 4. IMAGE STATISTICS
    # ============================================================
    context_parts.append("## IMAGE STATISTICS")

    # Get image counts across all user's models
    all_images = db.query(Image).join(
        InspectionModel, Image.inspection_model_id == InspectionModel.id
    ).filter(
        InspectionModel.owner_id == user.id
    ).all()

    if all_images:
        normal_count = len([i for i in all_images if i.image_type == ImageType.REAL_NORMAL])
        defective_count = len([i for i in all_images if i.image_type == ImageType.REAL_DEFECTIVE])
        synthetic_count = len([i for i in all_images if i.image_type == ImageType.SYNTHETIC])

        context_parts.append(f"- Total Images Uploaded: {len(all_images)}")
        context_parts.append(f"  * Normal Images: {normal_count}")
        context_parts.append(f"  * Defective Images: {defective_count}")
        context_parts.append(f"  * Synthetic Images: {synthetic_count}")

        # Images uploaded in last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_uploads = [i for i in all_images if i.created_at >= week_ago]
        if recent_uploads:
            context_parts.append(f"- Uploaded in Last 7 Days: {len(recent_uploads)}")
    else:
        context_parts.append("- No images uploaded yet")

    context_parts.append("")

    # ============================================================
    # 5. PERFORMANCE SUMMARY
    # ============================================================
    context_parts.append("## PERFORMANCE SUMMARY")

    # Get best performing model
    ready_models = [m for m in models if m.status == ModelStatus.READY and m.accuracy is not None]

    if ready_models:
        best_model = max(ready_models, key=lambda m: float(m.accuracy) if m.accuracy else 0)
        context_parts.append(f"- Best Performing Model: '{best_model.name}'")
        context_parts.append(f"  * Accuracy: {float(best_model.accuracy):.2%}")

        if best_model.precision:
            context_parts.append(f"  * Precision: {float(best_model.precision):.2%}")
        if best_model.recall:
            context_parts.append(f"  * Recall: {float(best_model.recall):.2%}")
        if best_model.f1_score:
            context_parts.append(f"  * F1 Score: {float(best_model.f1_score):.2%}")

        # Average accuracy across all ready models
        avg_accuracy = sum(float(m.accuracy) for m in ready_models) / len(ready_models)
        context_parts.append(f"\n- Average Accuracy Across All Models: {avg_accuracy:.2%}")
    else:
        context_parts.append("- No trained models available yet")

    context_parts.append("")

    # ============================================================
    # 6. SYSTEM RECOMMENDATIONS
    # ============================================================
    context_parts.append("## SYSTEM RECOMMENDATIONS")

    recommendations = []

    # Check if user has uploaded data but not trained
    if models:
        models_with_images = []
        for model in models:
            image_count = db.query(Image).filter(
                Image.inspection_model_id == model.id
            ).count()
            if image_count > 0 and model.status == ModelStatus.CREATED:
                models_with_images.append(model.name)

        if models_with_images:
            recommendations.append(
                f"- You have {len(models_with_images)} model(s) with uploaded images but not yet trained. "
                f"Consider starting training to begin defect detection."
            )

    # Check for failed trainings
    failed_jobs = [j for j in recent_jobs if j.status == TrainingStatus.FAILED]
    if failed_jobs:
        recommendations.append(
            f"- You have {len(failed_jobs)} failed training job(s). "
            f"Review the error messages and fix data quality issues before retrying."
        )

    # Check for low performing models
    low_performers = [m for m in ready_models if m.accuracy and float(m.accuracy) < 0.7]
    if low_performers:
        recommendations.append(
            f"- {len(low_performers)} model(s) have accuracy below 70%. "
            f"Consider uploading more diverse training data or adjusting synthetic image count."
        )

    if not models:
        recommendations.append(
            "- Get started by creating your first inspection model! "
            "Upload normal and defective images to train a defect detection model."
        )

    if recommendations:
        for rec in recommendations:
            context_parts.append(rec)
    else:
        context_parts.append("- All systems operating optimally!")

    context_parts.append("")
    context_parts.append("=" * 60)

    return "\n".join(context_parts)


def build_full_context(db: Session, user: User, knowledge_base: str) -> str:
    """
    Combine static knowledge base with dynamic user context

    Args:
        db: Database session
        user: Current user
        knowledge_base: Static knowledge base content

    Returns:
        Complete context string for LLM
    """
    user_context = build_user_context(db, user)

    full_context = f"""
{user_context}

## STATIC KNOWLEDGE BASE
{knowledge_base}
"""

    return full_context
