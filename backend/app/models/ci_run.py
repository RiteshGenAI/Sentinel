from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class CIRun(Base):
    __tablename__ = 'ci_runs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pipeline: Mapped[str] = mapped_column(String(120))
    job: Mapped[str] = mapped_column(String(120))
    runner_type: Mapped[str] = mapped_column(String(60))
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    infra_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    project_id: Mapped[int | None] = mapped_column(ForeignKey('projects.id'), nullable=True)
    api_key_id: Mapped[int | None] = mapped_column(ForeignKey('api_keys.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
