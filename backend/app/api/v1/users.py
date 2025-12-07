from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, DeleteAccount

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    """Get current user"""
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    from app.services.user_service import user_service

    user = user_service.get_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Users can only view their own profile unless they're superuser
    if user.id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return user


@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user profile"""
    from app.services.user_service import user_service

    user = user_service.update(db, user=current_user, user_in=user_in, current_password=user_in.current_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password or update failed"
        )
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_me(
    delete_in: DeleteAccount,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete current user account"""
    from app.services.user_service import user_service

    success = user_service.delete(db, user=current_user, current_password=delete_in.current_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    return None
