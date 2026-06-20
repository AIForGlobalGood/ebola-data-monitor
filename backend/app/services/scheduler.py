import asyncio
import logging

from app.config import get_settings
from app.db.database import SessionLocal
from app.services.ingestion import fetch_all_sources, reprocess_articles

logger = logging.getLogger(__name__)


async def run_scheduled_fetch() -> None:
    async with SessionLocal() as db:
        outcomes = await fetch_all_sources(db)
        total_new = sum(item[1] for item in outcomes)
        logger.info("Scheduled fetch complete: %s new articles", total_new)


async def background_fetch_loop(stop_event: asyncio.Event) -> None:
    settings = get_settings()
    interval = max(settings.fetch_interval_minutes, 5) * 60

    while not stop_event.is_set():
        try:
            await run_scheduled_fetch()
        except Exception:  # noqa: BLE001
            logger.exception("Background fetch failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except TimeoutError:
            continue


async def startup_tasks() -> None:
    async with SessionLocal() as db:
        await reprocess_articles(db)
        await fetch_all_sources(db)
