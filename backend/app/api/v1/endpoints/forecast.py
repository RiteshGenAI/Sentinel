from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.models.budget import Budget
from app.api.deps import require_roles
from app.core.config import Role
from sqlalchemy import func, text
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix='/forecast', tags=['forecast'])

@router.get('/', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def forecast(db: Session = Depends(get_db)):
    # Get last 30 days of daily costs
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    thirty_days_ago = now - timedelta(days=30)

    llm_daily = []
    ci_daily = []
    try:
        llm_daily = db.query(
            func.date_trunc('day', LLMCall.created_at).label('day'),
            func.sum(LLMCall.cost_usd).label('cost')
        ).filter(LLMCall.created_at >= thirty_days_ago).group_by(text('day')).order_by(text('day')).all()

        ci_daily = db.query(
            func.date_trunc('day', CIRun.created_at).label('day'),
            func.sum(CIRun.infra_cost_usd).label('cost')
        ).filter(CIRun.created_at >= thirty_days_ago).group_by(text('day')).order_by(text('day')).all()
    except Exception as e:
        import logging
        logging.warning(f"Daily cost query failed: {e}")
        db.rollback()

    # Calculate average daily cost
    total_llm = sum(float(d.cost or 0.0) for d in llm_daily) if llm_daily else 0.0
    total_ci = sum(float(d.cost or 0.0) for d in ci_daily) if ci_daily else 0.0
    days = max(len(llm_daily), len(ci_daily), 1)
    avg_daily = (total_llm + total_ci) / days

    # Simple linear projection for next 30 days
    projected_monthly = avg_daily * 30

    # Get budget limits
    budgets = []
    try:
        budgets = db.query(Budget).all()
    except Exception as e:
        import logging
        logging.warning(f"Budget query failed: {e}")
        db.rollback()
    total_limit = sum(b.limit_usd for b in budgets) if budgets else 0.0

    # Calculate risk
    risk = 'low'
    if total_limit > 0 and projected_monthly > total_limit:
        risk = 'high'
    elif total_limit > 0 and projected_monthly > total_limit * 0.8:
        risk = 'medium'
        
    # Member-level forecast projections
    from app.models.user import User
    from app.models.extra import ChildKey, ChildKeyUsage, ApiKey

    users = []
    try:
        users = db.query(User).all()
    except Exception as e:
        import logging
        logging.warning(f"User query failed: {e}")
        db.rollback()

    user_forecasts = []

    for u in users:
        child_spend = 0.0
        try:
            child_spend = db.query(func.sum(ChildKeyUsage.cost_usd)).filter(
                ChildKeyUsage.child_key_id.in_(
                    db.query(ChildKey.id).filter(ChildKey.user_id == u.id)
                ),
                ChildKeyUsage.created_at >= thirty_days_ago
            ).scalar() or 0.0
        except Exception as e:
            import logging
            logging.warning(f"Child spend query failed for user {u.id}: {e}")
            db.rollback()

        # api_key direct ingest spend via LLMCall
        api_spend = 0.0
        try:
            from app.models.llm_call import LLMCall as LLMCallModel
            api_key_ids = db.query(ApiKey.id).filter(ApiKey.user_id == u.id).subquery()
            api_spend = db.query(func.sum(LLMCallModel.cost_usd)).filter(
                LLMCallModel.api_key_id.in_(api_key_ids),
                LLMCallModel.created_at >= thirty_days_ago
            ).scalar() or 0.0
        except Exception as e:
            import logging
            logging.warning(f"API spend query failed for user {u.id}: {e}")
            db.rollback()

        u_total = float(child_spend) + float(api_spend)
        u_avg_daily = u_total / days
        u_projected = u_avg_daily * 30

        u_limit = 0.0
        try:
            u_limit = db.query(func.sum(ChildKey.cost_limit_usd)).filter(ChildKey.user_id == u.id, ChildKey.is_active == True).scalar() or 0.0
        except Exception as e:
            import logging
            logging.warning(f"User limit query failed for user {u.id}: {e}")
            db.rollback()

        u_risk = 'low'
        if u_limit > 0 and u_projected > u_limit:
            u_risk = 'high'
        elif u_limit > 0 and u_projected > u_limit * 0.8:
            u_risk = 'medium'

        user_forecasts.append({
            'user_id': u.id,
            'email': u.email,
            'full_name': u.full_name,
            'role': u.role,
            'avg_daily_cost': round(u_avg_daily, 4),
            'projected_monthly_cost': round(u_projected, 4),
            'total_limit': round(u_limit, 2),
            'risk_level': u_risk
        })
        
    user_forecasts = sorted(user_forecasts, key=lambda x: x['projected_monthly_cost'], reverse=True)
    
    return {
        'avg_daily_cost': round(avg_daily, 4),
        'projected_monthly_cost': round(projected_monthly, 4),
        'total_budget_limit': round(total_limit, 2),
        'risk_level': risk,
        'days_of_data': days,
        'member_forecasts': user_forecasts
    }
