from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.models.invitation import Invitation, InvitationStatus
from app.models.user import User, UserRole, UserPermission
from app.models.notification import NotificationType
from app.schemas.invitation import InvitationCreate
from app.services.notification_service import notification_service


class InvitationService:
    def create_invitation(
        self,
        db: Session,
        invitation_in: InvitationCreate,
        company_id: int,
        invited_by_user_id: int
    ) -> Invitation:
        """Create a new invitation and send notification"""
        # Find target user by username or email
        target_user = db.query(User).filter(
            (User.username == invitation_in.target_identifier) |
            (User.email == invitation_in.target_identifier)
        ).first()

        if not target_user:
            raise ValueError(f"User not found: {invitation_in.target_identifier}")

        # Check if user already belongs to a company
        if target_user.company_id:
            raise ValueError("User already belongs to a company")

        # Check if there's already a pending invitation for this user
        existing_invitation = db.query(Invitation).filter(
            Invitation.target_user_id == target_user.id,
            Invitation.company_id == company_id,
            Invitation.status == InvitationStatus.PENDING
        ).first()

        if existing_invitation:
            raise ValueError("Pending invitation already exists for this user")

        # Get inviter and company details for notification
        inviter = db.query(User).filter(User.id == invited_by_user_id).first()
        company = inviter.company if inviter else None

        # Create invitation with expiry (30 days from now)
        invitation = Invitation(
            target_identifier=invitation_in.target_identifier,
            target_user_id=target_user.id,
            permission=invitation_in.permission,
            company_id=company_id,
            invited_by=invited_by_user_id,
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )

        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        # Create notification for target user
        if company:
            notification_service.create_invitation_notification(
                db=db,
                user_id=target_user.id,
                invitation_id=invitation.id,
                company_name=company.name,
                inviter_name=inviter.full_name or inviter.username
            )

        return invitation

    def get_invitations_by_company(
        self,
        db: Session,
        company_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Invitation]:
        """Get all invitations for a company"""
        return db.query(Invitation).filter(
            Invitation.company_id == company_id
        ).offset(skip).limit(limit).all()

    def get_invitation_by_id(
        self,
        db: Session,
        invitation_id: int
    ) -> Optional[Invitation]:
        """Get invitation by ID"""
        return db.query(Invitation).filter(Invitation.id == invitation_id).first()

    def resend_invitation(
        self,
        db: Session,
        invitation_id: int
    ) -> Invitation:
        """Resend an invitation (extend expiry and create new notification)"""
        invitation = self.get_invitation_by_id(db, invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Can only resend pending invitations")

        # Extend expiry by 30 days from now
        invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        db.commit()
        db.refresh(invitation)

        # Create new notification
        if invitation.target_user_id:
            inviter = db.query(User).filter(User.id == invitation.invited_by).first()
            company = inviter.company if inviter else None

            if company:
                notification_service.create_invitation_notification(
                    db=db,
                    user_id=invitation.target_user_id,
                    invitation_id=invitation.id,
                    company_name=company.name,
                    inviter_name=inviter.full_name or inviter.username
                )

        return invitation

    def revoke_invitation(
        self,
        db: Session,
        invitation_id: int
    ) -> Invitation:
        """Revoke an invitation"""
        invitation = self.get_invitation_by_id(db, invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Can only revoke pending invitations")

        invitation.status = InvitationStatus.REVOKED
        db.commit()
        db.refresh(invitation)
        return invitation

    def delete_invitation(
        self,
        db: Session,
        invitation_id: int
    ) -> bool:
        """Delete an invitation"""
        invitation = self.get_invitation_by_id(db, invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        db.delete(invitation)
        db.commit()
        return True

    def accept_invitation(
        self,
        db: Session,
        invitation_id: int,
        user_id: int
    ) -> User:
        """Accept an invitation and join the company"""
        invitation = self.get_invitation_by_id(db, invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        # Verify the invitation is for this user
        if invitation.target_user_id != user_id:
            raise ValueError("Invitation is not for this user")

        # Check status
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Invitation is not pending")

        # Check if expired
        if invitation.expires_at and datetime.now(timezone.utc) > invitation.expires_at:
            invitation.status = InvitationStatus.EXPIRED
            db.commit()
            raise ValueError("Invitation has expired")

        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Check if user already has a company
        if user.company_id:
            raise ValueError("User already belongs to a company")

        # Update user
        user.company_id = invitation.company_id
        user.role = UserRole.MEMBER
        user.permission = UserPermission(invitation.permission)

        # Update invitation
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(user)
        return user

    def decline_invitation(
        self,
        db: Session,
        invitation_id: int,
        user_id: int
    ) -> Invitation:
        """Decline an invitation"""
        invitation = self.get_invitation_by_id(db, invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        # Verify the invitation is for this user
        if invitation.target_user_id != user_id:
            raise ValueError("Invitation is not for this user")

        # Check status
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Invitation is not pending")

        # Update invitation
        invitation.status = InvitationStatus.DECLINED
        invitation.declined_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(invitation)
        return invitation


invitation_service = InvitationService()
