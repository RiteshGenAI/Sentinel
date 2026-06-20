from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.init_db import init_db
from app.api.v1.endpoints import auth, projects, ingest, budgets, admin, health, forecast, export, api_keys, providers, master_keys, child_keys, proxy, analytics
from app.core.middleware import RequestLoggingMiddleware, ErrorHandlingMiddleware, RateLimitingMiddleware
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title='Sentinel Fullstack API', lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RateLimitingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE'],
    allow_headers=['Authorization', 'Content-Type', 'X-API-Key'],
)

@app.get('/healthz')
def healthz():
    return {'status': 'ok'}

app.include_router(auth.router, prefix='/api/v1')
app.include_router(projects.router, prefix='/api/v1')
app.include_router(ingest.router, prefix='/api/v1')
app.include_router(budgets.router, prefix='/api/v1')
app.include_router(admin.router, prefix='/api/v1')
app.include_router(health.router, prefix='/api/v1')
app.include_router(forecast.router, prefix='/api/v1')
app.include_router(export.router, prefix='/api/v1')
app.include_router(api_keys.router, prefix='/api/v1')
app.include_router(providers.router, prefix='/api/v1')
app.include_router(master_keys.router, prefix='/api/v1')
app.include_router(child_keys.router, prefix='/api/v1')
app.include_router(proxy.router, prefix='/api/v1')
app.include_router(analytics.router, prefix='/api/v1')
