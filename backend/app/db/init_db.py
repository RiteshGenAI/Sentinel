from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import user, project, llm_call, ci_run, budget  # noqa
from app.services.provider_service import seed_providers

def init_db():
    Base.metadata.create_all(bind=engine)
    # Seed default providers
    db = SessionLocal()
    try:
        seed_providers(db)
    finally:
        db.close()
