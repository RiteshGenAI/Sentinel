from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import ChildKeyCreate, ChildKeyOut, ChildKeyWithSecret, ChildKeySummary, ProxyRequest, ProxyResponse
from app.services.master_child_key_service import (
    create_child_key, list_child_keys, revoke_child_key, get_child_key_summary, get_provider_stats
)
from app.services.proxy_service import proxy_chat_completions
from app.api.deps import get_current_user, require_roles
from app.core.config import Role

router = APIRouter(prefix='/child-keys', tags=['child-keys'])

@router.post('/', response_model=ChildKeyWithSecret, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def create_child_key_endpoint(
    payload: ChildKeyCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    key, secret = create_child_key(db, current_user.id, payload.provider_id, payload.name, payload.cost_limit_usd, payload.expires_days, payload.project_id)
    return ChildKeyWithSecret(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        user_id=key.user_id,
        provider_id=key.provider_id,
        project_id=key.project_id,
        cost_limit_usd=key.cost_limit_usd,
        total_cost_usd=key.total_cost_usd,
        total_requests=key.total_requests,
        total_tokens=key.total_tokens,
        is_active=key.is_active,
        created_at=key.created_at,
        expires_at=key.expires_at,
        last_used_at=key.last_used_at,
        secret_key=secret
    )

@router.get('/', response_model=list[ChildKeyOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def list_child_keys_endpoint(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    provider_id: int | None = None,
    skip: int = 0,
    limit: int = 100
):
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    return list_child_keys(db, user_id=user_id, provider_id=provider_id, skip=skip, limit=limit)

@router.delete('/{key_id}', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def revoke_child_key_endpoint(key_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    ok = revoke_child_key(db, key_id, user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Child key not found')
    return {'ok': True}

@router.get('/{key_id}/summary', response_model=ChildKeySummary, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_child_key_summary_endpoint(key_id: int, db: Session = Depends(get_db)):
    return get_child_key_summary(db, key_id)

@router.get('/providers/{provider_id}/stats', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def get_provider_stats_endpoint(provider_id: int, db: Session = Depends(get_db)):
    return get_provider_stats(db, provider_id)
