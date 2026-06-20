from pydantic import BaseModel, Field
from datetime import datetime

class BudgetCreate(BaseModel):
    scope: str = Field(default='project', pattern='^(project|global)$')
    period: str = Field(default='monthly', pattern='^(monthly|weekly|daily)$')
    limit_usd: float = Field(..., gt=0)
    warning_threshold: float = Field(default=0.7, ge=0, le=1)
    critical_threshold: float = Field(default=0.9, ge=0, le=1)
    project_id: int | None = None

class BudgetOut(BaseModel):
    id: int
    scope: str
    period: str
    limit_usd: float
    warning_threshold: float
    critical_threshold: float
    project_id: int | None
    created_at: datetime
    model_config = {'from_attributes': True}

class BudgetStatusOut(BaseModel):
    budget_id: int
    total_cost_usd: float
    limit_usd: float
    ratio: float
    level: str
