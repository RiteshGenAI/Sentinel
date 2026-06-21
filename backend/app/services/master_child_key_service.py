import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.core.crypto import encrypt_key, decrypt_key
from app.models.extra import Provider, MasterKey, ChildKey, ChildKeyUsage, MasterKeyUsage
from app.services.provider_service import get_provider

MASTER_KEY_PREFIX = 'mk_'

def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def _generate_key(prefix: str = 'sk_child_') -> str:
    return prefix + secrets.token_urlsafe(32)

# ============ MASTER KEY ============

def add_master_key(db: Session, provider_id: int, raw_key: str, name: str = 'Default') -> MasterKey:
    """
    Encrypts and saves a new provider master API key to the database.
    """
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail='Provider not found')
    
    key_hash = _hash_key(raw_key)
    existing = db.query(MasterKey).filter(MasterKey.key_hash == key_hash).first()
    if existing:
        raise HTTPException(status_code=400, detail='This key already exists')
    
    prefix = raw_key[:20] if len(raw_key) >= 20 else raw_key[:10] + '...'
    encrypted = encrypt_key(raw_key)
    master = MasterKey(
        provider_id=provider_id,
        key_hash=key_hash,
        key_prefix=prefix,
        key_encrypted=encrypted,
        name=name.strip()
    )
    db.add(master)
    db.commit()
    db.refresh(master)
    return master


def get_decrypted_master_key(db: Session, master_key_id: int) -> str | None:
    """Retrieve and decrypt a master key."""
    key = db.query(MasterKey).filter(MasterKey.id == master_key_id, MasterKey.is_active == True).first()
    if not key:
        return None
    try:
        return decrypt_key(key.key_encrypted)
    except Exception:
        return None

def list_master_keys(db: Session, provider_id: int | None = None, skip: int = 0, limit: int = 100):
    """
    Lists active master API credentials with optional provider filtering.
    """
    query = db.query(MasterKey).filter(MasterKey.is_active == True)
    if provider_id is not None:
        query = query.filter(MasterKey.provider_id == provider_id)
    return query.offset(skip).limit(limit).all()

def revoke_master_key(db: Session, key_id: int) -> bool:
    """
    Deactivates a master key by marking is_active = False.
    """
    key = db.query(MasterKey).filter(MasterKey.id == key_id).first()
    if not key:
        return False
    key.is_active = False
    db.commit()
    return True

def pick_master_key(db: Session, provider_id: int) -> MasterKey | None:
    """Pick the least-used active master key for a provider."""
    return db.query(MasterKey).filter(
        MasterKey.provider_id == provider_id,
        MasterKey.is_active == True
    ).order_by(MasterKey.current_rpm.asc(), MasterKey.total_requests.asc()).first()

