from typing import Optional, List
from ..models.asset_group import AssetGroupBase, AssetGroupInDB
from ..db.client import get_db, get_database
from bson import ObjectId
from datetime import datetime


class AssetGroupRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("asset_groups")

    async def create(self, user_id: str, name: str, asset_ids: List[str]) -> AssetGroupInDB:
        doc = {
            "name": name,
            "asset_ids": asset_ids,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
        }
        res = await self._col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return AssetGroupInDB(**doc)

    async def list_by_user(self, user_id: str) -> List[AssetGroupInDB]:
        cursor = self._col.find({"user_id": user_id}).sort([("created_at", 1)])
        results = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            results.append(AssetGroupInDB(**d))
        return results

    async def get(self, group_id: str) -> Optional[AssetGroupInDB]:
        try:
            d = await self._col.find_one({"_id": ObjectId(group_id)})
        except Exception:
            return None
        if not d:
            return None
        d["_id"] = str(d["_id"])
        return AssetGroupInDB(**d)

    async def update(self, group_id: str, name: str, asset_ids: List[str]) -> bool:
        res = await self._col.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": {"name": name, "asset_ids": asset_ids}},
        )
        return res.matched_count == 1

    async def delete(self, group_id: str) -> bool:
        res = await self._col.delete_one({"_id": ObjectId(group_id)})
        return res.deleted_count == 1
