from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.budget import Budget
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.schemas.budget import BudgetCreate

def create_budget(db: Session, payload: BudgetCreate):
    row = Budget(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def list_budgets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Budget).offset(skip).limit(limit).all()

def total_cost(db: Session, project_id: int | None = None) -> float:
    llm_query = db.query(func.sum(LLMCall.cost_usd))
    ci_query = db.query(func.sum(CIRun.infra_cost_usd))
    if project_id is not None:
        llm_query = llm_query.filter(LLMCall.project_id == project_id)
        ci_query = ci_query.filter(CIRun.project_id == project_id)
    llm = llm_query.scalar() or 0.0
    ci = ci_query.scalar() or 0.0
    return float(llm) + float(ci)

def budget_status(db: Session):
    items = []
    for b in db.query(Budget).all():
        cost = total_cost(db, project_id=b.project_id) if b.scope == 'project' and b.project_id else total_cost(db)
        ratio = cost / b.limit_usd if b.limit_usd > 0 else 0.0
        if ratio >= b.critical_threshold:
            level = 'critical'
        elif ratio >= b.warning_threshold:
            level = 'warning'
        else:
            level = 'ok'
        items.append({
            'budget_id': b.id,
            'scope': b.scope,
            'project_id': b.project_id,
            'total_cost_usd': cost,
            'limit_usd': b.limit_usd,
            'ratio': ratio,
            'level': level
        })
    return items

def verify_budgets(db: Session):
    budgets = db.query(Budget).all()
    passed = True
    details = []
    for b in budgets:
        cost = total_cost(db, project_id=b.project_id) if b.scope == 'project' and b.project_id else total_cost(db)
        ok = cost < b.limit_usd
        if not ok:
            passed = False
        details.append({
            'budget_id': b.id,
            'passed': ok,
            'cost_usd': cost,
            'limit_usd': b.limit_usd
        })
    return {'passed': passed, 'total_cost_usd': total_cost(db), 'budgets_checked': len(budgets), 'details': details}

def delete_budget(db: Session, budget_id: int) -> bool:
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Budget not found')
    db.delete(b)
    db.commit()
    return True
