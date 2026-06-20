from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case, and_
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.extra import ChildKeyUsage
from app.models.budget import Budget
from app.models.project import Project
from app.models.ci_run import CIRun
from app.api.deps import require_roles
from app.core.config import Role

router = APIRouter(prefix='/analytics', tags=['analytics'])

@router.get('/dashboard', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_dashboard_analytics(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # 1. Token Stats & Timeline
    token_totals = db.query(
        func.sum(LLMCall.prompt_tokens).label('prompt'),
        func.sum(LLMCall.completion_tokens).label('completion')
    ).first()
    
    total_prompt_tokens = int(token_totals.prompt or 0) if token_totals else 0
    total_completion_tokens = int(token_totals.completion or 0) if token_totals else 0

    token_timeline_query = db.query(
        func.date_trunc('day', LLMCall.created_at).label('day'),
        func.sum(LLMCall.prompt_tokens).label('prompt'),
        func.sum(LLMCall.completion_tokens).label('completion')
    ).filter(LLMCall.created_at >= thirty_days_ago).group_by('day').order_by('day').all()

    # Fill daily timeline mapping
    timeline_map = {}
    curr = thirty_days_ago
    while curr <= now:
        day_str = curr.strftime('%Y-%m-%d')
        timeline_map[day_str] = {
            'day': day_str,
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'rate_limits': 0,
            'other_errors': 0
        }
        curr += timedelta(days=1)

    for item in token_timeline_query:
        if item.day:
            day_str = item.day.strftime('%Y-%m-%d')
            if day_str in timeline_map:
                timeline_map[day_str]['prompt_tokens'] = int(item.prompt or 0)
                timeline_map[day_str]['completion_tokens'] = int(item.completion or 0)

    # 2. Rate Limit & Errors Timeline
    errors_query = db.query(
        func.date_trunc('day', ChildKeyUsage.created_at).label('day'),
        func.sum(case((ChildKeyUsage.status_code == 429, 1), else_=0)).label('rate_limits'),
        func.sum(case((or_(
            ChildKeyUsage.status_code.is_(None),
            and_(ChildKeyUsage.status_code >= 400, ChildKeyUsage.status_code != 429)
        ), 1), else_=0)).label('other_errors')
    ).filter(ChildKeyUsage.created_at >= thirty_days_ago).group_by('day').order_by('day').all()


    total_rate_limits = 0
    total_other_errors = 0

    for item in errors_query:
        if item.day:
            day_str = item.day.strftime('%Y-%m-%d')
            rl = int(item.rate_limits or 0)
            oe = int(item.other_errors or 0)
            total_rate_limits += rl
            total_other_errors += oe
            if day_str in timeline_map:
                timeline_map[day_str]['rate_limits'] = rl
                timeline_map[day_str]['other_errors'] = max(0, oe)

    # 3. Project Averages
    project_avg_query = db.query(
        Project.id.label('id'),
        Project.name.label('name'),
        func.avg(LLMCall.prompt_tokens).label('avg_prompt'),
        func.avg(LLMCall.completion_tokens).label('avg_completion'),
        func.avg(LLMCall.prompt_tokens + LLMCall.completion_tokens).label('avg_total')
    ).join(LLMCall, LLMCall.project_id == Project.id).group_by(Project.id, Project.name).all()

    project_averages = [
        {
            'project_id': item.id,
            'name': item.name,
            'avg_prompt_tokens': round(float(item.avg_prompt or 0), 2),
            'avg_completion_tokens': round(float(item.avg_completion or 0), 2),
            'avg_total_tokens': round(float(item.avg_total or 0), 2)
        }
        for item in project_avg_query
    ]

    # 4. Model Costs
    model_costs_query = db.query(
        LLMCall.model.label('model'),
        LLMCall.provider.label('provider'),
        func.sum(LLMCall.cost_usd).label('total_cost'),
        func.count(LLMCall.id).label('calls_count')
    ).group_by(LLMCall.model, LLMCall.provider).order_by(func.sum(LLMCall.cost_usd).desc()).all()

    model_costs = [
        {
            'model': item.model,
            'provider': item.provider,
            'total_cost_usd': round(float(item.total_cost or 0.0), 6),
            'calls_count': int(item.calls_count or 0)
        }
        for item in model_costs_query
    ]

    # 5. Forecast Re-calculation
    llm_daily = db.query(
        func.date_trunc('day', LLMCall.created_at).label('day'),
        func.sum(LLMCall.cost_usd).label('cost')
    ).filter(LLMCall.created_at >= thirty_days_ago).group_by('day').all()

    ci_daily = db.query(
        func.date_trunc('day', CIRun.created_at).label('day'),
        func.sum(CIRun.infra_cost_usd).label('cost')
    ).filter(CIRun.created_at >= thirty_days_ago).group_by('day').all()

    total_llm = sum(float(d.cost) for d in llm_daily) if llm_daily else 0.0
    total_ci = sum(float(d.cost) for d in ci_daily) if ci_daily else 0.0
    days = max(len(llm_daily), len(ci_daily), 1)
    avg_daily = (total_llm + total_ci) / days
    projected_monthly = avg_daily * 30

    budgets = db.query(Budget).all()
    total_limit = sum(b.limit_usd for b in budgets) if budgets else 0.0

    risk = 'low'
    if total_limit > 0 and projected_monthly > total_limit:
        risk = 'high'
    elif total_limit > 0 and projected_monthly > total_limit * 0.8:
        risk = 'medium'

    return {
        'token_stats': {
            'total_prompt_tokens': total_prompt_tokens,
            'total_completion_tokens': total_completion_tokens,
            'total_tokens': total_prompt_tokens + total_completion_tokens
        },
        'rate_limit_stats': {
            'total_rate_limits': total_rate_limits,
            'total_other_errors': total_other_errors,
        },
        'timeline': sorted(list(timeline_map.values()), key=lambda x: x['day']),
        'project_averages': project_averages,
        'model_costs': model_costs,
        'forecast': {
            'avg_daily_cost': round(avg_daily, 6),
            'projected_monthly_cost': round(projected_monthly, 6),
            'total_budget_limit': round(total_limit, 2),
            'risk_level': risk,
            'days_of_data': days
        }
    }
