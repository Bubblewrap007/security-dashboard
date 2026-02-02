# --- Security Questions Setup & Account Recovery ---
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from pydantic import BaseModel
from ...api.v1.deps import get_current_user

# Place these after router definition
# (Removed duplicate router definition here)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class SecurityQuestionSetRequest(BaseModel):
    questions: list  # [{"question": str, "answer": str}]

@router.post("/security-questions/set")
async def set_security_questions(payload: SecurityQuestionSetRequest, current_user=Depends(get_current_user)):
    """Set or update security questions for the current user."""
    await UserRepository().set_security_questions(current_user.id, payload.questions)
    await AuditRepository().create_event(actor_id=str(current_user.id), action="set_security_questions", target_type="user", target_id=str(current_user.id))
    return {"msg": "Security questions updated"}

class RecoveryRequest(BaseModel):
    identifier: str  # username or email
    questions: list  # [{"question": str, "answer": str}]
    backup_code: str = None
    email_code: str = None
    new_password: str

@router.post("/recover-account")
async def recover_account(payload: RecoveryRequest):
    """Recover account by verifying security questions and backup/email code, then reset password."""
    # Find user
    repo = UserRepository()
    user = await repo.get_by_email(payload.identifier) or await repo.get_by_username(payload.identifier)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Verify security questions
    if not await repo.verify_security_answers(user.id, payload.questions):
        raise HTTPException(status_code=401, detail="Security answers incorrect")
    # Verify backup code or email code
    backup_ok = False
    if payload.backup_code:
        # Check backup code
        codes = getattr(user, "mfa_backup_codes", [])
        from ...services.mfa_service import MFAService
        for h in codes:
            if MFAService.verify_backup_code(h, payload.backup_code):
                backup_ok = True
                break
    if payload.email_code:
        # Check email code (reuse get_mfa_code logic)
        code = await repo.get_mfa_code(user.id)
        from ...services.mfa_service import MFAService
        if MFAService.verify_email_code(code, payload.email_code, __import__('datetime').datetime.utcnow()):
            backup_ok = True
    if not backup_ok:
        raise HTTPException(status_code=401, detail="Backup or email code incorrect")
    # Set new password
    from ...core.security import get_password_hash
    new_hash = get_password_hash(payload.new_password)
    await repo.update_password(user.id, new_hash)
    await AuditRepository().create_event(actor_id=str(user.id), action="recover_account", target_type="user", target_id=str(user.id))
    return {"msg": "Account recovered and password reset"}

from ...schemas.user import UserCreate, Token, LoginRequest, ForgotPasswordRequest
from ...services.auth_service import AuthService
from ...repositories.users import UserRepository
from ...core.security import create_access_token, decode_access_token
from datetime import timedelta, datetime
import os

# Cookie/session config (ensure these are defined before use)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
COOKIE_SESSION_ONLY = os.getenv("COOKIE_SESSION_ONLY", "false").lower() == "true"

# Determine test environment at runtime so tests that import modules early still behave correctly


def _is_testing_env():
    import os, sys
    return os.getenv("TESTING", "0") == "1" or "pytest" in sys.modules

def _should_expose_email_links():
    return os.getenv("EMAIL_DEBUG", "0") == "1" or _is_testing_env()


from ...repositories.audit import AuditRepository

@router.post("/register", response_model=dict)
async def register(payload: UserCreate):
    service = AuthService(UserRepository())
    try:
        user = await service.register(payload)
        # audit: new user created
        await AuditRepository().create_event(actor_id=user.id, action="register", target_type="user", target_id=user.id, details={"username": user.username})
        
        # Send email verification if email provided
        verification = None
        if user.email:
            from ...services.email_service import EmailService
            email_service = EmailService()
            verification = await email_service.send_email_verification(user.email)

        response = {"username": user.username, "id": user.id, "email": user.email}
        if _should_expose_email_links() and isinstance(verification, dict):
            response["verification_link"] = verification.get("link")

        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/verify-email")
async def verify_email(request: Request):
    """Verify email address using token from email link"""
    from ...services.email_service import EmailService
    
    body = await request.json()
    token = body.get("token")
    
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token required")
    
    email_service = EmailService()
    success = await email_service.verify_email_token(token)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")
    
    return {"msg": "Email verified successfully"}

@router.post("/resend-verification-email")
async def resend_verification_email(request: Request, current_user = Depends(get_current_user)):
    """Resend verification email to current user"""
    from ...services.email_service import EmailService
    
    try:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        
        if not current_user.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no email address")
        
        if current_user.email_verified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
        
        email_service = EmailService()
        result = await email_service.send_email_verification(current_user.email)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email")
        
        await AuditRepository().create_event(actor_id=str(current_user.id), action="resend_verification_email", target_type="user", target_id=str(current_user.id), details={"email": current_user.email})
        
        response = {"message": "Verification email resent"}
        if _should_expose_email_links() and isinstance(result, dict):
            response["verification_link"] = result.get("link")
        return response
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger('app.auth').error(f"Error resending verification email: {e}")
        return {"message": "Unable to resend verification email"}

@router.post("/login", response_model=dict)
async def login(payload: LoginRequest, response: Response):
    service = AuthService(UserRepository())
    res = await service.authenticate(payload.identifier, payload.password)
    import logging
    logging.getLogger('app.auth').debug('login result: %s', res)
    if not res or res.get("status") == "invalid":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if res.get("status") == "locked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked. Check your email to unlock or wait 15 minutes.")
    user = res.get("user")
    if user and getattr(user, "mfa_enabled", False):
        # MFA required: issue temp token (not session) and return mfa_required
        from secrets import token_urlsafe
        temp_token = token_urlsafe(32)
        # Store temp_token in a temp collection with user_id and expiry (5 min)
        temp_col = UserRepository()._db.get_collection("mfa_login_temp")
        await temp_col.insert_one({
            "user_id": str(user.id),
            "temp_token": temp_token,
            "created_at": datetime.utcnow()
        })
        return {"mfa_required": True, "temp_token": temp_token, "mfa_method": user.mfa_method}
    # No MFA: issue session
    access_token = res["access_token"]
    cookie_secure = COOKIE_SECURE and not _is_testing_env()
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=COOKIE_SAMESITE,
        max_age=None if COOKIE_SESSION_ONLY else ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path='/'
    )
    logging.getLogger('app.auth').debug('cookie set: secure=%s header=%s', cookie_secure, response.headers.get('set-cookie'))
    if user:
        try:
            await UserRepository().clear_failed_logins(str(user.id))
        except Exception:
            pass
        await AuditRepository().create_event(actor_id=str(user.id), action="login", target_type="user", target_id=str(user.id), details={"username": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import BaseModel
class MFAVerifyRequest(BaseModel):
    temp_token: str
    code: str
    method: str
    remember_device: bool = False

@router.post("/login/mfa-verify", response_model=dict)
async def mfa_login_verify(payload: MFAVerifyRequest, response: Response):
    # Look up temp_token
    temp_col = UserRepository()._db.get_collection("mfa_login_temp")
    doc = await temp_col.find_one({"temp_token": payload.temp_token})
    if not doc:
        raise HTTPException(status_code=401, detail="Invalid or expired MFA session")
    user_id = doc["user_id"]
    user = await UserRepository().get_by_id(user_id)
    if not user or not user.mfa_enabled:
        raise HTTPException(status_code=401, detail="MFA not enabled or user not found")
    # Check expiry (5 min)
    if (datetime.utcnow() - doc["created_at"]).total_seconds() > 300:
        await temp_col.delete_one({"temp_token": payload.temp_token})
        raise HTTPException(status_code=401, detail="MFA session expired")
    # Validate code
    from ...services.mfa_service import MFAService
    valid = False
    # Standard MFA methods
    if payload.method == "totp":
        valid = MFAService.verify_totp(user.totp_secret, payload.code)
    elif payload.method == "email":
        code = await UserRepository().get_mfa_code(user_id)
        valid = MFAService.verify_email_code(code, payload.code, doc["created_at"])
    elif payload.method == "sms":
        code = await UserRepository().get_mfa_code(user_id)
        valid = MFAService.verify_phone_code(code, payload.code, doc["created_at"])
    elif payload.method == "backup":
        # Backup code support
        codes = getattr(user, "mfa_backup_codes", [])
        for h in codes:
            if MFAService.verify_backup_code(payload.code, h):
                valid = True
                # Remove used backup code
                codes.remove(h)
                await UserRepository()._col.update_one({"_id": user.id}, {"$set": {"mfa_backup_codes": codes}})
                break
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    # Success: issue session
    # If remember_device is True, set a 30-day expiry, else use default
    from datetime import timedelta
    token_expiry = timedelta(days=30) if payload.remember_device else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=str(user.id), expires_delta=token_expiry)
    cookie_secure = COOKIE_SECURE and not _is_testing_env()
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=COOKIE_SAMESITE,
        max_age=30*24*60*60 if payload.remember_device else (None if COOKIE_SESSION_ONLY else ACCESS_TOKEN_EXPIRE_MINUTES * 60),
        path='/'
    )
    await temp_col.delete_one({"temp_token": payload.temp_token})
    await AuditRepository().create_event(actor_id=str(user.id), action="login_mfa", target_type="user", target_id=str(user.id), details={"username": user.username, "mfa_method": payload.method})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/unlock-account")
