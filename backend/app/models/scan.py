from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ScanBase(BaseModel):
    asset_ids: List[str]

class ScanInDB(ScanBase):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    status: str = "queued"
    score: Optional[int] = None
    summary_counts: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assetCount: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
