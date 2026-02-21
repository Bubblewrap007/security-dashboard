from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class AssetGroupBase(BaseModel):
    name: str
    asset_ids: List[str] = []


class AssetGroupInDB(AssetGroupBase):
    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
