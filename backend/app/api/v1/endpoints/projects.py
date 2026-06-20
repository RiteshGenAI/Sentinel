from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectOut
from app.services.project_service import create_project, list_projects, get_project, project_costs
from app.api.deps import require_roles
from app.core.config import Role

router = APIRouter(prefix='/projects', tags=['projects'])

@router.post('/', response_model=ProjectOut, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER))])
def create_project_endpoint(payload: ProjectCreate, db: Session = Depends(get_db)):
    return create_project(db, payload)

@router.get('/', response_model=list[ProjectOut], dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def list_projects_endpoint(db: Session = Depends(get_db), skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)):
    return list_projects(db, skip=skip, limit=limit)

@router.get('/{project_id}', response_model=ProjectOut, dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def get_project_endpoint(project_id: int, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return project

@router.get('/{project_id}/costs', dependencies=[Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.VIEWER))])
def project_costs_endpoint(project_id: int, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return project_costs(db, project_id)
