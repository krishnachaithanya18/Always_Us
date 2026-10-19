"""Always Us — Async Database Engine and Session Factory."""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""


def _build_engine(database_url: str):
    """Create the async SQLAlchemy engine with appropriate settings."""
    connect_args: dict = {}
    if database_url.startswith("sqlite"):
        # Required for SQLite: enable WAL mode and foreign keys
        connect_args = {"check_same_thread": False}

    return create_async_engine(
        database_url,
        echo=False,
        connect_args=connect_args,
    )


_engine = None
_async_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = _build_engine(settings.database_url)
    return _engine


def get_session_factory():
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Initialize the database — create tables and enable SQLite pragmas."""
    from sqlalchemy import text

    engine = get_engine()
    async with engine.begin() as conn:
        # Enable SQLite foreign key enforcement and WAL mode
        if str(engine.url).startswith("sqlite"):
            await conn.execute(text("PRAGMA foreign_keys = ON"))
            await conn.execute(text("PRAGMA journal_mode = WAL"))

        # Import all models so Base has them registered
        import app.models  # noqa: F401

        await conn.run_sync(Base.metadata.create_all)
