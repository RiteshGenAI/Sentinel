from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.ingest import router as ingest_router
from app.api.v1.endpoints.budgets import router as budgets_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.forecast import router as forecast_router
from app.api.v1.endpoints.export import router as export_router
from app.api.v1.endpoints.api_keys import router as api_keys_router
from app.api.v1.endpoints.providers import router as providers_router
from app.api.v1.endpoints.master_keys import router as master_keys_router
from app.api.v1.endpoints.child_keys import router as child_keys_router
from app.api.v1.endpoints.proxy import router as proxy_router
from app.api.v1.endpoints.analytics import router as analytics_router

