import os
import json
import secrets
from datetime import datetime, timedelta
from app.repositories.users import UserRepository
from app.core.security import create_access_token
import logging
import asyncio
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger("app.email")

class EmailService:
    """Email service for sending password reset links and email verification"""
    
    def __init__(self):
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "no-reply@example.com")
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY", "")

    async def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str = ""):
        """Send an email using SendGrid if configured"""
        if not self.sendgrid_api_key:
            logger.warning("SENDGRID_API_KEY not set; skipping email send to %s", to_email)
            return False

        message = Mail(
            from_email=self.from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=text_content or subject,
            html_content=html_content,
        )

        def _send():
            sg = SendGridAPIClient(self.sendgrid_api_key)
            return sg.send(message)

        try:
            await asyncio.to_thread(_send)
            return True
        except Exception as e:
            logger.error("SendGrid send failed: %s", e)
            return False
    
    async def send_email_verification(self, email: str):
        """Generate and send email verification token"""
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        
        if not user:
            logger.info(f"Email verification requested for non-existent email: {email}")
            return False
        
        # Create a verification token
        verification_token = secrets.token_urlsafe(32)
        
        # Store token in user record
        await user_repo._col.update_one(
            {"_id": user.id},
            {"$set": {"email_verification_token": verification_token}}
        )
        
        # Generate verification link
        verify_link = f"{self.frontend_url}/verify-email?token={verification_token}"
        
        # Send verification email (or log if not configured)
        logger.info(f"Email verification link for {email}: {verify_link}")

        await self._send_email(
            to_email=email,
            subject="Verify your Security Dashboard email",
            text_content=f"Verify your email: {verify_link}",
            html_content=(
                f"<p>Please verify your email address by clicking the link below:</p>"
                f"<p><a href=\"{verify_link}\">Verify Email</a></p>"
            ),
        )
        
        # For demo purposes, return the token
        return {
            "email": email,
            "token": verification_token,
            "link": verify_link
        }
    
    async def verify_email_token(self, token: str):
        """Verify email token and mark email as verified"""
        try:
            user_repo = UserRepository()
            user = await user_repo._col.find_one({"email_verification_token": token})
            
            if not user:
                logger.warning(f"Email verification failed: token not found")
                return False
            
            # Mark email as verified and remove token
            await user_repo._col.update_one(
                {"_id": user["_id"]},
                {"$set": {"email_verified": True}, "$unset": {"email_verification_token": ""}}
            )
            
            logger.info(f"Email verified successfully for user: {user['_id']}")
            return True
        except Exception as e:
            logger.error(f"Error verifying email token: {e}")
            return False
    
    async def send_password_reset_email(self, email: str):
        """Generate and send password reset email"""
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return False
        
        # Create a reset token with short expiry (1 hour)
        reset_token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        
        # Generate reset link
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        # Send reset email (or log if not configured)
        logger.info(f"Password reset link for {email}: {reset_link}")

        await self._send_email(
            to_email=email,
            subject="Reset your Security Dashboard password",
            text_content=f"Reset your password: {reset_link}",
            html_content=(
                f"<p>You requested a password reset.</p>"
                f"<p><a href=\"{reset_link}\">Reset Password</a></p>"
            ),
        )
        
        # For demo purposes, return the token so we can test it
        return {
            "email": email,
            "token": reset_token,
            "link": reset_link
        }

    async def send_login_lockout_email(self, email: str, unlock_token: str, lockout_until):
        """Send lockout notification with unlock and reset links"""
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        if not user:
            logger.info(f"Lockout email requested for non-existent email: {email}")
            return False

        # Password reset token
        reset_token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=timedelta(hours=1)
        )

        unlock_link = f"{self.frontend_url}/login?unlock={unlock_token}"
        api_unlock_link = f"{self.backend_url}/api/v1/auth/unlock-account?token={unlock_token}"
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"

        logger.info(
            "Account lockout for %s until %s. Unlock link: %s | API unlock: %s | Reset link: %s",
            email,
            lockout_until,
            unlock_link,
            api_unlock_link,
            reset_link,
        )

        await self._send_email(
            to_email=email,
            subject="Security Dashboard account locked",
            text_content=(
                f"Your account was locked due to failed logins. Unlock: {unlock_link} "
                f"or reset password: {reset_link}"
            ),
            html_content=(
                f"<p>Your account was locked due to failed logins.</p>"
                f"<p><a href=\"{unlock_link}\">Unlock Account</a></p>"
                f"<p><a href=\"{reset_link}\">Reset Password</a></p>"
            ),
        )

        return {
            "email": email,
            "unlock_link": unlock_link,
            "api_unlock_link": api_unlock_link,
            "reset_link": reset_link,
            "lockout_until": str(lockout_until),
        }
    
    async def verify_reset_token(self, token: str, new_password: str):
        """Verify reset token and update password"""
        from ...core.security import decode_access_token, get_password_hash
        
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            purpose = payload.get("purpose")
            
            if purpose != "password_reset":
                logger.warning(f"Invalid token purpose: {purpose}")
                return False
            
            user_repo = UserRepository()
            user = await user_repo.get_by_id(user_id)
            
            if not user:
                logger.warning(f"User not found for reset: {user_id}")
                return False
            
            # Update password
            hashed_password = get_password_hash(new_password)
            await user_repo._col.update_one(
                {"_id": user.id},
                {"$set": {"hashed_password": hashed_password}}
            )
            
            logger.info(f"Password reset successful for user: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error verifying reset token: {e}")
            return False
