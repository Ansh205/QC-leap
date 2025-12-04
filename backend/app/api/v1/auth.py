from datetime import timedelta
import random
import string
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token, LoginResponse, OTPVerification
from app.services.user_service import user_service
from app.services.mail_service import send_message
from app.core.cache import cache

router = APIRouter()


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (optionally with company)"""
    # Sanitize input: Convert empty strings to None for optional fields
    if user_in.full_name == "":
        user_in.full_name = None
    
    if user_in.company_data:
        if user_in.company_data.description == "":
            user_in.company_data.description = None
        if user_in.company_data.industry == "":
            user_in.company_data.industry = None

    # Check if email already exists
    if user_service.get_by_email(db, email=user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    if user_service.get_by_username(db, username=user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Validate company data if user is company admin
    if user_in.is_company_admin and not user_in.company_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company data required when creating company admin account"
        )

    # Create new user (with company if applicable) - INACTIVE initially
    user = user_service.create(db=db, user_in=user_in, is_active=False)
    
    # Generate OTP
    otp = "".join(random.choices(string.digits, k=6))
    temp_token = str(uuid.uuid4())
    
    # Store OTP in Redis (5 minutes expiry)
    otp_data = {
        "user_id": user.id,
        "otp": otp
    }
    cache.set(f"otp:{temp_token}", otp_data, ttl=300)
    
    # Send OTP via email
    if user.email:
        send_message(
            subject="Your Registration OTP for QC-Leap",
            message=f"Your OTP is: <b>{otp}</b>. It expires in 5 minutes.",
            to_email=user.email
        )
    
    return {
        "require_otp": True,
        "temp_token": temp_token,
        "message": "OTP sent to your email"
    }


@router.post("/login", response_model=LoginResponse)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login and get access token (accepts username OR email)"""
    user = user_service.authenticate(
        db=db,
        username_or_email=form_data.username,  # Can be username or email
        password=form_data.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Generate access token directly
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "require_otp": False
    }


@router.post("/verify-otp", response_model=Token)
def verify_otp(
    otp_in: OTPVerification,
    db: Session = Depends(get_db)
):
    """Verify OTP and issue access token"""
    # Get OTP data from Redis
    otp_data = cache.get(f"otp:{otp_in.temp_token}")
    
    if not otp_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired session"
        )
        
    if otp_data["otp"] != otp_in.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
        
    # Get user
    user_id = otp_data["user_id"]
    user = user_service.get_by_id(db, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Activate user if not active (Registration flow)
    if not user.is_active:
        user.is_active = True
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires
    )
    
    # Clear OTP from cache
    cache.delete(f"otp:{otp_in.temp_token}")
    
    return {"access_token": access_token, "token_type": "bearer"}
