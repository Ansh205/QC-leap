from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.models.user import User, UserRole, UserPermission
from app.models.company import Company
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password


class UserService:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_by_username_or_email(db: Session, username_or_email: str) -> Optional[User]:
        """Get user by username OR email"""
        return db.query(User).filter(
            or_(User.username == username_or_email, User.email == username_or_email)
        ).first()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create(db: Session, user_in: UserCreate, is_active: bool = True) -> User:
        """Create new user with optional company"""
        company_id = None
        role = UserRole.MEMBER
        permission = UserPermission.INSPECT_AND_TRAIN  # Default for regular signups

        # Create company if user is company admin
        if user_in.is_company_admin and user_in.company_data:
            company = Company(
                name=user_in.company_data.name,
                description=user_in.company_data.description,
                industry=user_in.company_data.industry,
            )
            db.add(company)
            db.flush()  # Get company ID without committing
            company_id = company.id
            role = UserRole.COMPANY_ADMIN
            permission = UserPermission.INSPECT_AND_TRAIN  # Company admins always have full access

        # Create user
        db_user = User(
            email=user_in.email,
            username=user_in.username,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            company_id=company_id,
            role=role,
            permission=permission,
            is_active=is_active,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate(db: Session, username_or_email: str, password: str) -> Optional[User]:
        """Authenticate user with username OR email"""
        user = UserService.get_by_username_or_email(db, username_or_email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user


user_service = UserService()
