from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import get_settings, Role
from app.db.session import get_db
from app.models.user import User
from app.models.extra import ApiKey
from app.services.api_key_service import validate_api_key

security = HTTPBearer(auto_error=False)
settings = get_settings()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authorization required')
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found or inactive')
    return user

def get_current_user_or_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_api_key: str | None = Header(None, alias='X-API-Key'),
    db: Session = Depends(get_db)
):
    """Accept either JWT Bearer token or X-API-Key header."""
    # Try API key first
    if x_api_key:
        key = validate_api_key(db, x_api_key)
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired API key')
        # Get the user associated with the API key
        user = db.query(User).filter(User.id == key.user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='API key owner inactive')
        # Attach api_key to user for downstream use
        user._api_key = key  # type: ignore
        return user
    
    # Fall back to JWT
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authorization required')
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found or inactive')
    return user

def require_roles(*roles: Role):
    def checker(user: User = Depends(get_current_user)):
        if user.role not in {r.value for r in roles}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient permissions')
        return user
    return checker

def require_roles_or_api_key(*roles: Role):
    def checker(user: User = Depends(get_current_user_or_api_key)):
        if user.role not in {r.value for r in roles}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient permissions')
        return user
    return checker

def require_admin(user: User = Depends(get_current_user)):
    if user.role != Role.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')
    return user