async def unlock_account(token: str):
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unlock token required")
    user_repo = UserRepository()
    ok = await user_repo.clear_lockout_by_token(token)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired unlock token")
    return {"message": "Account unlocked. You can sign in now."}

@router.post("/logout")
async def logout(response: Response):
    cookie_secure = COOKIE_SECURE and not _is_testing_env()
    response.delete_cookie(
        "access_token",
        path="/",
        samesite=COOKIE_SAMESITE,
        secure=cookie_secure,
    )
    return {"msg": "logged out"}

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    from ...services.email_service import EmailService
    email_service = EmailService()
    # Always return success to avoid user enumeration
    result = await email_service.send_password_reset_email(payload.email)
    response = {"msg": "If the email exists in our system, password reset instructions have been sent."}
    if _should_expose_email_links() and isinstance(result, dict):
        response["link"] = result.get("link")
    return response

@router.post("/reset-password")
async def reset_password(payload):
    from ...services.email_service import EmailService
    from ...schemas.user import ResetPasswordRequest
    
    # Parse request body manually to get token and new_password
    import json
    body = await payload.body() if hasattr(payload, 'body') else payload
    if isinstance(body, bytes):
        data = json.loads(body)
    else:
        data = body
    
    token = data.get("token")
    new_password = data.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token and new password required")
    
    email_service = EmailService()
    success = await email_service.verify_reset_token(token, new_password)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired reset token")
    
    return {"msg": "Password has been reset successfully"}

from ...schemas.user import UserOut

@router.get("/me", response_model=UserOut)
async def me(current_user = Depends(get_current_user)):
    # return populated user object (UserOut schema)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "mfa_enabled": current_user.mfa_enabled,
        "mfa_method": current_user.mfa_method,
        "email_verified": current_user.email_verified,
        "last_login": current_user.last_login,
        "timezone": getattr(current_user, "timezone", None),
    }

@router.post("/change-password")
async def change_password(request: Request, current_user = Depends(get_current_user)):
    from ...core.security import verify_password, get_password_hash
    body = await request.json()
    old_password = body.get("old_password")
    new_password = body.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old and new password required")
    
    # Verify old password
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    
    # Update password
    user_repo = UserRepository()
    new_hash = get_password_hash(new_password)
    await user_repo.update_password(current_user.id, new_hash)
    
    # Audit log
    await AuditRepository().create_event(actor_id=str(current_user.id), action="change_password", target_type="user", target_id=str(current_user.id), details={"username": current_user.username})
    
    return {"msg": "Password changed successfully"}

@router.post("/update-email")
async def update_email(request: Request, current_user = Depends(get_current_user)):
    body = await request.json()
    new_email = body.get("email")
    
    if not new_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email required")
    
    # Simple email validation
    if "@" not in new_email or "." not in new_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format")
    
    # Update email
    user_repo = UserRepository()
    await user_repo.update_email(current_user.id, new_email)
    
    # Audit log
    await AuditRepository().create_event(actor_id=str(current_user.id), action="update_email", target_type="user", target_id=str(current_user.id), details={"username": current_user.username, "new_email": new_email})
    
    return {"msg": "Email updated successfully"}

@router.post("/update-timezone")
async def update_timezone(request: Request, current_user = Depends(get_current_user)):
    body = await request.json()
    timezone = body.get("timezone")

    if not timezone or not isinstance(timezone, str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Timezone required")

    user_repo = UserRepository()
    await user_repo.update_timezone(current_user.id, timezone)

    await AuditRepository().create_event(
        actor_id=str(current_user.id),
        action="update_timezone",
        target_type="user",
        target_id=str(current_user.id),
        details={"timezone": timezone},
    )

    return {"msg": "Timezone updated successfully"}

@router.post("/delete-account")
async def delete_account(request: Request, response: Response, current_user = Depends(get_current_user)):
    from ...core.security import verify_password
    body = await request.json()
    password = body.get("password")
    
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required to delete account")
    
    # Verify password
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    
    # Audit log before deletion
    await AuditRepository().create_event(
        actor_id=str(current_user.id), 
        action="delete_account", 
        target_type="user", 
        target_id=str(current_user.id), 
        details={"username": current_user.username}
    )
    
    # Delete the user account
    user_repo = UserRepository()
    await user_repo.delete_user(current_user.id)
    
    # Clear session cookie
    response.delete_cookie("access_token", path="/")
    
    return {"msg": "Account deleted successfully"}

@router.post("/mfa/setup-totp")
async def setup_totp_mfa(current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    secret = MFAService.generate_totp_secret()
    uri = MFAService.get_totp_uri(secret, current_user.username)
    return {"secret": secret, "uri": uri, "method": "totp"}

@router.post("/mfa/verify-totp")
async def verify_totp_mfa(request: Request, current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    
    try:
        body = await request.json()
        # Accept both 'code' and 'totp_code' field names for flexibility
        code = body.get("code") or body.get("totp_code")
        secret = body.get("secret")
        
        if not secret or not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Secret and code required")
        
        if not MFAService.verify_totp(secret, code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")
        
        # Enable MFA for user
        user_repo = UserRepository()
        backup_codes = MFAService.generate_backup_codes()
        hashed_codes = [MFAService.hash_backup_code(c) for c in backup_codes]
        
        await user_repo.enable_mfa(current_user.id, "totp", secret, hashed_codes)
        
        await AuditRepository().create_event(actor_id=str(current_user.id), action="enable_mfa", target_type="user", target_id=str(current_user.id), details={"method": "totp"})
        
        return {"message": "MFA verified", "backup_codes": backup_codes}
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger('app.auth').error(f"Error verifying TOTP: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request format")

@router.post("/mfa/setup-email")
async def setup_email_mfa(current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    import secrets
    code = secrets.token_hex(3).upper()
    MFAService.send_email_code(current_user.email, code)
    
    user_repo = UserRepository()
    await user_repo.store_mfa_code(current_user.id, code)
    
    return {"msg": "Verification code sent to email"}

@router.post("/mfa/verify-email")
async def verify_email_mfa(request: Request, current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    body = await request.json()
    code = body.get("code")
    
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code required")
    
    user_repo = UserRepository()
    stored_code = await user_repo.get_mfa_code(current_user.id)
    
    if not stored_code or not MFAService.verify_email_code(stored_code, code, __import__('datetime').datetime.utcnow()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code")
    
    backup_codes = MFAService.generate_backup_codes()
    hashed_codes = [MFAService.hash_backup_code(c) for c in backup_codes]
    
    await user_repo.enable_mfa(current_user.id, "email", None, hashed_codes)
    await user_repo.clear_mfa_code(current_user.id)
    
    await AuditRepository().create_event(actor_id=str(current_user.id), action="enable_mfa", target_type="user", target_id=str(current_user.id), details={"method": "email"})
    
    return {"msg": "MFA enabled", "backup_codes": backup_codes}

@router.post("/mfa/setup-phone")
async def setup_phone_mfa(request: Request, current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    body = await request.json()
    phone = body.get("phone_number")
    
    if not phone or not MFAService.validate_phone_number(phone):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone number")
    
    code = MFAService.generate_phone_code()
    # In production, use Twilio or similar
    import logging
    logging.getLogger('app.mfa').info(f"[DEV MODE] Phone MFA code for {phone}: {code}")
    
    user_repo = UserRepository()
    await user_repo.store_mfa_code(current_user.id, code)
    
    return {"msg": "Verification code sent to phone"}

@router.post("/mfa/verify-phone")
async def verify_phone_mfa(request: Request, current_user = Depends(get_current_user)):
    from ...services.mfa_service import MFAService
    body = await request.json()
    code = body.get("code")
    phone = body.get("phone_number")
    
    if not code or not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code and phone required")
    
    user_repo = UserRepository()
    stored_code = await user_repo.get_mfa_code(current_user.id)
    
    if not stored_code or not MFAService.verify_phone_code(stored_code, code, __import__('datetime').datetime.utcnow()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code")
    
    backup_codes = MFAService.generate_backup_codes()
    hashed_codes = [MFAService.hash_backup_code(c) for c in backup_codes]
    
    await user_repo.enable_mfa(current_user.id, "sms", phone, hashed_codes)
    await user_repo.clear_mfa_code(current_user.id)
    
    await AuditRepository().create_event(actor_id=str(current_user.id), action="enable_mfa", target_type="user", target_id=str(current_user.id), details={"method": "sms", "phone": phone})
    
    return {"msg": "MFA enabled", "backup_codes": backup_codes}

@router.post("/mfa/disable")
async def disable_mfa(current_user = Depends(get_current_user)):
    user_repo = UserRepository()
    await user_repo.disable_mfa(current_user.id)
    
    await AuditRepository().create_event(actor_id=str(current_user.id), action="disable_mfa", target_type="user", target_id=str(current_user.id))
    
    return {"msg": "MFA disabled"}