from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.invitation import InvitationStatus


class InvitationCreate(BaseModel):
    target_identifier: str  # username or email
    permission: str  # 'inspect_only' or 'inspect_and_train'
    current_password: str  # Admin password confirmation


class InvitationResponse(BaseModel):
    id: int
    target_identifier: str
    target_user_id: Optional[int] = None
    permission: str
    status: InvitationStatus
    company_id: int
    invited_by: int
    created_at: datetime
    expires_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvitationResend(BaseModel):
    invitation_id: int


class InvitationRevoke(BaseModel):
    invitation_id: int


class InvitationAccept(BaseModel):
    invitation_id: int


class InvitationDecline(BaseModel):
    invitation_id: int
