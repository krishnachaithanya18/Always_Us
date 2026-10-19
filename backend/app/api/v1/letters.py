"""Letter CRUD endpoints."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Letter
from app.schemas import LetterCreate, LetterListResponse, LetterOut, LetterUpdate
from app.security.deps import require_auth

router = APIRouter()


async def _load_letter(letter_id: str, couple_id: str, db: AsyncSession) -> Letter:
    stmt = select(Letter).where(Letter.id == letter_id, Letter.couple_id == couple_id)
    result = await db.execute(stmt)
    letter = result.scalars().first()
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    return letter


@router.get("", response_model=LetterListResponse)
async def list_letters(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: str | None = None,
    favorites_only: bool = False,
    authored_by: str | None = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> LetterListResponse:
    couple_id = payload["couple_id"]
    stmt = select(Letter).where(Letter.couple_id == couple_id)

    if category:
        stmt = stmt.where(Letter.category == category)
    if favorites_only:
        stmt = stmt.where(Letter.is_favorite == True)
    if authored_by:
        stmt = stmt.where(Letter.authored_by == authored_by)

    today = date.today()
    stmt = stmt.where(
        (Letter.reveal_date == None) | (Letter.reveal_date <= today)
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Letter.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    letters = result.scalars().all()

    return LetterListResponse(total=total, items=[LetterOut.model_validate(l) for l in letters])


@router.post("", response_model=LetterOut, status_code=201)
async def create_letter(
    body: LetterCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> LetterOut:
    couple_id = payload["couple_id"]
    letter = Letter(
        couple_id=couple_id,
        title=body.title,
        category=body.category,
        content=body.content,
        authored_by="human",
        is_favorite=body.is_favorite,
        reveal_date=body.reveal_date,
    )
    db.add(letter)
    await db.commit()
    await db.refresh(letter)
    return LetterOut.model_validate(letter)


@router.get("/{letter_id}", response_model=LetterOut)
async def get_letter(
    letter_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> LetterOut:
    letter = await _load_letter(letter_id, payload["couple_id"], db)
    if letter.reveal_date and letter.reveal_date > date.today():
        raise HTTPException(
            status_code=403,
            detail=f"This letter is sealed until {letter.reveal_date}",
        )
    return LetterOut.model_validate(letter)


@router.patch("/{letter_id}", response_model=LetterOut)
async def update_letter(
    letter_id: str,
    body: LetterUpdate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> LetterOut:
    letter = await _load_letter(letter_id, payload["couple_id"], db)

    if body.title is not None:
        letter.title = body.title
    if body.category is not None:
        letter.category = body.category
    if body.content is not None:
        letter.content = body.content
    if body.is_favorite is not None:
        letter.is_favorite = body.is_favorite
    if body.is_read is not None:
        letter.is_read = body.is_read
    if body.reveal_date is not None:
        letter.reveal_date = body.reveal_date

    await db.commit()
    await db.refresh(letter)
    return LetterOut.model_validate(letter)


@router.delete("/{letter_id}", status_code=204, response_model=None)
async def delete_letter(
    letter_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> None:
    letter = await _load_letter(letter_id, payload["couple_id"], db)
    await db.delete(letter)
    await db.commit()


@router.post("/{letter_id}/mark-read", response_model=LetterOut)
async def mark_letter_read(
    letter_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> LetterOut:
    letter = await _load_letter(letter_id, payload["couple_id"], db)
    letter.is_read = True
    await db.commit()
    await db.refresh(letter)
    return LetterOut.model_validate(letter)
