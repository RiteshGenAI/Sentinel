from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.extra import ActivityLog

def log_activity(db: Session, action: str, entity_type: str, entity_id: int | None = None, user_id: int | None = None, details: str | None = None):
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )
    db.add(log)
    db.commit()
