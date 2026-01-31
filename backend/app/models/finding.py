from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class FindingBase(BaseModel):
    scan_id: str
    asset_id: str
    check_id: str
    severity: str  # critical|high|medium|low
    title: str
    evidence: dict
    recommendation: str

class FindingInDB(FindingBase):
    id: Optional[str] = Field(None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
