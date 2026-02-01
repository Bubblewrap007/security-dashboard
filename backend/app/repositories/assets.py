from typing import List, Optional
from ..models.asset import AssetInDB, AssetCreate
from ..db.client import get_db, get_database
from bson import ObjectId
import tldextract

def extract_registrable_domain(value: str) -> Optional[str]:
    """
    Extract registrable domain from an email or domain.
    For emails like user@mail.example.co.uk, returns example.co.uk
    For domains, returns the registrable domain.
    Returns None if extraction fails.
    """
    try:
        # Remove email part if it's an email
        if '@' in value:
            value = value.split('@')[1]
        
        extracted = tldextract.extract(value)
        if extracted.registered_domain:
            return extracted.registered_domain.lower()
        return None
    except Exception:
        return None

async def find_parent_asset(assets: List[dict], asset: dict) -> Optional[str]:
    """
    Find parent asset for a given asset.
    Returns parent asset ID if found, None otherwise.
    Only email assets can have parents (domains).
    """
    if asset['type'] != 'email':
        return None
    
    asset_domain = extract_registrable_domain(asset['value'])
    if not asset_domain:
        return None
    
    # Look for a domain asset with matching registrable domain
    for other in assets:
        if other['type'] == 'domain':
            other_domain = extract_registrable_domain(other['value'])
            if other_domain == asset_domain:
                return str(other['_id'])
    
    return None


def normalize_asset_value(asset_type: str, value: str) -> str:
    normalized = value.strip()
    if asset_type in ("email", "domain", "url"):
        normalized = normalized.lower()
    return normalized


class AssetRepository:
    def __init__(self, db_client=None):
        self._client = db_client or get_db()
        self._db = get_database()
        self._col = self._db.get_collection("assets")

    async def create(self, user_id: str, payload: AssetCreate) -> AssetInDB:
        normalized_value = normalize_asset_value(payload.type, payload.value)
        existing = await self._col.find_one({
            "user_id": user_id,
            "type": payload.type,
            "value": normalized_value
        })
        if existing:
            raise ValueError("Asset already exists")

        doc = payload.model_dump()
        doc.update({"user_id": user_id, "value": normalized_value})
        res = await self._col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return AssetInDB(**doc)

    async def list_by_user(self, user_id: str) -> List[AssetInDB]:
        cursor = self._col.find({"user_id": user_id})
        results_raw = []
        async for d in cursor:
            d["_id"] = str(d["_id"])
            results_raw.append(d)
        
        # Calculate parent_asset_id for each asset
        results = []
        for d in results_raw:
            # Find parent if this is an email asset
            parent_id = await find_parent_asset(results_raw, d)
            d['parent_asset_id'] = parent_id
            results.append(AssetInDB(**d))
        
        return results

    async def get(self, asset_id: str) -> Optional[AssetInDB]:
        d = await self._col.find_one({"_id": ObjectId(asset_id)})
        if not d:
            return None
        d["_id"] = str(d["_id"])
        return AssetInDB(**d)

    async def delete(self, asset_id: str) -> bool:
        res = await self._col.delete_one({"_id": ObjectId(asset_id)})
        return res.deleted_count == 1
