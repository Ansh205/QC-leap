from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.invitation import InvitationCreate, InvitationResponse
from app.schemas.user import UserResponse
from app.services.invitation_service import invitation_service
from app.services.mail_service import send_invitation_email
from app.core.security import verify_password

router = APIRouter()


@router.post("/", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    invitation_in: InvitationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new invitation (company admin only) - requires admin password"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company admins can send invitations")

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not associated with a company")

    if not verify_password(invitation_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    invitation_in.permission = invitation_in.permission.upper()

    if invitation_in.permission not in ["INSPECT_ONLY", "INSPECT_AND_TRAIN"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid permission")

    try:
        invitation = invitation_service.create_invitation(db=db, invitation_in=invitation_in, company_id=current_user.company_id, invited_by_user_id=current_user.id)
        
        if invitation.target_user and invitation.target_user.email:
            background_tasks.add_task(
                send_invitation_email,
                to_email=invitation.target_user.email,
                company_name=current_user.company.name,
                inviter_name=current_user.full_name or current_user.username
            )
            
        return invitation
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[InvitationResponse])
def list_invitations(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), skip: int = 0, limit: int = 100):
    """Get all invitations for current user's company"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company admins can view invitations")
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not associated with a company")
    return invitation_service.get_invitations_by_company(db=db, company_id=current_user.company_id, skip=skip, limit=limit)


@router.post("/{invitation_id}/resend", response_model=InvitationResponse)
def resend_invitation(invitation_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Resend an invitation"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company admins can resend invitations")

    invitation = invitation_service.get_invitation_by_id(db, invitation_id)
    if not invitation or invitation.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    try:
        invitation = invitation_service.resend_invitation(db=db, invitation_id=invitation_id)
        
        # Send invitation email
        if invitation.target_user and invitation.target_user.email:
            background_tasks.add_task(
                send_invitation_email,
                to_email=invitation.target_user.email,
                company_name=current_user.company.name,
                inviter_name=current_user.full_name or current_user.username
            )
            
        return invitation
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invitation_id}/revoke", response_model=InvitationResponse)
def revoke_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Revoke an invitation"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company admins can revoke invitations")

    invitation = invitation_service.get_invitation_by_id(db, invitation_id)
    if not invitation or invitation.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    try:
        return invitation_service.revoke_invitation(db=db, invitation_id=invitation_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Delete an invitation"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company admins can delete invitations")

    invitation = invitation_service.get_invitation_by_id(db, invitation_id)
    if not invitation or invitation.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    try:
        invitation_service.delete_invitation(db=db, invitation_id=invitation_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invitation_id}/accept", response_model=UserResponse)
def accept_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Accept an invitation to join a company"""
    try:
        user = invitation_service.accept_invitation(db=db, invitation_id=invitation_id, user_id=current_user.id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invitation_id}/decline", response_model=InvitationResponse)
def decline_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Decline an invitation to join a company"""
    try:
        invitation = invitation_service.decline_invitation(db=db, invitation_id=invitation_id, user_id=current_user.id)
        return invitation
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
