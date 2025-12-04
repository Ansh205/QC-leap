from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserPermission
from app.schemas.company import CompanyResponse


class CompanyCreateData(BaseModel):
    """Company data for new company admin"""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    is_company_admin: bool = False  # If true, creates a company
    company_data: Optional[CompanyCreateData] = None
    # Permission is set automatically: company_admin gets full access, members get assigned by admin


class UserLogin(BaseModel):
    username_or_email: str  # Can be username OR email
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    company_id: Optional[int] = None
    role: UserRole
    permission: UserPermission
    created_at: datetime
    company: Optional[CompanyResponse] = None

    class Config:
        from_attributes = True


class User(UserResponse):
    """Full user schema with all fields"""
    pass
