import asyncio
import logging

from sqlalchemy import func, select

from app.config import get_settings
from app.db.database import SessionLocal
from app.models import Article
from app.services.ingestion import fetch_all_sources, purge_stale_articles, reprocess_articles, sync_reliefweb_source_urls

logger = logging.getLogger(__name__)


async def run_scheduled_fetch() -> None:
    with SessionLocal() as db:
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
    settings = get_settings()
    with SessionLocal() as db:
        if settings.is_vercel and not settings.uses_turso:
            logger.warning(
                "Vercel deployment without Turso — article corpus is ephemeral (/tmp). "
                "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
            )

        migrated = sync_reliefweb_source_urls(db)
        if migrated:
            logger.info("Migrated %s ReliefWeb source URLs to API v2", migrated)

        purged = purge_stale_articles(db)
        if purged:
            logger.info("Purged %s articles older than retention cutoff", purged)

        reprocessed = reprocess_articles(db)
        logger.info("Startup reprocess complete: %s articles", reprocessed)

        if settings.is_vercel:
            article_count = db.scalar(select(func.count()).select_from(Article)) or 0
            if article_count == 0:
                logger.info("Vercel cold start with empty corpus — running initial ingest")
                await fetch_all_sources(db)
                reprocess_articles(db)
            return

        await fetch_all_sources(db)
        reprocess_articles(db)
