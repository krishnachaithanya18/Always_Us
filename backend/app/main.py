
"""Always Us — FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
import logging
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
    """Initialize database and uploads directory on startup."""
    settings = get_settings()

    # Create the parent directory only for SQLite databases.
    db_url = settings.database_url
    if "sqlite" in db_url:
        db_path = db_url.split("///")[-1].replace("./", "")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    # Ensure the uploads directory exists.
    settings.upload_path.mkdir(parents=True, exist_ok=True)

    # Initialize database tables.
    await init_db()
    logger.info("Always Us backend started successfully")

    yield

    logger.info("Always Us backend shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Always Us API",
        description="Private API for the Always Us anniversary application",
        version="1.0.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        lifespan=lifespan,
    )

    # Allow requests from the deployed frontend.
    allowed_origins = list(settings.allowed_origins_list)
    github_pages_origin = "https://krishnachaithanya18.github.io"

    if github_pages_origin not in allowed_origins:
        allowed_origins.append(github_pages_origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal error occurred",
                "code": "internal_error",
            },
        )

    # Mount API endpoints under the configured API prefix.
    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    # Simple health endpoint for deployment checks.
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "service": "always-us-api"}

    return app


app = create_app()
