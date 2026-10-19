"""Application settings endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AppSetting
from app.schemas import AppSettings, SettingUpdate
from app.security.deps import require_auth

router = APIRouter()

_ALLOWED_KEYS = {
    "partner_name", "my_name", "relationship_title",
    "anniversary_date", "relationship_start_date",
    "welcome_message", "theme", "featured_memory_id", "timezone",
}


def _to_app_settings(items: list[AppSetting]) -> AppSettings:
    d = {s.key: s.value for s in items}
    return AppSettings(**{k: d.get(k) for k in AppSettings.model_fields})


@router.get("")
async def get_settings_api(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> dict:
    couple_id = payload["couple_id"]
    stmt = select(AppSetting).where(AppSetting.couple_id == couple_id)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {"settings": _to_app_settings(items).model_dump()}


@router.put("")
async def update_settings_api(
    body: dict,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_auth),
) -> dict:
    couple_id = payload["couple_id"]

    # Accept {"settings": [{key, value}]} format
    settings_list: list[dict] = body.get("settings", [])
    for item in settings_list:
        key = item.get("key", "")
        if key not in _ALLOWED_KEYS:
            raise HTTPException(status_code=422, detail=f"Unknown setting key: '{key}'")

    # Load existing settings for this couple
    stmt = select(AppSetting).where(AppSetting.couple_id == couple_id)
    result = await db.execute(stmt)
    existing = {s.key: s for s in result.scalars().all()}

    for item in settings_list:
        key = item["key"]
        value = item.get("value")
        if key in existing:
            existing[key].value = value
        else:
            db.add(AppSetting(couple_id=couple_id, key=key, value=value))

    await db.commit()

    stmt = select(AppSetting).where(AppSetting.couple_id == couple_id)
    result = await db.execute(stmt)
    all_settings = result.scalars().all()
    return {"settings": _to_app_settings(all_settings).model_dump()}
