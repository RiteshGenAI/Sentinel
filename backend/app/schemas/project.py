from pydantic import BaseModel
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: str = ''

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    model_config = {'from_attributes': True}
