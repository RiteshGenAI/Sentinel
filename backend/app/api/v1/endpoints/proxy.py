from fastapi import APIRouter, Depends, Header, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.provider import ProxyRequest, ProxyResponse
from app.services.proxy_service import proxy_chat_completions
from app.api.deps import get_current_user_or_api_key
from typing import Optional, Any

router = APIRouter(prefix='/proxy', tags=['proxy'])

@router.post('/chat/completions')
async def proxy_chat_completions_endpoint(
    payload: ProxyRequest,
    request: Request,
    x_api_key: Optional[str] = Header(None, alias='X-API-Key'),
    db: Session = Depends(get_db)
) -> Any:
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
    if payload.stream:
        return StreamingResponse(result, media_type='text/event-stream')
    return result
