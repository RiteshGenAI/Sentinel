from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import MasterKeyCreate, MasterKeyOut
from app.services.master_child_key_service import add_master_key, list_master_keys, revoke_master_key
from app.api.deps import get_current_user, require_roles
from app.core.config import Role

router = APIRouter(prefix='/master-keys', tags=['master-keys'])

@router.post('/', response_model=MasterKeyOut, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def add_master_key_endpoint(payload: MasterKeyCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return add_master_key(db, payload.provider_id, payload.raw_key, payload.name)

@router.get('/', response_model=list[MasterKeyOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def list_master_keys_endpoint(
    provider_id: int | None = None,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    return list_master_keys(db, provider_id=provider_id, skip=skip, limit=limit)

@router.delete('/{key_id}', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def revoke_master_key_endpoint(key_id: int, db: Session = Depends(get_db)):
    ok = revoke_master_key(db, key_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Master key not found')
    return {'ok': True}
