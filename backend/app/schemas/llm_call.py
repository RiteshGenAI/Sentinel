from pydantic import BaseModel

class LLMCallCreate(BaseModel):
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float = 0.0
    project_name: str | None = None
    feature_name: str | None = None
    agent_name: str | None = None

class LLMCallOut(BaseModel):
    id: int
    cost_usd: float
    total_tokens: int
