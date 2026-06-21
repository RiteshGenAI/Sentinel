from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    display_name: str = Field(..., min_length=1, max_length=120)
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key_header: str = Field(default='Authorization', max_length=60)
    rate_limit_rpm: int = Field(default=60, ge=1)
    rate_limit_tpm: int = Field(default=100000, ge=1)
    models_json: str | None = Field(default='[]')

class ProviderOut(BaseModel):
    id: int
    name: str
    display_name: str
    base_url: str
    api_key_header: str
    rate_limit_rpm: int
    rate_limit_tpm: int
    models_json: str | None
    is_active: bool
    model_config = {'from_attributes': True}

class MasterKeyCreate(BaseModel):
    provider_id: int
    raw_key: str = Field(..., min_length=10)
    name: str = Field(default='Default', max_length=120)

class MasterKeyOut(BaseModel):
    id: int
    provider_id: int
    key_prefix: str
    name: str
    is_active: bool
    total_cost_usd: float
    total_requests: int
    total_tokens: int
    created_at: datetime
    model_config = {'from_attributes': True}

class ChildKeyCreate(BaseModel):
    provider_id: int
    name: str = Field(..., min_length=1, max_length=120)
    cost_limit_usd: float = Field(default=20.0, gt=0)
    expires_days: int | None = None
    project_id: int | None = None
    user_email: str | None = None

class ChildKeyOut(BaseModel):
    id: int
    key_prefix: str
    name: str
    user_id: int
    provider_id: int
    project_id: int | None
    cost_limit_usd: float
    total_cost_usd: float
    total_requests: int
    total_tokens: int
    is_active: bool
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None
    user_email: str | None = None
    user_name: str | None = None
    model_config = {'from_attributes': True}

class ChildKeyWithSecret(ChildKeyOut):
    secret_key: str

class ChildKeySummary(BaseModel):
    key_id: int
    name: str
    provider: str
    cost_limit_usd: float
    total_cost_usd: float
    total_requests: int
    total_tokens: int
    remaining_usd: float
    is_active: bool
    expires_at: str | None

class ProxyRequest(BaseModel):
    model: str
    messages: list[dict]
    max_tokens: int = 1000
    temperature: float | None = None
    stream: bool = False

class ProxyResponse(BaseModel):
    id: str | None = None
    object: str | None = None
    created: int | None = None
    model: str | None = None
    choices: list[dict] | None = None
    usage: dict | None = None
    sentinel_cost_usd: float | None = None
    sentinel_provider: str | None = None
