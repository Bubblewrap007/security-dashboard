import os
import json
import secrets
import requests as _requests
from datetime import datetime, timedelta
from app.repositories.users import UserRepository
from app.core.security import create_access_token
import logging
import asyncio

logger = logging.getLogger("app.email")

APP_NAME = "Securalith"
ACCENT   = "#4f46e5"   # indigo-600


def _html_wrap(title: str, body_html: str) -> str:
    """Minimal branded HTML email template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:{ACCENT};padding:24px 32px;">
          <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">{APP_NAME}</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            You received this email because an action was taken on your {APP_NAME} account.
            If you did not request this, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


class EmailService:
    """Email service — uses Mailgun REST API (free tier: 1 000 emails/month)."""

    def __init__(self):
        self.frontend_url     = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.backend_url      = os.getenv("BACKEND_URL", "http://localhost:8000")
        self.mailgun_api_key  = os.getenv("MAILGUN_API_KEY", "")
        self.mailgun_domain   = os.getenv("MAILGUN_DOMAIN", "")          # e.g. mg.securalith.com
        self.from_email       = os.getenv(
            "MAILGUN_FROM_EMAIL",
            f"no-reply@{self.mailgun_domain}" if self.mailgun_domain else "no-reply@securalith.com"
        )

    # ------------------------------------------------------------------ #
    #  Core send helper                                                    #
    # ------------------------------------------------------------------ #

    async def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
        """Send an email via Mailgun HTTP API (runs in a thread to stay non-blocking)."""
        if not self.mailgun_api_key or not self.mailgun_domain:
            logger.warning(
                "Mailgun not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN missing); "
                "skipping email to %s", to_email
            )
            return False

        def _send():
            return _requests.post(
                f"https://api.mailgun.net/v3/{self.mailgun_domain}/messages",
                auth=("api", self.mailgun_api_key),
                data={
                    "from":    f"{APP_NAME} <{self.from_email}>",
                    "to":      to_email,
                    "subject": subject,
                    "text":    text_content or subject,
                    "html":    html_content,
                },
                timeout=15,
            )

        try:
            resp = await asyncio.to_thread(_send)
            if resp.status_code in (200, 201, 202):
                logger.info("Email sent to %s (status %s)", to_email, resp.status_code)
                return True
            logger.error("Mailgun error %s: %s", resp.status_code, resp.text)
            return False
        except Exception as exc:
            logger.error("Mailgun send failed: %s", exc)
            return False

    # ------------------------------------------------------------------ #
    #  Email verification                                                  #
    # ------------------------------------------------------------------ #

    async def send_email_verification(self, email: str):
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        if not user:
            logger.info("Email verification requested for non-existent address: %s", email)
            return False

        verification_token = secrets.token_urlsafe(32)
        await user_repo._col.update_one(
            {"_id": user.id},
            {"$set": {"email_verification_token": verification_token}}
        )
        verify_link = f"{self.frontend_url}/verify-email?token={verification_token}"
        logger.info("Email verification link for %s: %s", email, verify_link)

        html = _html_wrap(
            f"Verify your {APP_NAME} email",
            f"""<h2 style="margin:0 0 12px;color:#111827;">Verify your email address</h2>
<p style="color:#374151;line-height:1.6;">
  Thanks for signing up to {APP_NAME}. Click the button below to confirm your email address.
</p>
<p style="margin:24px 0;">
  <a href="{verify_link}" style="background:{ACCENT};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Verify Email
  </a>
</p>
<p style="font-size:12px;color:#6b7280;">Or paste this link into your browser:<br>
  <a href="{verify_link}" style="color:{ACCENT};">{verify_link}</a>
</p>"""
        )

        await self._send_email(
            to_email=email,
            subject=f"Verify your {APP_NAME} email",
            text_content=f"Verify your email address: {verify_link}",
            html_content=html,
        )
        return {"email": email, "token": verification_token, "link": verify_link}

    # ------------------------------------------------------------------ #
    #  Email token verification                                            #
    # ------------------------------------------------------------------ #

    async def verify_email_token(self, token: str):
        try:
            user_repo = UserRepository()
            user = await user_repo._col.find_one({"email_verification_token": token})
            if not user:
                logger.warning("Email verification failed: token not found")
                return False
            await user_repo._col.update_one(
                {"_id": user["_id"]},
                {"$set": {"email_verified": True}, "$unset": {"email_verification_token": ""}}
            )
            logger.info("Email verified for user: %s", user["_id"])
            return True
        except Exception as exc:
            logger.error("Error verifying email token: %s", exc)
            return False

    # ------------------------------------------------------------------ #
    #  Password reset                                                      #
    # ------------------------------------------------------------------ #

    async def send_password_reset_email(self, email: str):
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        if not user:
            logger.info("Password reset for non-existent address: %s", email)
            return False

        reset_token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        logger.info("Password reset link for %s: %s", email, reset_link)

        html = _html_wrap(
            f"Reset your {APP_NAME} password",
            f"""<h2 style="margin:0 0 12px;color:#111827;">Reset your password</h2>
