import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt
from sqlalchemy.orm import Session
from app.core.config import get_settings, Role
from app.models.user import User
from app.schemas.user import UserCreate

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role.value if isinstance(payload.role, Role) else payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.strip().lower(), User.is_active == True).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=get_settings().access_token_expire_minutes)
    payload = {'sub': str(user.id), 'email': user.email, 'role': user.role, 'exp': expire}
    return jwt.encode(payload, get_settings().secret_key, algorithm='HS256')

def list_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def update_user_role(db: Session, user_id: int, new_role: Role) -> User | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.role = new_role.value
    db.commit()
    db.refresh(user)
    return user

def deactivate_user(db: Session, user_id: int) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    user.is_active = False
    db.commit()
    return True
