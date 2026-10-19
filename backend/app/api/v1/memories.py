"""Memory CRUD, search, photo upload endpoints."""
from __future__ import annotations

import io
import secrets
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models import Memory, MemoryTag
from app.schemas import MemoryCreate, MemoryListResponse, MemoryOut, MemoryUpdate
from app.security.deps import require_auth

router = APIRouter()
settings = get_settings()

_ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _memory_out(m: Memory) -> MemoryOut:
    return MemoryOut.model_validate(m)


async def _load_memory(memory_id: str, couple_id: str, db: AsyncSession) -> Memory:
    stmt = (
        select(Memory)
        .where(Memory.id == memory_id, Memory.couple_id == couple_id)
        .options(selectinload(Memory.tags))
    )
    result = await db.execute(stmt)
    memory = result.scalars().first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.get("", response_model=MemoryListResponse)
async def list_memories(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    tag: str | None = None,
    search: str | None = None,
    favorites_only: bool = False,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryListResponse:
    couple_id = payload["couple_id"]
    stmt = (
        select(Memory)
        .where(Memory.couple_id == couple_id)
        .options(selectinload(Memory.tags))
    )

    if favorites_only:
        stmt = stmt.where(Memory.is_favorite == True)

    if tag:
        stmt = stmt.join(MemoryTag).where(MemoryTag.tag == tag.strip().lower())

    if search:
        q = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(Memory.title.ilike(q), Memory.description.ilike(q))
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        stmt.order_by(Memory.memory_date.desc().nullslast(), Memory.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    memories = result.scalars().all()

    return MemoryListResponse(total=total, items=[_memory_out(m) for m in memories])


@router.post("", response_model=MemoryOut, status_code=201)
async def create_memory(
    body: MemoryCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryOut:
    couple_id = payload["couple_id"]
    memory = Memory(
        couple_id=couple_id,
        title=body.title,
        description=body.description,
        memory_date=body.memory_date,
        is_favorite=body.is_favorite,
    )
    db.add(memory)
    await db.flush()

    for tag in body.tags:
        db.add(MemoryTag(memory_id=memory.id, tag=tag.strip().lower()))

    await db.commit()
    loaded = await _load_memory(memory.id, couple_id, db)
    return _memory_out(loaded)


@router.get("/random", response_model=MemoryOut)
async def random_memory(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryOut:
    couple_id = payload["couple_id"]
    stmt = (
        select(Memory)
        .where(Memory.couple_id == couple_id)
        .options(selectinload(Memory.tags))
        .order_by(func.random())
        .limit(1)
    )
    result = await db.execute(stmt)
    memory = result.scalars().first()
    if not memory:
        raise HTTPException(status_code=404, detail="No memories found")
    return _memory_out(memory)


@router.get("/{memory_id}", response_model=MemoryOut)
async def get_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryOut:
    return _memory_out(await _load_memory(memory_id, payload["couple_id"], db))


@router.patch("/{memory_id}", response_model=MemoryOut)
async def update_memory(
    memory_id: str,
    body: MemoryUpdate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryOut:
    couple_id = payload["couple_id"]
    memory = await _load_memory(memory_id, couple_id, db)

    if body.title is not None:
        memory.title = body.title
    if body.description is not None:
        memory.description = body.description
    if body.memory_date is not None:
        memory.memory_date = body.memory_date
    if body.is_favorite is not None:
        memory.is_favorite = body.is_favorite

    if body.tags is not None:
        for tag in memory.tags:
            await db.delete(tag)
        await db.flush()
        for tag in body.tags:
            db.add(MemoryTag(memory_id=memory.id, tag=tag.strip().lower()))

    await db.commit()
    return _memory_out(await _load_memory(memory_id, couple_id, db))


@router.delete("/{memory_id}", status_code=204, response_model=None)
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> None:
    couple_id = payload["couple_id"]
    memory = await _load_memory(memory_id, couple_id, db)

    if memory.photo_filename:
        photo_path = settings.upload_path / memory.photo_filename
        if photo_path.exists() and photo_path.parent == settings.upload_path:
            photo_path.unlink(missing_ok=True)

    await db.delete(memory)
    await db.commit()


@router.post("/{memory_id}/photo", response_model=MemoryOut)
async def upload_photo(
    memory_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> MemoryOut:
    couple_id = payload["couple_id"]
    memory = await _load_memory(memory_id, couple_id, db)

    if file.content_type not in _ALLOWED_MIMETYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF",
        )

    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb} MB",
        )

    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception:
        raise HTTPException(status_code=422, detail="File is not a valid image")

    suffix = Path(file.filename or "photo.jpg").suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        suffix = ".jpg"

    safe_filename = f"{secrets.token_urlsafe(16)}{suffix}"

    if memory.photo_filename:
        old_path = settings.upload_path / memory.photo_filename
        if old_path.exists() and old_path.parent == settings.upload_path:
            old_path.unlink(missing_ok=True)

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    dest = settings.upload_path / safe_filename
    dest.write_bytes(data)

    memory.photo_filename = safe_filename
    await db.commit()
    return _memory_out(await _load_memory(memory_id, couple_id, db))


@router.get("/{memory_id}/photo")
async def get_photo(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> FileResponse:
    couple_id = payload["couple_id"]
    memory = await _load_memory(memory_id, couple_id, db)
    if not memory.photo_filename:
        raise HTTPException(status_code=404, detail="This memory has no photo")

    photo_path = settings.upload_path / memory.photo_filename
    try:
        photo_path.resolve().relative_to(settings.upload_path)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not photo_path.exists():
        raise HTTPException(status_code=404, detail="Photo file not found")

    return FileResponse(photo_path)
