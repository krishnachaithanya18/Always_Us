"""Always Us — Security utilities (JWT + Argon2 hashing)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

# Argon2id is the recommended password hashing algorithm
_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_passcode(passcode: str) -> str:
    """Hash a passcode using Argon2id."""
    return _pwd_context.hash(passcode)


def verify_passcode(plain: str, hashed: str) -> bool:
    """Verify a plain passcode against an Argon2id hash."""
    return _pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    payload = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload["exp"] = expire
    payload["iat"] = datetime.now(UTC)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT access token. Returns None if invalid."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None
