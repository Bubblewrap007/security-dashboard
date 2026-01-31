import logging
from datetime import datetime, timedelta
import os
import secrets
from ..repositories.users import UserRepository
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user import UserCreate
from typing import Optional

logger = logging.getLogger("app.auth")

class AuthService:
    def __init__(self, user_repo: Optional[UserRepository] = None):
        self.user_repo = user_repo or UserRepository()

    async def register(self, payload: UserCreate):
        existing = await self.user_repo.get_by_username(payload.username)
        if existing:
            raise ValueError("username already exists")
        hashed = get_password_hash(payload.password)
        user = {
            "username": payload.username,
            "email": payload.email,
            "hashed_password": hashed,
        }
        return await self.user_repo.create_user(user)

    async def authenticate(self, identifier: str, password: str):
        # Try username first
        user = await self.user_repo.get_by_username(identifier)
        if not user:
            # Try email if not found by username
            user = await self.user_repo.get_by_email(identifier)
        logger.debug("authenticate: user lookup result=%s", user)
        if not user:
            logger.debug("authenticate: user not found")
            return {"status": "invalid"}

        lockout_until = getattr(user, "lockout_until", None)
        if lockout_until and lockout_until > datetime.utcnow():
            logger.info("authenticate: user locked out until %s", lockout_until)
            return {"status": "locked", "user": user, "lockout_until": lockout_until}

        ok = verify_password(password, user.hashed_password)
        logger.debug("authenticate: verify result=%s", ok)
        if not ok:
            max_attempts = int(os.getenv("MAX_LOGIN_ATTEMPTS", "3"))
            lockout_minutes = int(os.getenv("LOCKOUT_MINUTES", "15"))
            attempts = await self.user_repo.increment_failed_login(user.id)
            if attempts >= max_attempts:
                lockout_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
                unlock_token = secrets.token_urlsafe(32)
                await self.user_repo.set_lockout(user.id, lockout_until, unlock_token)
                if user.email:
                    try:
                        from ..services.email_service import EmailService
                        await EmailService().send_login_lockout_email(user.email, unlock_token, lockout_until)
                    except Exception as e:
                        logger.warning("Failed to send lockout email: %s", str(e))
                return {"status": "locked", "user": user, "lockout_until": lockout_until}
            return {"status": "invalid"}

        # successful login
        await self.user_repo.clear_failed_logins(user.id)
        await self.user_repo.set_last_login(user.id)
        token = create_access_token(subject=str(user.id))
        return {"status": "ok", "access_token": token, "user": user}
