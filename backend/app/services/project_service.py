from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project import Project
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.schemas.project import ProjectCreate

def create_project(db: Session, payload: ProjectCreate) -> Project:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail='Project name is required')
    existing = db.query(Project).filter(Project.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail='Project already exists')
    project = Project(name=name, description=payload.description.strip())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def list_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Project).offset(skip).limit(limit).all()

def get_project(db: Session, project_id: int) -> Project | None:
    return db.query(Project).filter(Project.id == project_id).first()

def project_costs(db: Session, project_id: int) -> dict:
    llm = db.query(func.sum(LLMCall.cost_usd)).filter(LLMCall.project_id == project_id).scalar() or 0.0
    ci = db.query(func.sum(CIRun.infra_cost_usd)).filter(CIRun.project_id == project_id).scalar() or 0.0
    return {'llm_cost_usd': float(llm), 'ci_cost_usd': float(ci), 'total_cost_usd': float(llm) + float(ci)}
