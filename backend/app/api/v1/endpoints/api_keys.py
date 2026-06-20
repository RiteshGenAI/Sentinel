from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.api_key import ApiKeyCreate, ApiKeyOut, ApiKeyWithSecret, ApiKeyUsageOut
from app.services.api_key_service import (
    create_api_key, list_api_keys, revoke_api_key, get_api_key_by_id,
    get_api_key_usage, get_api_key_usage_summary
)
from app.api.deps import get_current_user, require_admin, require_roles
from app.core.config import Role

router = APIRouter(prefix='/api-keys', tags=['api-keys'])

@router.post('/', response_model=ApiKeyWithSecret, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def generate_api_key(payload: ApiKeyCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    key, secret = create_api_key(db, current_user.id, payload)
    # Build the response manually since we need to include the secret
    return ApiKeyWithSecret(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        user_id=key.user_id,
        project_id=key.project_id,
        cost_limit_usd=key.cost_limit_usd,
        total_cost_usd=key.total_cost_usd,
        is_active=key.is_active,
        created_at=key.created_at,
        expires_at=key.expires_at,
        last_used_at=key.last_used_at,
        secret_key=secret
    )

@router.get('/', response_model=list[ApiKeyOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def list_api_keys_endpoint(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    # Admin sees all keys, others see only their own
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    return list_api_keys(db, user_id=user_id, skip=skip, limit=limit)

@router.delete('/{key_id}', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def revoke_api_key_endpoint(key_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Admin can revoke any key, manager can only revoke their own
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    ok = revoke_api_key(db, key_id, user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail='API key not found')
    return {'ok': True}

@router.get('/{key_id}/usage', response_model=list[ApiKeyUsageOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_api_key_usage_endpoint(key_id: int, db: Session = Depends(get_db), skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)):
    key = get_api_key_by_id(db, key_id)
    if not key:
        raise HTTPException(status_code=404, detail='API key not found')
    return get_api_key_usage(db, key_id, skip=skip, limit=limit)

@router.get('/{key_id}/summary', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_api_key_summary_endpoint(key_id: int, db: Session = Depends(get_db)):
    return get_api_key_usage_summary(db, key_id)
