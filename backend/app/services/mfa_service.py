import pyotp
import json
from datetime import datetime, timedelta
import secrets
import logging

logger = logging.getLogger('app.mfa')

class MFAService:
    """Handles multi-factor authentication operations"""
    
    @staticmethod
    def generate_totp_secret():
        """Generate a new TOTP secret for authenticator apps"""
        return pyotp.random_base32()
    
    @staticmethod
    def get_totp_uri(secret: str, username: str, issuer: str = "Security Dashboard"):
        """Get provisioning URI for QR code generation"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=username, issuer_name=issuer)
    
    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """Verify a TOTP code"""
        if not secret or not code:
            return False
        try:
            totp = pyotp.TOTP(secret)
            # Allow 1 time window before and after for clock skew
            return totp.verify(code, valid_window=1)
        except Exception as e:
            logger.error(f"TOTP verification error: {e}")
            return False
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> list:
        """Generate backup codes for account recovery"""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    @staticmethod
    def hash_backup_code(code: str) -> str:
        """Hash a backup code for storage"""
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest()
    
    @staticmethod
    def verify_backup_code(code: str, hashed_code: str) -> bool:
        """Verify a backup code"""
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest() == hashed_code
    
    @staticmethod
    def send_email_code(email: str, code: str):
        """Send MFA code via email"""
        logger.info(f"[DEV MODE] Email MFA code for {email}: {code}")
        # In production, use actual email service
        return True
    
    @staticmethod
    def verify_email_code(stored_code: str, provided_code: str, created_at: datetime, ttl_seconds: int = 900) -> bool:
        """Verify email code with TTL (default 15 minutes)"""
        if not stored_code or not provided_code:
            return False
        
        # Check expiration
        if datetime.utcnow() - created_at > timedelta(seconds=ttl_seconds):
            return False
        
        return stored_code == provided_code
    
    @staticmethod
    def verify_phone_code(stored_code: str, provided_code: str, created_at: datetime, ttl_seconds: int = 900) -> bool:
        """Verify SMS code with TTL (default 15 minutes)"""
        if not stored_code or not provided_code:
            return False
        
        # Check expiration
        if datetime.utcnow() - created_at > timedelta(seconds=ttl_seconds):
            return False
        
        return stored_code == provided_code
    
    @staticmethod
    def generate_phone_code(length: int = 6) -> str:
        """Generate a numeric code for phone/SMS"""
        import random
        return ''.join([str(random.randint(0, 9)) for _ in range(length)])
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Basic phone number validation"""
        import re
        # Accept formats like +1234567890, 1234567890, etc
        pattern = r'^[\d\-\+\s\(\)]{10,}$'
        return bool(re.match(pattern, phone))
