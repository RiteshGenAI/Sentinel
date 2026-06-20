import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.extra import ApiKey, ApiKeyUsage
from app.schemas.api_key import ApiKeyCreate

API_KEY_PREFIX = 'sk_sentinel_'

def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def _generate_key() -> str:
    return API_KEY_PREFIX + secrets.token_urlsafe(32)

def create_api_key(db: Session, user_id: int, payload: ApiKeyCreate) -> tuple[ApiKey, str]:
    raw_key = _generate_key()
    key_hash = _hash_key(raw_key)
    prefix = raw_key[:20]  # e.g. "sk_sentinel_abc..."
    expires = None
    if payload.expires_days:
        expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=payload.expires_days)
    
    key = ApiKey(
        key_hash=key_hash,
        key_prefix=prefix,
        name=payload.name.strip(),
        user_id=user_id,
        project_id=payload.project_id,
        cost_limit_usd=payload.cost_limit_usd,
        total_cost_usd=0.0,
        expires_at=expires
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key, raw_key

def validate_api_key(db: Session, raw_key: str | None) -> ApiKey | None:
    if not raw_key:
        return None
    key_hash = _hash_key(raw_key)
    key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True).first()
    if not key:
        return None
    if key.expires_at and key.expires_at.replace(tzinfo=None) < datetime.now(timezone.utc).replace(tzinfo=None):
        return None
    key.last_used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return key

def get_api_key_by_id(db: Session, key_id: int) -> ApiKey | None:
    return db.query(ApiKey).filter(ApiKey.id == key_id).first()

def list_api_keys(db: Session, user_id: int | None = None, skip: int = 0, limit: int = 100):
    query = db.query(ApiKey)
    if user_id is not None:
        query = query.filter(ApiKey.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def revoke_api_key(db: Session, key_id: int, user_id: int | None = None) -> bool:
    query = db.query(ApiKey).filter(ApiKey.id == key_id)
    if user_id is not None:
        query = query.filter(ApiKey.user_id == user_id)
    key = query.first()
    if not key:
        return False
    key.is_active = False
    db.commit()
    return True

def check_api_key_limit(db: Session, key: ApiKey, cost: float) -> bool:
    """Returns True if request is allowed, False if limit exceeded."""
    if key.total_cost_usd + cost > key.cost_limit_usd:
        return False
    return True

def add_cost_to_api_key(db: Session, key: ApiKey, cost: float, llm_call_id: int | None = None, ci_run_id: int | None = None):
    key.total_cost_usd += cost
    usage = ApiKeyUsage(
        api_key_id=key.id,
        llm_call_id=llm_call_id,
        ci_run_id=ci_run_id,
        cost_usd=cost
    )
    db.add(usage)
    db.commit()

def get_api_key_usage(db: Session, key_id: int, skip: int = 0, limit: int = 100):
    return db.query(ApiKeyUsage).filter(ApiKeyUsage.api_key_id == key_id).offset(skip).limit(limit).all()

def get_api_key_usage_summary(db: Session, key_id: int) -> dict:
    from sqlalchemy import func
    total = db.query(func.sum(ApiKeyUsage.cost_usd)).filter(ApiKeyUsage.api_key_id == key_id).scalar() or 0.0
    count = db.query(func.count(ApiKeyUsage.id)).filter(ApiKeyUsage.api_key_id == key_id).scalar() or 0
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail='API key not found')
    return {
        'key_id': key_id,
        'name': key.name,
        'cost_limit_usd': key.cost_limit_usd,
        'total_cost_usd': float(total),
        'usage_count': int(count),
        'remaining_usd': max(0.0, key.cost_limit_usd - float(total)),
        'is_active': key.is_active,
        'expires_at': key.expires_at.isoformat() if key.expires_at else None
    }
