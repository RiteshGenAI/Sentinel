from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.extra import Provider, MasterKey, ChildKey, ChildKeyUsage, MasterKeyUsage
from datetime import datetime, timezone
import hashlib, secrets

# Pre-configured providers
DEFAULT_PROVIDERS = [
    {
        'name': 'openai',
        'display_name': 'OpenAI',
        'base_url': 'https://api.openai.com/v1',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]'
    },
    {
        'name': 'anthropic',
        'display_name': 'Anthropic',
        'base_url': 'https://api.anthropic.com/v1',
        'api_key_header': 'x-api-key',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku", "claude-3-sonnet"]'
    },
    {
        'name': 'deepseek',
        'display_name': 'DeepSeek',
        'base_url': 'https://api.deepseek.com/v1',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 500000,
        'models_json': '["deepseek-chat", "deepseek-reasoner", "deepseek-coder"]'
    },
    {
        'name': 'moonshot',
        'display_name': 'Moonshot AI',
        'base_url': 'https://api.moonshot.cn/v1',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"]'
    },
    {
        'name': 'gemini',
        'display_name': 'Google Gemini',
        'base_url': 'https://generativelanguage.googleapis.com/v1beta/openai',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro", "gemini-flash-latest"]'
    },
    {
        'name': 'huggingface',
        'display_name': 'HuggingFace',
        'base_url': 'https://api-inference.huggingface.co',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 30,
        'rate_limit_tpm': 50000,
        'models_json': '[]'
    },
    {
        'name': 'azure_openai',
        'display_name': 'Azure OpenAI',
        'base_url': 'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
        'api_key_header': 'api-key',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["gpt-4", "gpt-4-turbo", "gpt-35-turbo"]'
    },
    {
        'name': 'aws_bedrock',
        'display_name': 'AWS Bedrock',
        'base_url': 'https://bedrock-runtime.{region}.amazonaws.com',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 30,
        'rate_limit_tpm': 50000,
        'models_json': '["anthropic.claude-3-sonnet", "anthropic.claude-3-haiku", "amazon.titan"]'
    },
    {
        'name': 'gcp_vertex',
        'display_name': 'GCP Vertex AI',
        'base_url': 'https://{region}-aiplatform.googleapis.com/v1',
        'api_key_header': 'Authorization',
        'rate_limit_rpm': 60,
        'rate_limit_tpm': 100000,
        'models_json': '["gemini-1.5-pro", "gemini-1.5-flash"]'
    },
]

def seed_providers(db: Session):
    """Seed default providers if none exist."""
    existing = db.query(Provider).count()
    if existing > 0:
        return
    for p in DEFAULT_PROVIDERS:
        provider = Provider(**p)
        db.add(provider)
    db.commit()

def list_providers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Provider).filter(Provider.is_active == True).offset(skip).limit(limit).all()

def get_provider(db: Session, provider_id: int) -> Provider | None:
    return db.query(Provider).filter(Provider.id == provider_id, Provider.is_active == True).first()

def get_provider_by_name(db: Session, name: str) -> Provider | None:
    return db.query(Provider).filter(Provider.name == name, Provider.is_active == True).first()

from app.schemas.provider import ProviderCreate

def create_provider(db: Session, payload: ProviderCreate) -> Provider:
    existing = db.query(Provider).filter(Provider.name == payload.name.lower()).first()
    if existing:
        if not existing.is_active:
            for var, val in payload.model_dump().items():
                setattr(existing, var, val)
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail=f"Provider name '{payload.name}' already exists.")
    
    provider = Provider(
        name=payload.name.lower().strip(),
        display_name=payload.display_name.strip(),
        base_url=payload.base_url.strip(),
        api_key_header=payload.api_key_header.strip(),
        rate_limit_rpm=payload.rate_limit_rpm,
        rate_limit_tpm=payload.rate_limit_tpm,
        models_json=payload.models_json
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider
