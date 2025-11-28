from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    title: str
    message: str
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    notification_id: int


class NotificationCreate(BaseModel):
    user_id: int
    type: NotificationType
    title: str
    message: str
    related_type: Optional[str] = None
    related_id: Optional[int] = None
