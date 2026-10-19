"""Always Us — FastAPI Application Entry Point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import router as api_v1_router
from app.config import get_settings
from app.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialize DB and uploads directory on startup."""
    settings = get_settings()

    # Ensure data directory exists
    db_url = settings.database_url
    if "sqlite" in db_url:
        db_path = db_url.split("///")[-1].replace("./", "")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    # Ensure uploads directory exists
    settings.upload_path.mkdir(parents=True, exist_ok=True)

    # Initialize database tables
    await init_db()
    logger.info("✅ Always Us backend started successfully")

    yield

    logger.info("🛑 Always Us backend shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Always Us API",
        description="Private API for the Always Us anniversary application",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # CORS — explicit origin whitelist only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # Security headers middleware
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # Global exception handler — no stack traces to clients
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal error occurred", "code": "internal_error"},
        )

    # Mount API routes
    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
