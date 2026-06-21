from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import ChildKeyCreate, ChildKeyOut, ChildKeyWithSecret, ChildKeySummary
from app.services.master_child_key_service import (
    create_child_key, list_child_keys, revoke_child_key, regenerate_child_key, get_child_key_summary, get_provider_stats
)
from app.api.deps import get_current_user, require_roles
from app.core.config import Role

router = APIRouter(prefix='/child-keys', tags=['child-keys'])

from app.models.user import User

@router.post('/', response_model=ChildKeyWithSecret, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def create_child_key_endpoint(
    payload: ChildKeyCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    target_user_id = current_user.id
    if payload.user_email:
        user_email_clean = payload.user_email.strip().lower()
        user = db.query(User).filter(User.email == user_email_clean).first()
        if not user:
            if current_user.role == Role.ADMIN.value:
                # Create user adhoc
                from app.services.auth_service import hash_password
                name_prefix = user_email_clean.split('@')[0].capitalize()
                user = User(
                    email=user_email_clean,
                    full_name=name_prefix,
                    hashed_password=hash_password("welcome123"), # default temp password
                    role=Role.VIEWER.value
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                raise HTTPException(status_code=404, detail=f"User with email '{payload.user_email}' not found")
        target_user_id = user.id

    key, secret = create_child_key(db, target_user_id, payload.provider_id, payload.name, payload.cost_limit_usd, payload.expires_days, payload.project_id)
    
    owner = db.query(User).filter(User.id == key.user_id).first()
    
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
        user_email=owner.email if owner else None,
        user_name=owner.full_name if owner else None,
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
    keys = list_child_keys(db, user_id=user_id, provider_id=provider_id, skip=skip, limit=limit)
    out_keys = []
    for key in keys:
        owner = db.query(User).filter(User.id == key.user_id).first()
        out_key = ChildKeyOut.model_validate(key)
        out_key.user_email = owner.email if owner else None
        out_key.user_name = owner.full_name if owner else None
        out_keys.append(out_key)
    return out_keys

@router.delete('/{key_id}', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def revoke_child_key_endpoint(key_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    ok = revoke_child_key(db, key_id, user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Child key not found')
    return {'ok': True}

@router.post('/{key_id}/regenerate', response_model=ChildKeyWithSecret, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def regenerate_child_key_endpoint(key_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user_id = None if current_user.role == Role.ADMIN.value else current_user.id
    key, secret = regenerate_child_key(db, key_id, user_id=user_id)

    owner = db.query(User).filter(User.id == key.user_id).first()

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
        user_email=owner.email if owner else None,
        user_name=owner.full_name if owner else None,
        secret_key=secret
    )

@router.get('/{key_id}/summary', response_model=ChildKeySummary, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_child_key_summary_endpoint(key_id: int, db: Session = Depends(get_db)):
    return get_child_key_summary(db, key_id)

@router.get('/providers/{provider_id}/stats', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def get_provider_stats_endpoint(provider_id: int, db: Session = Depends(get_db)):
    return get_provider_stats(db, provider_id)
