from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenOut, UserOut
from app.services.auth_service import create_user, authenticate_user, create_access_token
from app.api.deps import get_current_user
from app.core.config import Role

router = APIRouter(prefix='/auth', tags=['auth'])

@router.post('/register', response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email already exists')
    return create_user(db, payload)

@router.post('/login', response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_access_token(user)
    return {'access_token': token, 'token_type': 'bearer', 'user': user}

@router.get('/me', response_model=UserOut)
def me(current_user = Depends(get_current_user)):
    return current_user
