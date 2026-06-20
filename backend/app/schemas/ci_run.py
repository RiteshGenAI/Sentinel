from pydantic import BaseModel

class CIRunCreate(BaseModel):
    pipeline: str
    job: str
    runner_type: str
    duration_seconds: float
    project_name: str | None = None

class CIRunOut(BaseModel):
    id: int
    infra_cost_usd: float
