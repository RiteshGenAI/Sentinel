from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.models.budget import Budget
from app.models.project import Project
from app.api.deps import require_roles
from app.core.config import Role
import csv
from io import StringIO
from datetime import datetime, timezone

router = APIRouter(prefix='/export', tags=['export'])

@router.get('/llm-calls', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def export_llm_calls(db: Session = Depends(get_db)):
    rows = db.query(LLMCall).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'provider', 'model', 'prompt_tokens', 'completion_tokens', 'cost_usd', 'latency_ms', 'feature_name', 'agent_name', 'project_id', 'created_at'])
    for r in rows:
        writer.writerow([r.id, r.provider, r.model, r.prompt_tokens, r.completion_tokens, r.cost_usd, r.latency_ms, r.feature_name, r.agent_name, r.project_id, r.created_at])
    return {'csv': output.getvalue()}

@router.get('/ci-runs', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def export_ci_runs(db: Session = Depends(get_db)):
    rows = db.query(CIRun).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'pipeline', 'job', 'runner_type', 'duration_seconds', 'infra_cost_usd', 'project_id', 'created_at'])
    for r in rows:
        writer.writerow([r.id, r.pipeline, r.job, r.runner_type, r.duration_seconds, r.infra_cost_usd, r.project_id, r.created_at])
    return {'csv': output.getvalue()}

@router.get('/budgets', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def export_budgets(db: Session = Depends(get_db)):
    rows = db.query(Budget).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'scope', 'period', 'limit_usd', 'warning_threshold', 'critical_threshold', 'project_id', 'created_at'])
    for r in rows:
        writer.writerow([r.id, r.scope, r.period, r.limit_usd, r.warning_threshold, r.critical_threshold, r.project_id, r.created_at])
    return {'csv': output.getvalue()}
