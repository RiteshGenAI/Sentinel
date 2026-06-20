import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger('sentinel')

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s"
        )
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception(f"Unhandled error on {request.method} {request.url.path}")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
              )

import collections
import threading

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Thread-safe, in-memory rate limiter middleware to prevent brute-force
    attacks on authentication routes (login/register).
    """
    def __init__(self, app, limit: int = 15, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests = collections.defaultdict(list)
        self.lock = threading.Lock()

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/auth/login") or request.url.path.startswith("/api/v1/auth/register"):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            with self.lock:
                # Clean up old timestamps
                self.requests[client_ip] = [
                    t for t in self.requests[client_ip]
                    if now - t < self.window_seconds
                ]
                
                if len(self.requests[client_ip]) >= self.limit:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please try again later."}
                    )
                
                self.requests[client_ip].append(now)

        return await call_next(request)
