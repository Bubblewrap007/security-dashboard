from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class UserInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    email: Optional[str]
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    roles: list = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    failed_login_attempts: int = 0
    lockout_until: Optional[datetime] = None
    lockout_token: Optional[str] = None
    mfa_enabled: bool = False
    mfa_method: Optional[str] = None  # 'totp', 'sms', 'email', 'github'
    mfa_verified: bool = False
    totp_secret: Optional[str] = None
    phone_number: Optional[str] = None
    github_username: Optional[str] = None
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
