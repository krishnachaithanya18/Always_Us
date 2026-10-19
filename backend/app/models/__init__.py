"""Always Us — SQLAlchemy ORM Models."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# Couple Accounts
# ---------------------------------------------------------------------------


class CoupleAccount(TimestampMixin, Base):
    """A shared account for a couple, identified by a unique account_code."""

    __tablename__ = "couple_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    account_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    passcode_hash: Mapped[str] = mapped_column(String(256), nullable=False)

    memories: Mapped[list[Memory]] = relationship(
        "Memory", back_populates="couple", cascade="all, delete-orphan"
    )
    letters: Mapped[list[Letter]] = relationship(
        "Letter", back_populates="couple", cascade="all, delete-orphan"
    )
    settings: Mapped[list[AppSetting]] = relationship(
        "AppSetting", back_populates="couple", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


class AppSetting(TimestampMixin, Base):
    """Key-value store for couple-level settings."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    couple_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("couple_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)

    couple: Mapped[CoupleAccount] = relationship("CoupleAccount", back_populates="settings")

    __table_args__ = (Index("ix_app_settings_couple_key", "couple_id", "key", unique=True),)


# ---------------------------------------------------------------------------
# Memories
# ---------------------------------------------------------------------------


class Memory(TimestampMixin, Base):
    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    couple_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("couple_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    memory_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    couple: Mapped[CoupleAccount] = relationship("CoupleAccount", back_populates="memories")
    tags: Mapped[list[MemoryTag]] = relationship(
        "MemoryTag", back_populates="memory", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_memories_couple_date", "couple_id", "memory_date"),
        Index("ix_memories_couple_favorite", "couple_id", "is_favorite"),
    )


class MemoryTag(Base):
    __tablename__ = "memory_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    memory_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tag: Mapped[str] = mapped_column(String(64), nullable=False)

    memory: Mapped[Memory] = relationship("Memory", back_populates="tags")

    __table_args__ = (Index("ix_memory_tags_memory_id_tag", "memory_id", "tag"),)


# ---------------------------------------------------------------------------
# Letters
# ---------------------------------------------------------------------------


class Letter(TimestampMixin, Base):
    __tablename__ = "letters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    couple_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("couple_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="general")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    authored_by: Mapped[str] = mapped_column(String(16), nullable=False, default="human")
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reveal_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    couple: Mapped[CoupleAccount] = relationship("CoupleAccount", back_populates="letters")

    __table_args__ = (
        Index("ix_letters_couple_category", "couple_id", "category"),
        Index("ix_letters_couple_favorite", "couple_id", "is_favorite"),
    )
