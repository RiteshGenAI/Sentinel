from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.project import Project
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.models.extra import ApiKey
from app.schemas.llm_call import LLMCallCreate
from app.schemas.ci_run import CIRunCreate
from app.services.pricing_service import compute_llm_cost, compute_ci_cost
from app.services.api_key_service import check_api_key_limit, add_cost_to_api_key

def _get_or_create_project(db: Session, project_name: str | None):
    if not project_name:
        return None
    project = db.query(Project).filter(Project.name == project_name).first()
    if not project:
        project = Project(name=project_name, description='')
        db.add(project)
        db.flush()
    return project.id

def create_llm_call(db: Session, payload: LLMCallCreate, api_key: ApiKey | None = None):
    cost = compute_llm_cost(payload.provider, payload.model, payload.prompt_tokens, payload.completion_tokens)
    
    # Check API key limit if present
    if api_key is not None:
        if not check_api_key_limit(db, api_key, cost):
            raise HTTPException(status_code=429, detail=f'API key cost limit exceeded: ${api_key.total_cost_usd:.4f} / ${api_key.cost_limit_usd:.4f}')
    
    row = LLMCall(
        provider=payload.provider,
        model=payload.model,
        prompt_tokens=payload.prompt_tokens,
        completion_tokens=payload.completion_tokens,
        cost_usd=cost,
        latency_ms=payload.latency_ms,
        feature_name=payload.feature_name,
        agent_name=payload.agent_name,
        project_id=_get_or_create_project(db, payload.project_name),
        api_key_id=api_key.id if api_key else None
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    # Track cost against API key
    if api_key is not None:
        add_cost_to_api_key(db, api_key, cost, llm_call_id=row.id)
    
    return {'id': row.id, 'cost_usd': row.cost_usd, 'total_tokens': row.prompt_tokens + row.completion_tokens}

def create_ci_run(db: Session, payload: CIRunCreate, api_key: ApiKey | None = None):
    cost = compute_ci_cost(payload.runner_type, payload.duration_seconds)
    
    # Check API key limit if present
    if api_key is not None:
        if not check_api_key_limit(db, api_key, cost):
            raise HTTPException(status_code=429, detail=f'API key cost limit exceeded: ${api_key.total_cost_usd:.4f} / ${api_key.cost_limit_usd:.4f}')
    
    row = CIRun(
        pipeline=payload.pipeline,
        job=payload.job,
        runner_type=payload.runner_type,
        duration_seconds=payload.duration_seconds,
        infra_cost_usd=cost,
        project_id=_get_or_create_project(db, payload.project_name),
        api_key_id=api_key.id if api_key else None
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    # Track cost against API key
    if api_key is not None:
        add_cost_to_api_key(db, api_key, cost, ci_run_id=row.id)
    
    return {'id': row.id, 'infra_cost_usd': row.infra_cost_usd}
