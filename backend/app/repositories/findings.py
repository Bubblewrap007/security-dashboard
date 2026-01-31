from typing import List
from ..models.finding import FindingInDB
from ..db.client import get_db
from bson import ObjectId

class FindingRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = self._client.get_default_database()
        self._col = self._db.get_collection("findings")

    async def create_many(self, findings: List[dict]):
        if not findings:
            return
        res = await self._col.insert_many(findings)
        return res.inserted_ids

    async def list_by_scan(self, scan_id: str):
        cursor = self._col.find({"scan_id": scan_id})
        results = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            results.append(FindingInDB(**d))
        return results

    async def delete_by_scan(self, scan_id: str):
        await self._col.delete_many({"scan_id": scan_id})
