from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.models.budget import Budget
from app.api.deps import require_roles
from app.core.config import Role
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix='/forecast', tags=['forecast'])

@router.get('/', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def forecast(db: Session = Depends(get_db)):
    # Get last 30 days of daily costs
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    llm_daily = db.query(
        func.date_trunc('day', LLMCall.created_at).label('day'),
        func.sum(LLMCall.cost_usd).label('cost')
    ).filter(LLMCall.created_at >= thirty_days_ago).group_by('day').order_by('day').all()
    
    ci_daily = db.query(
        func.date_trunc('day', CIRun.created_at).label('day'),
        func.sum(CIRun.infra_cost_usd).label('cost')
    ).filter(CIRun.created_at >= thirty_days_ago).group_by('day').order_by('day').all()
    
    # Calculate average daily cost
    total_llm = sum(float(d.cost) for d in llm_daily) if llm_daily else 0.0
    total_ci = sum(float(d.cost) for d in ci_daily) if ci_daily else 0.0
    days = max(len(llm_daily), len(ci_daily), 1)
    avg_daily = (total_llm + total_ci) / days
    
    # Simple linear projection for next 30 days
    projected_monthly = avg_daily * 30
    
    # Get budget limits
    budgets = db.query(Budget).all()
    total_limit = sum(b.limit_usd for b in budgets) if budgets else 0.0
    
    # Calculate risk
    risk = 'low'
    if total_limit > 0 and projected_monthly > total_limit:
        risk = 'high'
    elif total_limit > 0 and projected_monthly > total_limit * 0.8:
        risk = 'medium'
    
    return {
        'avg_daily_cost': round(avg_daily, 4),
        'projected_monthly_cost': round(projected_monthly, 4),
        'total_budget_limit': round(total_limit, 2),
        'risk_level': risk,
        'days_of_data': days
    }
