from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Alert(Base):
    __tablename__ = 'alerts'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey('budgets.id'))
    level: Mapped[str] = mapped_column(String(30))  # warning, critical
    message: Mapped[str] = mapped_column(String(500))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    entity_type: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# External Provider (OpenAI, Anthropic, etc.)
class Provider(Base):
    __tablename__ = 'providers'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)  # e.g. 'openai'
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. 'OpenAI'
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)  # e.g. 'https://api.openai.com/v1'
    api_key_header: Mapped[str] = mapped_column(String(60), default='Authorization')  # header name for the key
    rate_limit_rpm: Mapped[int] = mapped_column(Integer, default=60)  # requests per minute
    rate_limit_tpm: Mapped[int] = mapped_column(Integer, default=100000)  # tokens per minute
    models_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of supported models
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# Master Key = Your actual external provider API key (encrypted at rest)
class MasterKey(Base):
    __tablename__ = 'master_keys'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)  # SHA-256 of actual key
    key_prefix: Mapped[str] = mapped_column(String(20))  # e.g. "sk-abc..." for display
    key_encrypted: Mapped[str] = mapped_column(String(1000), nullable=False)  # Fernet-encrypted actual key
    name: Mapped[str] = mapped_column(String(120), default='Default')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Rate limit tracking
    current_rpm: Mapped[int] = mapped_column(Integer, default=0)
    rpm_reset_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# Child Key = Team member key that proxies through a master key
class ChildKey(Base):
    __tablename__ = 'child_keys'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)  # who created it
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), nullable=False)  # which provider it routes to
    project_id: Mapped[int | None] = mapped_column(ForeignKey('projects.id'), nullable=True)
    cost_limit_usd: Mapped[float] = mapped_column(Float, default=20.0)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class ChildKeyUsage(Base):
    __tablename__ = 'child_key_usage'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_key_id: Mapped[int] = mapped_column(ForeignKey('child_keys.id'))
    master_key_id: Mapped[int | None] = mapped_column(ForeignKey('master_keys.id'), nullable=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'))
    request_path: Mapped[str] = mapped_column(String(500), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# Master key usage tracking (for rate limiting and billing)
class MasterKeyUsage(Base):
    __tablename__ = 'master_key_usage'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    master_key_id: Mapped[int] = mapped_column(ForeignKey('master_keys.id'))
    child_key_id: Mapped[int | None] = mapped_column(ForeignKey('child_keys.id'), nullable=True)
    request_path: Mapped[str] = mapped_column(String(500), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# Legacy API Key (for direct LLM/CI ingestion tracking)
class ApiKey(Base):
    __tablename__ = 'api_keys'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    project_id: Mapped[int | None] = mapped_column(ForeignKey('projects.id'), nullable=True)
    cost_limit_usd: Mapped[float] = mapped_column(Float, default=20.0)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class ApiKeyUsage(Base):
    __tablename__ = 'api_key_usage'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(ForeignKey('api_keys.id'))
    llm_call_id: Mapped[int | None] = mapped_column(ForeignKey('llm_calls.id'), nullable=True)
    ci_run_id: Mapped[int | None] = mapped_column(ForeignKey('ci_runs.id'), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
