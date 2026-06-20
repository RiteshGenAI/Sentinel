from pydantic import BaseModel, Field
from datetime import datetime

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    project_id: int | None = None
    cost_limit_usd: float = Field(default=20.0, gt=0)
    expires_days: int | None = None  # If set, key expires after N days

class ApiKeyOut(BaseModel):
    id: int
    key_prefix: str
    name: str
    user_id: int
    project_id: int | None
    cost_limit_usd: float
    total_cost_usd: float
    is_active: bool
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None
    model_config = {'from_attributes': True}

class ApiKeyWithSecret(ApiKeyOut):
    secret_key: str  # Only shown once at creation

class ApiKeyUsageOut(BaseModel):
    id: int
    api_key_id: int
    llm_call_id: int | None
    ci_run_id: int | None
    cost_usd: float
    created_at: datetime
    model_config = {'from_attributes': True}
