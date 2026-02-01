from typing import Optional, Dict
from ..models.audit import AuditEventInDB
from ..db.client import get_db, get_database
from bson import ObjectId

class AuditRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("audit_events")

    async def create_event(self, actor_id: Optional[str], action: str, target_type: Optional[str] = None, target_id: Optional[str] = None, details: Optional[Dict] = None):
        doc = {
            "actor_id": actor_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
        }
        res = await self._col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return AuditEventInDB(**doc)

    async def list_recent(self, limit: int = 100):
        cursor = self._col.find({}).sort([("created_at", -1)]).limit(limit)
        out = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            out.append(AuditEventInDB(**d))
        return out
