from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr]
    password: str

class LoginRequest(BaseModel):
    identifier: str  # username or email
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserOut(BaseModel):
    id: Optional[str]
    username: str
    email: Optional[str]
    is_active: bool
    is_superuser: bool
    mfa_enabled: bool = False
    mfa_method: Optional[str] = None
    email_verified: bool = False
    last_login: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
