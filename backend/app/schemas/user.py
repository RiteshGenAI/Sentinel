from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.core.config import Role

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)
    role: Role = Role.VIEWER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}

class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut
