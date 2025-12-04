from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    COMPANY_ADMIN = "COMPANY_ADMIN"  # Can invite users, manage company
    MEMBER = "MEMBER"  # Regular member


class UserPermission(str, enum.Enum):
    INSPECT_ONLY = "INSPECT_ONLY"  # Can only run inspections
    INSPECT_AND_TRAIN = "INSPECT_AND_TRAIN"  # Can inspect and train models


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Company association
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.MEMBER, nullable=False)
    permission = Column(SQLEnum(UserPermission), default=UserPermission.INSPECT_AND_TRAIN, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="users")
    inspection_models = relationship("InspectionModel", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