def check_master_key_rate_limit(db: Session, key: MasterKey, provider: Provider) -> bool:
    """Returns True if request is allowed. Resets RPM counter if needed."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if key.rpm_reset_at and key.rpm_reset_at.replace(tzinfo=None) < now:
        key.current_rpm = 0
        key.rpm_reset_at = now + timedelta(minutes=1)
    else:
        if not key.rpm_reset_at:
            key.rpm_reset_at = now + timedelta(minutes=1)
    
    if key.current_rpm >= provider.rate_limit_rpm:
        return False
    
    key.current_rpm += 1
    db.commit()
    return True

def track_master_key_usage(db: Session, key: MasterKey, cost: float, tokens: int, child_key_id: int | None, request_path: str | None, status_code: int | None):
    """
    Updates total spend and request aggregates for a master key, and logs a MasterKeyUsage record.
    """
    key.total_cost_usd += cost
    key.total_requests += 1
    key.total_tokens += tokens
    db.commit()
    
    usage = MasterKeyUsage(
        master_key_id=key.id,
        child_key_id=child_key_id,
        request_path=request_path,
        cost_usd=cost,
        tokens_used=tokens,
        status_code=status_code
    )
    db.add(usage)
    db.commit()

# ============ CHILD KEY ============

def create_child_key(db: Session, user_id: int, provider_id: int, name: str, cost_limit_usd: float = 20.0, expires_days: int | None = None, project_id: int | None = None) -> tuple[ChildKey, str]:
    """
    Generates a secure child API key, hashes it for database search, and links it to a project scope.
    """
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail='Provider not found')
    
    raw = _generate_key('sk_child_')
    key_hash = _hash_key(raw)
    prefix = raw[:20]
    expires = None
    if expires_days:
        expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=expires_days)
    
    child = ChildKey(
        key_hash=key_hash,
        key_prefix=prefix,
        name=name.strip(),
        user_id=user_id,
        provider_id=provider_id,
        project_id=project_id,
        cost_limit_usd=cost_limit_usd,
        expires_at=expires
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return child, raw

def validate_child_key(db: Session, raw_key: str | None) -> ChildKey | None:
    """
    Validates if a child key is active, exists, and is not past its expiration date.
    """
    if not raw_key:
        return None
    key_hash = _hash_key(raw_key)
    key = db.query(ChildKey).filter(ChildKey.key_hash == key_hash, ChildKey.is_active == True).first()
    if not key:
        return None
    if key.expires_at and key.expires_at.replace(tzinfo=None) < datetime.now(timezone.utc).replace(tzinfo=None):
        return None
    key.last_used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return key

def list_child_keys(db: Session, user_id: int | None = None, provider_id: int | None = None, skip: int = 0, limit: int = 100):
    query = db.query(ChildKey)
    if user_id is not None:
        query = query.filter(ChildKey.user_id == user_id)
    if provider_id is not None:
        query = query.filter(ChildKey.provider_id == provider_id)
    return query.offset(skip).limit(limit).all()

def revoke_child_key(db: Session, key_id: int, user_id: int | None = None) -> bool:
    query = db.query(ChildKey).filter(ChildKey.id == key_id)
    if user_id is not None:
        query = query.filter(ChildKey.user_id == user_id)
    key = query.first()
    if not key:
        return False
    key.is_active = False
    db.commit()
    return True

def regenerate_child_key(db: Session, key_id: int, user_id: int | None = None) -> tuple[ChildKey, str]:
    """
    Regenerates a child key by creating a new secret key while preserving the original configuration.
    Deactivates the old key and creates a new one with the same settings.
    """
    query = db.query(ChildKey).filter(ChildKey.id == key_id)
    if user_id is not None:
        query = query.filter(ChildKey.user_id == user_id)
    old_key = query.first()
    if not old_key:
        raise HTTPException(status_code=404, detail='Child key not found')

    # Preserve the old configuration
    config = {
        'user_id': old_key.user_id,
        'provider_id': old_key.provider_id,
        'name': old_key.name,
        'cost_limit_usd': old_key.cost_limit_usd,
        'project_id': old_key.project_id,
    }

    # Calculate expiration days if the old key had an expiration
    expires_days = None
    if old_key.expires_at:
        remaining = old_key.expires_at.replace(tzinfo=None) - datetime.now(timezone.utc).replace(tzinfo=None)
        if remaining.total_seconds() > 0:
            expires_days = max(1, int(remaining.total_seconds() / 86400))

    # Deactivate the old key
    old_key.is_active = False
    db.commit()

    # Create a new key with the same configuration
    new_key, secret = create_child_key(
        db,
        config['user_id'],
        config['provider_id'],
        config['name'],
        config['cost_limit_usd'],
        expires_days,
        config['project_id']
    )

    return new_key, secret

def check_child_key_limit(db: Session, key: ChildKey, cost: float) -> bool:
    """
    Checks if adding the estimated cost would exceed the child key's budget limits.
    """
    return key.total_cost_usd + cost <= key.cost_limit_usd

def track_child_key_usage(db: Session, key: ChildKey, cost: float, tokens: int, master_key_id: int | None, request_path: str | None, status_code: int | None, error: str | None = None):
    """
    Logs actual child key completion transactions, updating spent statistics and inserting usage records.
    """
    key.total_cost_usd += cost
    key.total_requests += 1
    key.total_tokens += tokens
    db.commit()
    
    usage = ChildKeyUsage(
        child_key_id=key.id,
        master_key_id=master_key_id,
        provider_id=key.provider_id,
        request_path=request_path,
        cost_usd=cost,
        tokens_used=tokens,
        status_code=status_code,
        error_message=error
    )
    db.add(usage)
    db.commit()

def get_child_key_summary(db: Session, key_id: int) -> dict:
    key = db.query(ChildKey).filter(ChildKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail='Child key not found')
    
    total_cost = db.query(func.sum(ChildKeyUsage.cost_usd)).filter(ChildKeyUsage.child_key_id == key_id).scalar() or 0.0
    total_reqs = db.query(func.count(ChildKeyUsage.id)).filter(ChildKeyUsage.child_key_id == key_id).scalar() or 0
    total_tokens = db.query(func.sum(ChildKeyUsage.tokens_used)).filter(ChildKeyUsage.child_key_id == key_id).scalar() or 0
    
    # Get provider name
    provider = db.query(Provider).filter(Provider.id == key.provider_id).first()
    
    return {
        'key_id': key_id,
        'name': key.name,
        'provider': provider.display_name if provider else 'Unknown',
        'cost_limit_usd': key.cost_limit_usd,
        'total_cost_usd': float(total_cost),
        'total_requests': int(total_reqs),
        'total_tokens': int(total_tokens),
        'remaining_usd': max(0.0, key.cost_limit_usd - float(total_cost)),
        'is_active': key.is_active,
        'expires_at': key.expires_at.isoformat() if key.expires_at else None
    }

def get_provider_stats(db: Session, provider_id: int) -> dict:
    """
    Aggregates active keys, requests count, and total spend for a given AI provider.
    """
    master_count = db.query(func.count(MasterKey.id)).filter(MasterKey.provider_id == provider_id, MasterKey.is_active == True).scalar() or 0
    child_count = db.query(func.count(ChildKey.id)).filter(ChildKey.provider_id == provider_id, ChildKey.is_active == True).scalar() or 0
    total_cost = db.query(func.sum(MasterKeyUsage.cost_usd)).filter(MasterKeyUsage.master_key_id.in_(
        db.query(MasterKey.id).filter(MasterKey.provider_id == provider_id)
    )).scalar() or 0.0
    total_reqs = db.query(func.count(MasterKeyUsage.id)).filter(MasterKeyUsage.master_key_id.in_(
        db.query(MasterKey.id).filter(MasterKey.provider_id == provider_id)
    )).scalar() or 0
    
    return {
        'provider_id': provider_id,
        'active_master_keys': int(master_count),
        'active_child_keys': int(child_count),
        'total_cost_usd': float(total_cost),
        'total_requests': int(total_reqs)
    }
