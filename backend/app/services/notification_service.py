from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationCreate


from app.services.mail_service import send_message
from app.services.user_service import user_service

class NotificationService:
    def create_notification(
        self,
        db: Session,
        user_id: int,
        type: NotificationType,
        title: str,
        message: str,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Send email notification
        try:
            user = user_service.get_by_id(db, user_id)
            if user and user.email:
                send_message(
                    subject=f"QC-Leap Notification: {title}",
                    message=message,
                    to_email=user.email
                )
        except Exception as e:
            print(f"Failed to send email notification: {e}")

        return notification

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of unread notifications"""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def mark_as_read(self, db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
        """Mark notification as read"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            db.refresh(notification)

        return notification

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        db.commit()
        return count

    def delete_notification(self, db: Session, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if notification:
            db.delete(notification)
            db.commit()
            return True
        return False

    def create_invitation_notification(
        self,
        db: Session,
        user_id: int,
        invitation_id: int,
        company_name: str,
        inviter_name: str
    ) -> Notification:
        """Create an invitation notification"""
        return self.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.INVITATION,
            title="Company Invitation",
            message=f"{inviter_name} invited you to join {company_name}",
            related_type="invitation",
            related_id=invitation_id
        )


notification_service = NotificationService()