<p style="color:#374151;line-height:1.6;">
  We received a request to reset the password on your {APP_NAME} account.
  This link expires in <strong>1 hour</strong>.
</p>
<p style="margin:24px 0;">
  <a href="{reset_link}" style="background:{ACCENT};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Reset Password
  </a>
</p>
<p style="font-size:12px;color:#6b7280;">Or paste this link into your browser:<br>
  <a href="{reset_link}" style="color:{ACCENT};">{reset_link}</a>
</p>
<p style="color:#6b7280;font-size:13px;">
  If you didn't request a password reset, you can safely ignore this email.
  Your password will not change.
</p>"""
        )

        await self._send_email(
            to_email=email,
            subject=f"Reset your {APP_NAME} password",
            text_content=f"Reset your password (expires in 1 hour): {reset_link}",
            html_content=html,
        )
        return {"email": email, "token": reset_token, "link": reset_link}

    # ------------------------------------------------------------------ #
    #  Account lockout                                                     #
    # ------------------------------------------------------------------ #

    async def send_login_lockout_email(self, email: str, unlock_token: str, lockout_until):
        user_repo = UserRepository()
        user = await user_repo.get_by_email(email)
        if not user:
            logger.info("Lockout email for non-existent address: %s", email)
            return False

        reset_token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        unlock_link    = f"{self.frontend_url}/login?unlock={unlock_token}"
        api_unlock_link = f"{self.backend_url}/api/v1/auth/unlock-account?token={unlock_token}"
        reset_link     = f"{self.frontend_url}/reset-password?token={reset_token}"

        logger.info(
            "Account lockout for %s until %s — unlock: %s | reset: %s",
            email, lockout_until, unlock_link, reset_link,
        )

        html = _html_wrap(
            f"{APP_NAME} — account locked",
            f"""<h2 style="margin:0 0 12px;color:#dc2626;">Your account has been locked</h2>
<p style="color:#374151;line-height:1.6;">
  Your {APP_NAME} account was temporarily locked after multiple failed login attempts.
  It will remain locked until <strong>{lockout_until}</strong>.
</p>
<p style="margin:24px 0 8px;">
  <a href="{unlock_link}" style="background:{ACCENT};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Unlock My Account
  </a>
</p>
<p style="margin:8px 0 24px;">
  <a href="{reset_link}" style="color:{ACCENT};font-size:13px;">
    Or reset your password instead
  </a>
</p>
<p style="color:#6b7280;font-size:13px;">
  If this wasn't you, your account may be under a brute-force attempt.
  We recommend resetting your password immediately.
</p>"""
        )

        await self._send_email(
            to_email=email,
            subject=f"{APP_NAME} — account locked",
            text_content=(
                f"Your account was locked due to failed logins. "
                f"Unlock: {unlock_link} or reset password: {reset_link}"
            ),
            html_content=html,
        )
        return {
            "email": email,
            "unlock_link": unlock_link,
            "api_unlock_link": api_unlock_link,
            "reset_link": reset_link,
            "lockout_until": str(lockout_until),
        }

    # ------------------------------------------------------------------ #
    #  Reset-token verification (no email sent — pure logic)              #
    # ------------------------------------------------------------------ #

    async def verify_reset_token(self, token: str, new_password: str):
        from ...core.security import decode_access_token, get_password_hash
        try:
            payload  = decode_access_token(token)
            user_id  = payload.get("sub")
            purpose  = payload.get("purpose")
            if purpose != "password_reset":
                logger.warning("Invalid token purpose: %s", purpose)
                return False
            user_repo = UserRepository()
            user = await user_repo.get_by_id(user_id)
            if not user:
                logger.warning("User not found for reset: %s", user_id)
                return False
            hashed = get_password_hash(new_password)
            await user_repo._col.update_one(
                {"_id": user.id},
                {"$set": {"hashed_password": hashed}}
            )
            logger.info("Password reset successful for user: %s", user_id)
            return True
        except Exception as exc:
            logger.error("Error verifying reset token: %s", exc)
            return False
