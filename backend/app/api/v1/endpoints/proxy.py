from fastapi import APIRouter, Depends, Header, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import ProxyRequest, ProxyResponse
from app.services.proxy_service import proxy_chat_completions
from app.api.deps import get_current_user_or_api_key
from typing import Optional

router = APIRouter(prefix='/proxy', tags=['proxy'])

@router.post('/chat/completions', response_model=ProxyResponse)
async def proxy_chat_completions_endpoint(
    payload: ProxyRequest,
    request: Request,
    x_api_key: Optional[str] = Header(None, alias='X-API-Key'),
    db: Session = Depends(get_db)
):
    """Proxy chat completions to the provider through a child key."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail='X-API-Key header required')
    
    body = {
        'model': payload.model,
        'messages': payload.messages,
        'max_tokens': payload.max_tokens,
    }
    if payload.temperature is not None:
        body['temperature'] = payload.temperature
    if payload.stream:
        body['stream'] = payload.stream
    
    result = await proxy_chat_completions(db, x_api_key, body)
    return result
