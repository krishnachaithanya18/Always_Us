"""Always Us — Application Configuration."""
from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "development"
    secret_key: str = secrets.token_urlsafe(32)

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/always_us.db"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    ollama_timeout: int = 120

    # Auth
    access_passcode: str = "CHANGE_ME_set_a_strong_passcode"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # File uploads
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 10

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:4173"

    # API
    api_v1_prefix: str = "/api/v1"

    # Agent limits
    max_model_calls_per_request: int = 3
    max_conversation_messages: int = 40
    max_message_length: int = 4000
    max_response_tokens: int = 1024

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_long(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir).resolve()

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
