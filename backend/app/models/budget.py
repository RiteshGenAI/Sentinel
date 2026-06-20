from datetime import datetime, timezone
from sqlalchemy import Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Budget(Base):
    __tablename__ = 'budgets'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(60), default='project')
    period: Mapped[str] = mapped_column(String(30), default='monthly')
    limit_usd: Mapped[float] = mapped_column(Float, default=100.0)
    warning_threshold: Mapped[float] = mapped_column(Float, default=0.7)
    critical_threshold: Mapped[float] = mapped_column(Float, default=0.9)
    project_id: Mapped[int | None] = mapped_column(ForeignKey('projects.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
