from pydantic import BaseModel, Field, constr, ConfigDict
from typing import Optional
from datetime import datetime

class AssetBase(BaseModel):
    type: constr(pattern="^(email|domain|ipv4|url)$")
    value: str

class AssetCreate(AssetBase):
    pass

class AssetInDB(AssetBase):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    parent_asset_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
