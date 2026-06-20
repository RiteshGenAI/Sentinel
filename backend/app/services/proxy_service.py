import time
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app.models.extra import Provider, MasterKey, ChildKey
from app.models.llm_call import LLMCall
from app.services.master_child_key_service import (
    validate_child_key, pick_master_key, check_master_key_rate_limit,
    track_master_key_usage, track_child_key_usage, check_child_key_limit,
    get_decrypted_master_key
)
from app.services.provider_service import get_provider


# Simple token/cost estimation for proxy requests
PROMPT_PRICING = {
    'openai': {
        'gpt-4.1': 0.002, 'gpt-4.1-mini': 0.0004,
        'gpt-4o': 0.005, 'gpt-4o-mini': 0.00015,
        'gpt-4-turbo': 0.01, 'gpt-3.5-turbo': 0.0005
    },
    'anthropic': {
        'claude-3-5-sonnet': 0.003, 'claude-3-opus': 0.015,
        'claude-3-haiku': 0.00025, 'claude-3-sonnet': 0.003
    },
    'deepseek': {
        'deepseek-chat': 0.00014, 'deepseek-reasoner': 0.0007, 'deepseek-coder': 0.00014
    },
    'moonshot': {
        'moonshot-v1-8k': 0.006, 'moonshot-v1-32k': 0.012, 'moonshot-v1-128k': 0.024
    },
    'gemini': {
        'gemini-1.5-pro': 0.0035, 'gemini-1.5-flash': 0.00035, 'gemini-1.0-pro': 0.0005
    },
    'huggingface': {},
    'azure_openai': {
        'gpt-4': 0.01, 'gpt-4-turbo': 0.01, 'gpt-35-turbo': 0.0005
    },
    'aws_bedrock': {
        'anthropic.claude-3-sonnet': 0.003, 'anthropic.claude-3-haiku': 0.00025, 'amazon.titan': 0.001
    },
    'gcp_vertex': {
        'gemini-1.5-pro': 0.0035, 'gemini-1.5-flash': 0.00035
    },
}

def _estimate_cost(provider_name: str, model: str, prompt_tokens: int, completion_tokens: int) -> float:
    provider_pricing = PROMPT_PRICING.get(provider_name, {})
    price_per_1k = 0.001
    for m, p in provider_pricing.items():
        if m.lower() in model.lower() or model.lower() in m.lower():
            price_per_1k = p
            break
    total_tokens = prompt_tokens + completion_tokens
    return (total_tokens / 1000) * price_per_1k * 1.5

async def proxy_chat_completions(db: Session, raw_child_key: str, request_body: dict) -> dict:
    """Proxy a chat completion request through a master key."""
    
    # 1. Validate child key
    child_key = validate_child_key(db, raw_child_key)
    if not child_key:
        raise HTTPException(status_code=401, detail='Invalid or expired child key')
    
    provider = get_provider(db, child_key.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail='Provider not found or inactive')
    
    # 2. Estimate cost
    model = request_body.get('model', '')
    messages = request_body.get('messages', [])
    prompt_tokens = sum(len(m.get('content', '')) for m in messages) // 4
    max_tokens = request_body.get('max_tokens', 1000)
    estimated_cost = _estimate_cost(provider.name, model, prompt_tokens, max_tokens)
    
    # 3. Check child key limit
    if not check_child_key_limit(db, child_key, estimated_cost):
        track_child_key_usage(db, child_key, 0, 0, None, '/proxy/chat/completions', 429, 'Cost limit exceeded')
        raise HTTPException(status_code=429, detail=f'Child key cost limit exceeded: ${child_key.total_cost_usd:.4f} / ${child_key.cost_limit_usd:.4f}')
    
    # 4. Pick master key and decrypt it
    master_key = pick_master_key(db, provider.id)
    if not master_key:
        raise HTTPException(status_code=503, detail=f'No active master keys for {provider.display_name}')
    
    raw_master_key = get_decrypted_master_key(db, master_key.id)
    if not raw_master_key:
        raise HTTPException(status_code=500, detail='Failed to decrypt master key')
    
    if not check_master_key_rate_limit(db, master_key, provider):
        # Try another master key
        master_key = pick_master_key(db, provider.id)
        if not master_key:
            raise HTTPException(status_code=429, detail='Rate limit exceeded on all master keys')
        raw_master_key = get_decrypted_master_key(db, master_key.id)
        if not raw_master_key or not check_master_key_rate_limit(db, master_key, provider):
            raise HTTPException(status_code=429, detail='Rate limit exceeded')
    
    # 5. Build request to provider
    url = f"{provider.base_url.rstrip('/')}/chat/completions"
    headers = {'Content-Type': 'application/json'}
    
    if provider.api_key_header == 'Authorization':
        headers['Authorization'] = f'Bearer {raw_master_key}'
    else:
        headers[provider.api_key_header] = raw_master_key
    
    if provider.name == 'anthropic':
        headers['anthropic-version'] = '2023-06-01'
    
    # 6. Send request and track
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=request_body, headers=headers)
            duration_ms = (time.time() - start_time) * 1000
            
            actual_cost = estimated_cost
            actual_tokens = max_tokens
            resp_usage = None
            try:
                resp_data = response.json()
                if 'usage' in resp_data:
                    resp_usage = resp_data['usage']
                    actual_tokens = resp_usage.get('total_tokens', max_tokens)
                    actual_cost = _estimate_cost(provider.name, model,
                        resp_usage.get('prompt_tokens', prompt_tokens),
                        resp_usage.get('completion_tokens', max_tokens))
            except:
                resp_data = {}
            
            # Track on both keys
            track_master_key_usage(db, master_key, actual_cost, actual_tokens, child_key.id, '/proxy/chat/completions', response.status_code)
            track_child_key_usage(db, child_key, actual_cost, actual_tokens, master_key.id, '/proxy/chat/completions', response.status_code)
            
            # Create LLMCall record to populate dashboard, budgets, forecasts
            if response.status_code == 200:
                p_tokens = resp_usage.get('prompt_tokens', prompt_tokens) if resp_usage else prompt_tokens
                c_tokens = resp_usage.get('completion_tokens', max_tokens) if resp_usage else max_tokens
                llm_call = LLMCall(
                    provider=provider.name,
                    model=model,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    cost_usd=actual_cost,
                    latency_ms=duration_ms,
                    project_id=child_key.project_id
                )
                db.add(llm_call)
                db.commit()
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text or "Error from provider")
            
            # Add sentinel metadata
            result = resp_data
            result['sentinel_cost_usd'] = round(actual_cost, 6)
            result['sentinel_provider'] = provider.display_name
            return result
            
    except httpx.TimeoutException:
        track_child_key_usage(db, child_key, 0, 0, master_key.id, '/proxy/chat/completions', 504, 'Timeout')
        raise HTTPException(status_code=504, detail='Provider request timeout')
    except httpx.ConnectError:
        track_child_key_usage(db, child_key, 0, 0, master_key.id, '/proxy/chat/completions', 502, 'Connection error')
        raise HTTPException(status_code=502, detail='Unable to connect to provider')
    except Exception as e:
        track_child_key_usage(db, child_key, 0, 0, master_key.id, '/proxy/chat/completions', 500, str(e)[:500])
        raise HTTPException(status_code=500, detail=f'Proxy error: {str(e)}')
