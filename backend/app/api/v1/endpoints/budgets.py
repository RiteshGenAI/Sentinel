from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetStatusOut
from app.services.budget_service import create_budget, list_budgets, budget_status, verify_budgets, delete_budget
from app.api.deps import require_roles
from app.core.config import Role

router = APIRouter(prefix='/budgets', tags=['budgets'])

@router.post('/', response_model=BudgetOut, dependencies=[Depends(require_roles(Role.ADMIN))])
def create_budget_endpoint(payload: BudgetCreate, db: Session = Depends(get_db)):
    return create_budget(db, payload)

@router.get('/', response_model=list[BudgetOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def list_budgets_endpoint(db: Session = Depends(get_db), skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)):
    return list_budgets(db, skip=skip, limit=limit)

@router.get('/status', response_model=list[BudgetStatusOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def budget_status_endpoint(db: Session = Depends(get_db)):
    return budget_status(db)

@router.get('/total-spent', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_total_spent_endpoint(db: Session = Depends(get_db)):
    from app.services.budget_service import total_cost
    return {'total_spent_usd': total_cost(db)}

@router.post('/verify', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def verify_budgets_endpoint(db: Session = Depends(get_db)):
    return verify_budgets(db)

@router.delete('/{budget_id}', dependencies=[Depends(require_roles(Role.ADMIN))])
def delete_budget_endpoint(budget_id: int, db: Session = Depends(get_db)):
    delete_budget(db, budget_id)
    return {'ok': True}
