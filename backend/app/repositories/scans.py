from typing import Optional
from ..models.scan import ScanInDB, ScanBase
from ..db.client import get_db, get_database
from bson import ObjectId
from datetime import datetime

class ScanRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("scans")

    async def create(self, user_id: str, payload: ScanBase) -> ScanInDB:
        doc = payload.model_dump()
        doc.update({"user_id": user_id, "status": "queued", "created_at": datetime.utcnow(), "assetCount": len(payload.asset_ids)})
        res = await self._col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return ScanInDB(**doc)

    async def update_status(self, scan_id: str, status: str, **kwargs):
        update = {"status": status}
        update.update(kwargs)
        await self._col.update_one({"_id": ObjectId(scan_id)}, {"$set": update})

    async def set_results(self, scan_id: str, score: int, summary_counts: dict, completed_at: datetime):
        await self._col.update_one({"_id": ObjectId(scan_id)}, {"$set": {"score": score, "summary_counts": summary_counts, "completed_at": completed_at, "status": "completed"}})

    async def get(self, scan_id: str) -> Optional[ScanInDB]:
        d = await self._col.find_one({"_id": ObjectId(scan_id)})
        if not d:
            return None
        d["_id"] = str(d["_id"])
        return ScanInDB(**d)

    async def list_by_user(self, user_id: str):
        cursor = self._col.find({"user_id": user_id}).sort([("created_at", -1)])
        results = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            # Ensure assetCount is present for older scans
            if "assetCount" not in d and "asset_ids" in d:
                d["assetCount"] = len(d["asset_ids"])
            results.append(ScanInDB(**d))
        return results

    async def ensure_owner(self, scan_id: str, user_id: str) -> bool:
        d = await self._col.find_one({"_id": ObjectId(scan_id)})
        if not d:
            return False
        return str(d.get("user_id")) == str(user_id)

    async def delete(self, scan_id: str) -> bool:
        res = await self._col.delete_one({"_id": ObjectId(scan_id)})
        return res.deleted_count == 1
