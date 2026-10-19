"""Authentication endpoints — multi-couple account system."""
from __future__ import annotations

import time
from collections import defaultdict
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import CoupleAccount
from app.schemas import AuthRequest, AuthResponse, RegisterRequest, RegisterResponse, ChangePasscodeRequest
from app.security import create_access_token, hash_passcode, verify_passcode
from app.security.deps import require_auth

router = APIRouter()
settings = get_settings()

_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 10
_WINDOW_SECONDS = 60


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - _WINDOW_SECONDS
    attempts = [t for t in _attempts[ip] if t > window_start]
    _attempts[ip] = attempts
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait before trying again.",
        )
    _attempts[ip].append(now)


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """Create a new couple account with a unique account code and shared passcode."""
    code = body.account_code.upper()
    stmt = select(CoupleAccount).where(CoupleAccount.account_code == code)
    result = await db.execute(stmt)
    if result.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That account code is already taken. Please choose a different one.",
        )

    couple = CoupleAccount(
        account_code=code,
        passcode_hash=hash_passcode(body.passcode),
    )
    db.add(couple)
    await db.commit()
    await db.refresh(couple)

    token = create_access_token({
        "sub": couple.id,
        "couple_id": couple.id,
        "iat": datetime.now(UTC).isoformat(),
    })
    expire_secs = settings.jwt_expire_minutes * 60
    return RegisterResponse(
        account_code=couple.account_code,
        access_token=token,
        expires_in=expire_secs,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    body: AuthRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Login with account code + passcode, return JWT."""
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    code = body.account_code.upper()
    stmt = select(CoupleAccount).where(CoupleAccount.account_code == code)
    result = await db.execute(stmt)
    couple = result.scalars().first()

    if couple is None or not verify_passcode(body.passcode, couple.passcode_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect account code or passcode.",
        )

    token = create_access_token({
        "sub": couple.id,
        "couple_id": couple.id,
        "iat": datetime.now(UTC).isoformat(),
    })
    expire_secs = settings.jwt_expire_minutes * 60
    return AuthResponse(access_token=token, expires_in=expire_secs)


@router.post("/change-passcode", status_code=200)
async def change_passcode(
    body: ChangePasscodeRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> dict:
    """Change the passcode for the authenticated couple."""
    couple_id = payload["couple_id"]
    stmt = select(CoupleAccount).where(CoupleAccount.id == couple_id)
    result = await db.execute(stmt)
    couple = result.scalars().first()
    if couple is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    couple.passcode_hash = hash_passcode(body.passcode)
    await db.commit()
    return {"status": "ok"}


@router.get("/me")
async def get_me(payload: dict = Depends(require_auth)) -> dict:
    """Verify token and return couple info."""
    return {"authenticated": True, "couple_id": payload.get("couple_id")}
