from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)

    # Target user (username or email)
    target_identifier = Column(String, nullable=False, index=True)  # username or email
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Set when user found

    # Permission to be assigned when invitation is accepted
    permission = Column(String, nullable=False)  # 'inspect_only' or 'inspect_and_train'

    # Company association
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    # Invitation status
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)

    # Tracking
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
    target_user = relationship("User", foreign_keys=[target_user_id])
