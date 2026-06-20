from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class LLMCall(Base):
    __tablename__ = 'llm_calls'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(60))
    model: Mapped[str] = mapped_column(String(120))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    feature_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    agent_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey('projects.id'), nullable=True)
    api_key_id: Mapped[int | None] = mapped_column(ForeignKey('api_keys.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
