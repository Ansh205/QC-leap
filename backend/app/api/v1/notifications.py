from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all notifications for current user"""
    notifications = notification_service.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )
    return notifications


@router.get("/unread-count", response_model=dict)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications"""
    count = notification_service.get_unread_count(db=db, user_id=current_user.id)
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    notification = notification_service.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return notification


@router.post("/read-all", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read"""
    count = notification_service.mark_all_as_read(db=db, user_id=current_user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification"""
    success = notification_service.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return None
