from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from app.services.auth_service import list_users, update_user_role, deactivate_user
from app.api.deps import require_admin
from app.core.config import Role

router = APIRouter(prefix='/admin', tags=['admin'])

@router.get('/users', response_model=list[UserOut], dependencies=[Depends(require_admin)])
def admin_list_users(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return list_users(db, skip=skip, limit=limit)

@router.put('/users/{user_id}/role', response_model=UserOut, dependencies=[Depends(require_admin)])
def admin_change_role(user_id: int, new_role: Role, db: Session = Depends(get_db)):
    user = update_user_role(db, user_id, new_role)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user

@router.delete('/users/{user_id}', dependencies=[Depends(require_admin)])
def admin_deactivate_user(user_id: int, db: Session = Depends(get_db)):
    ok = deactivate_user(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail='User not found')
    return {'ok': True}
