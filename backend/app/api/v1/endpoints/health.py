from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db, engine

router = APIRouter(prefix='/health', tags=['health'])

@router.get('/')
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text('SELECT 1'))
        db_status = 'ok'
    except Exception:
        db_status = 'error'
    return {'status': 'ok' if db_status == 'ok' else 'degraded', 'database': db_status, 'version': '1.0.0'}
