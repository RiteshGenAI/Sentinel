from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.llm_call import LLMCallCreate, LLMCallOut
from app.schemas.ci_run import CIRunCreate, CIRunOut
from app.services.ingest_service import create_llm_call, create_ci_run
from app.api.deps import get_current_user_or_api_key, require_roles_or_api_key
from app.core.config import Role
from app.models.extra import ApiKey

router = APIRouter(prefix='/ingest', tags=['ingest'])

def _get_api_key_from_user(user) -> ApiKey | None:
    return getattr(user, '_api_key', None)

@router.post('/llm-call', response_model=LLMCallOut)
def create_llm_call_endpoint(
    payload: LLMCallCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_api_key)
):
    api_key = _get_api_key_from_user(current_user)
    return create_llm_call(db, payload, api_key=api_key)

@router.post('/ci-run', response_model=CIRunOut)
def create_ci_run_endpoint(
    payload: CIRunCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_api_key)
):
    api_key = _get_api_key_from_user(current_user)
    return create_ci_run(db, payload, api_key=api_key)
