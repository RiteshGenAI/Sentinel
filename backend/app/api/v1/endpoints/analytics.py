from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case, and_, text
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.extra import ChildKeyUsage
from app.models.budget import Budget
from app.models.project import Project
from app.models.ci_run import CIRun
from app.api.deps import require_roles
from app.core.config import Role
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/analytics', tags=['analytics'])

@router.get('/dashboard', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_dashboard_analytics(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    thirty_days_ago = now - timedelta(days=30)

    # ── 1. Token Stats ────────────────────────────────────────────────────────
    total_prompt_tokens = 0
    total_completion_tokens = 0
    try:
        token_totals = db.query(
            func.sum(LLMCall.prompt_tokens).label('prompt'),
            func.sum(LLMCall.completion_tokens).label('completion')
        ).first()
        total_prompt_tokens = int(token_totals.prompt or 0) if token_totals else 0
        total_completion_tokens = int(token_totals.completion or 0) if token_totals else 0
    except Exception as e:
        logger.warning(f"Token stats query failed: {e}")
        db.rollback()

    # ── 2. Token Timeline (30-day) ────────────────────────────────────────────
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

    try:
        token_timeline_query = db.query(
            func.date_trunc('day', LLMCall.created_at).label('day'),
            func.sum(LLMCall.prompt_tokens).label('prompt'),
            func.sum(LLMCall.completion_tokens).label('completion')
        ).filter(
            LLMCall.created_at >= thirty_days_ago
        ).group_by(
            text('day')
        ).order_by(
            text('day')
        ).all()

        for item in token_timeline_query:
            if item.day:
                day_str = item.day.strftime('%Y-%m-%d')
                if day_str in timeline_map:
                    timeline_map[day_str]['prompt_tokens'] = int(item.prompt or 0)
                    timeline_map[day_str]['completion_tokens'] = int(item.completion or 0)
    except Exception as e:
        logger.warning(f"Token timeline query failed: {e}")
        db.rollback()

    # ── 3. Rate Limit & Error Timeline ───────────────────────────────────────
    total_rate_limits = 0
    total_other_errors = 0
    try:
        errors_query = db.query(
            func.date_trunc('day', ChildKeyUsage.created_at).label('day'),
            func.sum(case((ChildKeyUsage.status_code == 429, 1), else_=0)).label('rate_limits'),
            func.sum(case((or_(
                ChildKeyUsage.status_code.is_(None),
                and_(ChildKeyUsage.status_code >= 400, ChildKeyUsage.status_code != 429)
            ), 1), else_=0)).label('other_errors')
        ).filter(
            ChildKeyUsage.created_at >= thirty_days_ago
        ).group_by(
            text('day')
        ).order_by(
            text('day')
        ).all()

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
    except Exception as e:
        logger.warning(f"Error timeline query failed: {e}")
        db.rollback()

    # ── 4. Project Averages ───────────────────────────────────────────────────
    project_averages = []
    try:
        project_avg_query = db.query(
            Project.id.label('id'),
            Project.name.label('name'),
            func.avg(LLMCall.prompt_tokens).label('avg_prompt'),
            func.avg(LLMCall.completion_tokens).label('avg_completion'),
            func.avg(LLMCall.prompt_tokens + LLMCall.completion_tokens).label('avg_total')
        ).join(LLMCall, LLMCall.project_id == Project.id).group_by(
            Project.id, Project.name
        ).all()

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
    except Exception as e:
        logger.warning(f"Project averages query failed: {e}")
        db.rollback()

    # ── 5. Project Costs ──────────────────────────────────────────────────────
    project_costs = []
    try:
        llm_costs = dict(db.query(
            LLMCall.project_id,
            func.sum(LLMCall.cost_usd)
        ).group_by(LLMCall.project_id).all())

        ci_costs = dict(db.query(
            CIRun.project_id,
            func.sum(CIRun.infra_cost_usd)
        ).group_by(CIRun.project_id).all())

        projects = db.query(Project).all()
        for p in projects:
            p_llm = float(llm_costs.get(p.id) or 0.0)
            p_ci = float(ci_costs.get(p.id) or 0.0)
            project_costs.append({
                'project_id': p.id,
                'name': p.name,
                'total_cost': round(p_llm + p_ci, 6)
            })
    except Exception as e:
        logger.warning(f"Project costs query failed: {e}")
        db.rollback()

    # ── 6. Model Costs ────────────────────────────────────────────────────────
    model_costs = []
    try:
        model_costs_query = db.query(
            LLMCall.model.label('model'),
            LLMCall.provider.label('provider'),
            func.sum(LLMCall.cost_usd).label('total_cost'),
            func.count(LLMCall.id).label('calls_count')
        ).group_by(LLMCall.model, LLMCall.provider).order_by(
            func.sum(LLMCall.cost_usd).desc()
        ).all()

        model_costs = [
            {
                'model': item.model,
                'provider': item.provider,
                'total_cost_usd': round(float(item.total_cost or 0.0), 6),
                'calls_count': int(item.calls_count or 0)
            }
            for item in model_costs_query
        ]
    except Exception as e:
        logger.warning(f"Model costs query failed: {e}")
        db.rollback()

    # ── 7. Forecast ───────────────────────────────────────────────────────────
    avg_daily = 0.0
    projected_monthly = 0.0
    total_limit = 0.0
    days = 1
    risk = 'low'
    try:
        llm_daily = db.query(
            func.date_trunc('day', LLMCall.created_at).label('day'),
            func.sum(LLMCall.cost_usd).label('cost')
        ).filter(LLMCall.created_at >= thirty_days_ago).group_by(
            text('day')
        ).all()

        ci_daily = db.query(
            func.date_trunc('day', CIRun.created_at).label('day'),
            func.sum(CIRun.infra_cost_usd).label('cost')
        ).filter(CIRun.created_at >= thirty_days_ago).group_by(
            text('day')
        ).all()

        total_llm = sum(float(d.cost or 0.0) for d in llm_daily) if llm_daily else 0.0
        total_ci = sum(float(d.cost or 0.0) for d in ci_daily) if ci_daily else 0.0
        days = max(len(llm_daily), len(ci_daily), 1)
        avg_daily = (total_llm + total_ci) / days
        projected_monthly = avg_daily * 30

        budgets = db.query(Budget).all()
        total_limit = sum(b.limit_usd for b in budgets) if budgets else 0.0

        if total_limit > 0 and projected_monthly > total_limit:
            risk = 'high'
        elif total_limit > 0 and projected_monthly > total_limit * 0.8:
            risk = 'medium'
    except Exception as e:
        logger.warning(f"Forecast query failed: {e}")
        db.rollback()

    # ── 8. Member Costs ───────────────────────────────────────────────────────
    user_costs = []
    try:
        from app.models.user import User
        from app.models.extra import ChildKey, ChildKeyUsage as CKU, ApiKey

        users = db.query(User).all()
        for u in users:
            child_spend = 0.0
            try:
                child_spend = db.query(func.sum(CKU.cost_usd)).filter(
                    CKU.child_key_id.in_(
                        db.query(ChildKey.id).filter(ChildKey.user_id == u.id)
                    )
                ).scalar() or 0.0
            except Exception as ce:
                logger.warning(f"child_spend query failed for user {u.id}: {ce}")

            # Sum LLM call costs linked via api_key_id
            api_spend = 0.0
            try:
                api_key_ids_sub = db.query(ApiKey.id).filter(ApiKey.user_id == u.id).subquery()
                api_spend = db.query(func.sum(LLMCall.cost_usd)).filter(
                    LLMCall.api_key_id.in_(api_key_ids_sub)
                ).scalar() or 0.0
            except Exception as ae:
                logger.warning(f"api_spend query failed for user {u.id}: {ae}")

            user_costs.append({
                'user_id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'role': u.role,
                'total_spent_usd': round(float(child_spend) + float(api_spend), 6)
            })

        user_costs = sorted(user_costs, key=lambda x: x['total_spent_usd'], reverse=True)
    except Exception as e:
        logger.warning(f"Member costs section failed: {e}")
        db.rollback()

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
        'project_costs': project_costs,
        'model_costs': model_costs,
        'member_costs': user_costs,
        'forecast': {
            'avg_daily_cost': round(avg_daily, 6),
            'projected_monthly_cost': round(projected_monthly, 6),
            'total_budget_limit': round(total_limit, 2),
            'risk_level': risk,
            'days_of_data': days
        }
    }
