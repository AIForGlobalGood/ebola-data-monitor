import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.services.ingestion import fetch_all_sources

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/ingest")
async def cron_ingest(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Vercel Cron entrypoint — refreshes RSS feeds on a schedule."""
    settings = get_settings()
    secret = settings.cron_secret or os.environ.get("CRON_SECRET")
    if secret and authorization != f"Bearer {secret}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    outcomes = await fetch_all_sources(db)
    total_new = sum(item[1] for item in outcomes)
    logger.info("Cron ingest complete: %s new articles", total_new)
    return {"ok": True, "new_articles": total_new, "sources": len(outcomes)}
