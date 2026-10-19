"""Always Us — Pydantic Schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

LetterCategory = Literal[
    "general", "miss_you", "bad_day", "reassurance",
    "cannot_sleep", "want_to_smile", "remember_us", "anniversary", "open_when",
]

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    account_code: str = Field(..., min_length=3, max_length=32, pattern=r'^[A-Za-z0-9_\-]+$')
    passcode: str = Field(..., min_length=6)


class RegisterResponse(BaseModel):
    account_code: str
    access_token: str
    expires_in: int


class AuthRequest(BaseModel):
    account_code: str
    passcode: str


class AuthResponse(BaseModel):
    access_token: str
    expires_in: int


class ChangePasscodeRequest(BaseModel):
    passcode: str = Field(..., min_length=6)


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

ALLOWED_SETTING_KEYS = {
    "partner_name", "my_name", "relationship_title",
    "anniversary_date", "relationship_start_date",
    "welcome_message", "theme", "featured_memory_id", "timezone",
}


class SettingUpdate(BaseModel):
    key: str
    value: str | None = None

    @field_validator("key")
    @classmethod
    def key_must_be_allowed(cls, v: str) -> str:
        if v not in ALLOWED_SETTING_KEYS:
            raise ValueError(f"Unknown setting key: {v!r}")
        return v


class AppSettings(BaseModel):
    partner_name: str | None = None
    my_name: str | None = None
    relationship_title: str | None = None
    anniversary_date: str | None = None
    relationship_start_date: str | None = None
    welcome_message: str | None = None
    theme: str | None = None
    featured_memory_id: str | None = None
    timezone: str | None = None


# ---------------------------------------------------------------------------
# Memories
# ---------------------------------------------------------------------------


class MemoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    memory_date: date | None = None
    is_favorite: bool = False
    tags: list[str] = Field(default_factory=list)


class MemoryUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    memory_date: date | None = None
    is_favorite: bool | None = None
    tags: list[str] | None = None


class MemoryTagOut(BaseModel):
    id: int
    tag: str

    model_config = {"from_attributes": True}


class MemoryOut(BaseModel):
    id: str
    title: str
    description: str | None
    memory_date: date | None
    photo_filename: str | None
    is_favorite: bool
    tags: list[MemoryTagOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemoryListResponse(BaseModel):
    total: int
    items: list[MemoryOut]


# ---------------------------------------------------------------------------
# Letters
# ---------------------------------------------------------------------------


class LetterCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: LetterCategory = "general"
    content: str = Field(..., min_length=1)
    is_favorite: bool = False
    reveal_date: date | None = None


class LetterUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    category: LetterCategory | None = None
    content: str | None = None
    is_favorite: bool | None = None
    is_read: bool | None = None
    reveal_date: date | None = None


class LetterOut(BaseModel):
    id: str
    title: str
    category: str
    content: str
    authored_by: str
    is_favorite: bool
    is_read: bool
    reveal_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LetterListResponse(BaseModel):
    total: int
    items: list[LetterOut]
