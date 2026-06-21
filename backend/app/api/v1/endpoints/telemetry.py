from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.models.llm_call import LLMCall
from app.models.project import Project
from app.api.deps import require_roles
from app.core.config import Role
from typing import Optional

router = APIRouter(prefix='/telemetry', tags=['telemetry'])

@router.get('/calls', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_telemetry_calls(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    project_id: Optional[int] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    search: Optional[str] = None
):
    query = db.query(
        LLMCall.id,
        LLMCall.provider,
        LLMCall.model,
        LLMCall.prompt_tokens,
        LLMCall.completion_tokens,
        LLMCall.cost_usd,
        LLMCall.latency_ms,
        LLMCall.created_at,
        LLMCall.project_id,
        Project.name.label('project_name')
    ).outerjoin(Project, LLMCall.project_id == Project.id)
    
    if project_id is not None:
        query = query.filter(LLMCall.project_id == project_id)
    if provider:
        query = query.filter(LLMCall.provider.ilike(f"%{provider}%"))
    if model:
        query = query.filter(LLMCall.model.ilike(f"%{model}%"))
    if search:
        query = query.filter(
            (LLMCall.model.ilike(f"%{search}%")) |
            (LLMCall.provider.ilike(f"%{search}%")) |
            (Project.name.ilike(f"%{search}%"))
        )
        
    total = query.count()
    items = query.order_by(desc(LLMCall.created_at)).offset((page - 1) * size).limit(size).all()
    
    results = []
    for item in items:
        results.append({
            "id": item.id,
            "provider": item.provider,
            "model": item.model,
            "prompt_tokens": item.prompt_tokens,
            "completion_tokens": item.completion_tokens,
            "cost_usd": item.cost_usd,
            "latency_ms": item.latency_ms,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "project_id": item.project_id,
            "project_name": item.project_name or "Unknown / General"
        })
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }
