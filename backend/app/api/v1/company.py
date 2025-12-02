from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User, UserPermission
from app.models.company import Company
from app.models.notification import NotificationType
from app.schemas.company import CompanyResponse, CompanyUpdate
from app.schemas.user import UserResponse
from app.core.security import verify_password
from app.services.notification_service import notification_service
from pydantic import BaseModel

router = APIRouter()


@router.get("/me", response_model=CompanyResponse)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's company"""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not associated with a company"
        )

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    return company


@router.put("/me", response_model=CompanyResponse)
def update_my_company(
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_password: str = ""
):
    """Update current user's company (company admin only)"""
    # Check if user is company admin
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admins can update company information"
        )

    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    # Verify current password if provided
    if current_password and not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Get company
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Update company fields
    update_data = company_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


@router.get("/members", response_model=List[UserResponse])
def get_company_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members of the current user's company (company admin only)"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admins can view members"
        )

    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    members = db.query(User).filter(User.company_id == current_user.company_id).all()
    return members


class UpdateUserPermissionRequest(BaseModel):
    permission: str
    current_password: str


@router.put("/members/{user_id}/permission")
def update_member_permission(
    user_id: int,
    request: UpdateUserPermissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a company member's permission (company admin only)"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admins can update member permissions"
        )

    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Get the member to update
    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if member is in the same company
    if member.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update member from another company"
        )

    # Cannot update company admin's permission
    if member.role == "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update company admin's permission"
        )

    # Validate and update permission
    try:
        old_permission = member.permission
        new_permission = UserPermission(request.permission)
        member.permission = new_permission
        db.commit()
        db.refresh(member)

        # Send notification to the member
        permission_labels = {
            UserPermission.INSPECT_ONLY: "Inspect Only",
            UserPermission.INSPECT_AND_TRAIN: "Inspect & Train"
        }
        notification_service.create_notification(
            db=db,
            user_id=member.id,
            type=NotificationType.SYSTEM,
            title="Permission Updated",
            message=f"Your permission has been changed from {permission_labels.get(old_permission, old_permission)} to {permission_labels.get(new_permission, new_permission)} by {current_user.username}."
        )

        return {"message": "Permission updated successfully", "user": member}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid permission value"
        )


class RemoveUserRequest(BaseModel):
    current_password: str


@router.delete("/members/{user_id}")
def remove_member_from_company(
    user_id: int,
    request: RemoveUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a member from the company (company admin only)"""
    if current_user.role != "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admins can remove members"
        )

    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Get the member to remove
    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if member is in the same company
    if member.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove member from another company"
        )

    # Cannot remove company admin
    if member.role == "COMPANY_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove company admin"
        )

    # Cannot remove yourself
    if member.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the company"
        )

    # Store company name before removing
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company_name = company.name if company else "the company"

    # Remove user from company
    member.company_id = None
    member.role = "MEMBER"
    db.commit()

    # Send notification to the removed member
    notification_service.create_notification(
        db=db,
        user_id=member.id,
        type=NotificationType.SYSTEM,
        title="Removed from Company",
        message=f"You have been removed from {company_name} by {current_user.username}. You no longer have access to company resources."
    )

    return {"message": f"User {member.username} removed from company successfully"}
