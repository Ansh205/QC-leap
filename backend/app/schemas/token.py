from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    require_otp: bool = False
    temp_token: Optional[str] = None  # Temporary token to identify the user for OTP verification
    message: Optional[str] = None


class OTPVerification(BaseModel):
    temp_token: str
    otp: str


class TokenPayload(BaseModel):
    sub: Optional[int] = None
