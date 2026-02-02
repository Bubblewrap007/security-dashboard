from typing import Optional
from ..models.user import UserInDB
from ..db.client import get_db, get_database
from bson import ObjectId
from datetime import datetime


class UserRepository:
    async def set_security_questions(self, user_id: str, questions: list):
        """Set security questions and hashed answers for a user. Expects list of dicts: [{question, answer}]"""
        from ..core.security import get_password_hash
        hashed = [{"question": q["question"], "answer_hash": get_password_hash(q["answer"])} for q in questions]
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": {"security_questions": hashed}})
        return await self.get_by_id(user_id)

    async def verify_security_answers(self, user_id: str, answers: list) -> bool:
        """Verify provided answers against stored hashes. Expects list of dicts: [{question, answer}]"""
        user = await self.get_by_id(user_id)
        if not user or not getattr(user, "security_questions", None):
            return False
        from ..core.security import verify_password
        stored = {q["question"]: q["answer_hash"] for q in user.security_questions}
        for ans in answers:
            q = ans["question"]
            a = ans["answer"]
            if q not in stored or not verify_password(a, stored[q]):
                return False
        return True

    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("users")

    async def get_email_breach_usage(self, user_id: str) -> tuple[int, str]:
        """Return (usage_count, usage_date) for daily email breach usage."""
        user = await self.get_by_id(user_id)
        if not user:
            return 0, ""
        usage_date = getattr(user, "email_breach_usage_date", None)
        usage_count = getattr(user, "email_breach_usage_count", 0) or 0
        return usage_count, usage_date or ""
from typing import Optional
from ..models.user import UserInDB
from ..db.client import get_db, get_database
from bson import ObjectId
from datetime import datetime


class UserRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("users")

    async def get_by_email(self, email: str) -> Optional[UserInDB]:
        data = await self._col.find_one({"email": email})
        if not data:
            return None
        data["_id"] = str(data["_id"]) if data.get("_id") else None
        data.setdefault("roles", [])
        return UserInDB(**data)

    async def get_by_username(self, username: str) -> Optional[UserInDB]:
        data = await self._col.find_one({"username": username})
        if not data:
            return None
        data["_id"] = str(data["_id"]) if data.get("_id") else None
        data.setdefault("roles", [])
        return UserInDB(**data)

    async def create_user(self, user_dict: dict) -> UserInDB:
        res = await self._col.insert_one(user_dict)
        user_dict["_id"] = str(res.inserted_id)
        user_dict.setdefault("roles", [])
        return UserInDB(**user_dict)

    async def get_by_id(self, id: str) -> Optional[UserInDB]:
        data = await self._col.find_one({"_id": ObjectId(id)})
        if not data:
            return None
        data["_id"] = str(data["_id"])
        data.setdefault("roles", [])
        return UserInDB(**data)

    async def list_users(self):
        cursor = self._col.find({})
        results = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            d.setdefault("roles", [])
            results.append(UserInDB(**d))
        return results

    async def set_superuser(self, user_id: str, is_super: bool):
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_superuser": bool(is_super)}})
        return await self.get_by_id(user_id)

    async def update_password(self, user_id: str, new_hashed_password: str):
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": {"hashed_password": new_hashed_password}})
        return await self.get_by_id(user_id)

    async def update_email(self, user_id: str, new_email: str):
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": {"email": new_email}})
        return await self.get_by_id(user_id)

    async def update_timezone(self, user_id: str, timezone: str):
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": {"timezone": timezone}})
        return await self.get_by_id(user_id)

    async def increment_email_breach_usage(self, user_id: str) -> int:
        """Increment daily email breach usage counter and return new count."""
        today = datetime.utcnow().date().isoformat()
        user = await self.get_by_id(user_id)
        if not user:
            return 0

        usage_date = getattr(user, "email_breach_usage_date", None)
        usage_count = getattr(user, "email_breach_usage_count", 0) or 0

        if usage_date != today:
            usage_count = 0

        usage_count += 1

        await self._col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"email_breach_usage_date": today, "email_breach_usage_count": usage_count}}
        )

        return usage_count

    async def increment_failed_login(self, user_id: str) -> int:
        """Increment failed login attempts and return new count."""
        await self._col.update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"failed_login_attempts": 1}}
        )
        user = await self.get_by_id(user_id)
        return user.failed_login_attempts if user else 0

    async def clear_failed_logins(self, user_id: str):
        """Reset failed login attempts and clear lockout state."""
        await self._col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"failed_login_attempts": 0, "lockout_until": None, "lockout_token": None}}
        )
        return await self.get_by_id(user_id)

    async def set_lockout(self, user_id: str, lockout_until, lockout_token: str):
        """Set account lockout until a given time with an unlock token."""
        await self._col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"lockout_until": lockout_until, "lockout_token": lockout_token}}
        )
        return await self.get_by_id(user_id)

    async def clear_lockout_by_token(self, token: str) -> bool:
        """Clear lockout using an unlock token."""
        res = await self._col.update_one(
            {"lockout_token": token},
            {"$set": {"failed_login_attempts": 0, "lockout_until": None, "lockout_token": None}}
        )
        return res.modified_count > 0

    async def enable_mfa(self, user_id: str, method: str, secret: Optional[str] = None, backup_codes: Optional[list] = None):
        """Enable MFA for a user"""
        from datetime import datetime
        update_doc = {
            "mfa_enabled": True,
            "mfa_method": method,
            "mfa_verified": True,
            "mfa_backup_codes": backup_codes or [],
            "mfa_enabled_at": datetime.utcnow()
        }
        if secret:
            update_doc["totp_secret"] = secret
        
        await self._col.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
        return await self.get_by_id(user_id)

    async def disable_mfa(self, user_id: str):
        """Disable MFA for a user"""
        await self._col.update_one({"_id": ObjectId(user_id)}, {
            "$set": {
                "mfa_enabled": False,
                "mfa_method": None,
                "mfa_verified": False,
                "totp_secret": None,
                "mfa_backup_codes": []
            }
        })
        return await self.get_by_id(user_id)

    async def store_mfa_code(self, user_id: str, code: str):
        """Store temporary MFA verification code"""
        from datetime import datetime
        # Store in a temporary collection or cache
        temp_col = self._db.get_collection("mfa_temp_codes")
        await temp_col.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "code": code,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

    async def get_mfa_code(self, user_id: str) -> Optional[str]:
        """Get stored MFA verification code"""
        temp_col = self._db.get_collection("mfa_temp_codes")
        doc = await temp_col.find_one({"user_id": user_id})
        return doc.get("code") if doc else None

    async def clear_mfa_code(self, user_id: str):
        """Clear temporary MFA code"""
        temp_col = self._db.get_collection("mfa_temp_codes")
        await temp_col.delete_one({"user_id": user_id})

    async def set_last_login(self, user_id: str):
        """Update last login timestamp"""
        from datetime import datetime
        await self._col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login": datetime.utcnow()}}
        )

    async def delete_user(self, user_id: str):
        """Permanently delete a user account"""
        await self._col.delete_one({"_id": ObjectId(user_id)})
