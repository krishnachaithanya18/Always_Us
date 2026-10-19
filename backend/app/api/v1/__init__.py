"""Always Us — API v1 router."""
from fastapi import APIRouter

from app.api.v1 import auth, health, letters, memories, settings

router = APIRouter()

router.include_router(health.router, tags=["Health"])
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(memories.router, prefix="/memories", tags=["Memories"])
router.include_router(letters.router, prefix="/letters", tags=["Letters"])
router.include_router(settings.router, prefix="/settings", tags=["Settings"])
