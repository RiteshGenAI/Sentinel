from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import user, project, llm_call, ci_run, budget  # noqa
from app.models import extra  # noqa - ensures extra models are registered
from app.services.provider_service import seed_providers
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

def _run_migrations():
    """Apply safe incremental column migrations using IF NOT EXISTS."""
    migrations = [
        # api_key_usage.cost_usd - was missing from original schema
        "ALTER TABLE api_key_usage ADD COLUMN IF NOT EXISTS cost_usd FLOAT DEFAULT 0.0",
        # child_key_usage.cost_usd - ensure it exists
        "ALTER TABLE child_key_usage ADD COLUMN IF NOT EXISTS cost_usd FLOAT DEFAULT 0.0",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                logger.warning(f"Migration skipped (may be non-Postgres or already applied): {e}")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Run incremental migrations for columns added after initial create
    try:
        _run_migrations()
    except Exception as e:
        logger.warning(f"Migrations could not run: {e}")
    
    # Seed default providers
    db = SessionLocal()
    try:
        seed_providers(db)
    finally:
        db.close()
