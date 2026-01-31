from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime

class AuditEventInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    actor_id: Optional[str]
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True, validate_by_name=True)
