from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import ProviderOut, ProviderCreate
from app.services.provider_service import list_providers, get_provider, create_provider
from app.api.deps import require_roles
from app.core.config import Role

router = APIRouter(prefix='/providers', tags=['providers'])

@router.post('/', response_model=ProviderOut, dependencies=[Depends(require_roles(Role.ADMIN))])
def create_provider_endpoint(payload: ProviderCreate, db: Session = Depends(get_db)):
    return create_provider(db, payload)

@router.get('/', response_model=list[ProviderOut])
def list_providers_endpoint(db: Session = Depends(get_db)):
    return list_providers(db)

@router.get('/{provider_id}', response_model=ProviderOut)
def get_provider_endpoint(provider_id: int, db: Session = Depends(get_db)):
    p = get_provider(db, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail='Provider not found')
    return p
