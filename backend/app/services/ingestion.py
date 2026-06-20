import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from dateutil import parser as date_parser
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Article, Source

EBOLA_KEYWORDS = re.compile(
    r"\b(ebola|hemorrhagic|outbreak|epidemic|vaccine|vaccination|"
    r"immunization|biotech|virus|viral|surveillance|contact.?tracing|"
    r"therapeutic|treatment|clinical.?trial|who|cdc|health.?emergency)\b",
    re.IGNORECASE,
)

DEFAULT_SOURCES = [
    {
        "name": "WHO News",
        "url": "https://www.who.int/rss-feeds/news-english.xml",
        "category": "health",
        "region": "global",
        "description": "WHO global health news",
    },
    {
        "name": "ReliefWeb Updates",
        "url": "https://reliefweb.int/updates/rss.xml",
        "category": "humanitarian",
        "region": "global",
        "description": "ReliefWeb humanitarian situation reports",
    },
    {
        "name": "Google News — Ebola",
        "url": "https://news.google.com/rss/search?q=ebola+outbreak+vaccine&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "global",
        "description": "Aggregated public news on Ebola outbreaks and vaccines",
    },
    {
        "name": "Google News — Hemorrhagic Fever",
        "url": "https://news.google.com/rss/search?q=viral+hemorrhagic+fever+surveillance&hl=en-US&gl=US&ceid=US:en",
        "category": "surveillance",
        "region": "global",
        "description": "Public news on viral hemorrhagic fever surveillance",
    },
    {
        "name": "CDC Health Alert Network",
        "url": "https://tools.cdc.gov/api/v2/resources/media/404372.rss",
        "category": "alert",
        "region": "global",
        "description": "CDC HAN public health alerts",
    },
]


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).astimezone(UTC)
    except (TypeError, ValueError, OverflowError):
        pass
    try:
        return date_parser.parse(value).astimezone(UTC)
    except (ValueError, TypeError, OverflowError):
        return None


def _score_relevance(title: str, summary: str | None) -> float:
    text = f"{title} {summary or ''}"
    matches = len(EBOLA_KEYWORDS.findall(text))
    if matches == 0:
        return 0.1
    return min(1.0, 0.3 + matches * 0.15)


def _infer_category(title: str, summary: str | None, default: str) -> str:
    text = f"{title} {summary or ''}".lower()
    if any(k in text for k in ("vaccine", "vaccination", "immunization", "gavi")):
        return "vaccine"
    if any(k in text for k in ("outbreak", "case", "epidemic", "surveillance")):
        return "outbreak"
    if any(k in text for k in ("trial", "treatment", "therapeutic", "drug")):
        return "treatment"
    if any(k in text for k in ("humanitarian", "relief", "response")):
        return "humanitarian"
    return default


async def seed_default_sources(db: AsyncSession) -> int:
    created = 0
    for item in DEFAULT_SOURCES:
        exists = await db.scalar(select(Source.id).where(Source.url == item["url"]))
        if exists:
            continue
        db.add(Source(**item))
        created += 1
    if created:
        await db.commit()
    return created


async def fetch_source(db: AsyncSession, source: Source) -> tuple[int, int]:
    settings = get_settings()
    new_count = 0
    fetched = 0

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(
            source.url,
            headers={"User-Agent": "EbolaCrisisHub/1.0 (public-health monitoring)"},
        )
        response.raise_for_status()
        feed = feedparser.parse(response.text)

    for entry in feed.entries[: settings.max_articles_per_source]:
        fetched += 1
        url = entry.get("link") or entry.get("id")
        if not url:
            continue

        existing = await db.scalar(select(Article.id).where(Article.url == url))
        if existing:
            continue

        summary = entry.get("summary") or entry.get("description")
        if summary and len(summary) > 2000:
            summary = summary[:2000] + "…"

        title = entry.get("title", "Untitled")
        article = Article(
            source_id=source.id,
            title=title,
            url=url,
            summary=summary,
            author=entry.get("author"),
            category=_infer_category(title, summary, source.category),
            region=source.region,
            published_at=_parse_date(entry.get("published") or entry.get("updated")),
            relevance_score=_score_relevance(title, summary),
        )
        db.add(article)
        new_count += 1

    source.last_fetched_at = datetime.now(UTC)
    await db.commit()
    return new_count, fetched


async def fetch_all_sources(db: AsyncSession) -> list[tuple[Source, int, int, str | None]]:
    result = await db.scalars(select(Source).where(Source.is_active.is_(True)))
    sources = result.all()
    outcomes: list[tuple[Source, int, int, str | None]] = []

    for source in sources:
        try:
            new_count, fetched = await fetch_source(db, source)
            outcomes.append((source, new_count, fetched, None))
        except Exception as exc:  # noqa: BLE001 — per-source failure should not stop batch
            outcomes.append((source, 0, 0, str(exc)))

    return outcomes


async def search_articles(
    db: AsyncSession,
    query: str,
    *,
    category: str | None = None,
    region: str | None = None,
    limit: int = 25,
) -> list[Article]:
    terms = [term.strip() for term in query.split() if term.strip()]
    stmt = select(Article).options(selectinload(Article.source)).order_by(
        Article.relevance_score.desc(),
        Article.published_at.desc().nullslast(),
        Article.fetched_at.desc(),
    )

    if category:
        stmt = stmt.where(Article.category == category)
    if region:
        stmt = stmt.where(Article.region == region)

    if terms:
        filters = []
        for term in terms:
            pattern = f"%{term}%"
            filters.append(
                or_(
                    Article.title.ilike(pattern),
                    Article.summary.ilike(pattern),
                    Article.tags.ilike(pattern),
                )
            )
        stmt = stmt.where(*filters)

    stmt = stmt.limit(limit)
    result = await db.scalars(stmt)
    return list(result.all())


async def get_recent_articles(db: AsyncSession, limit: int = 50) -> list[Article]:
    stmt = (
        select(Article)
        .options(selectinload(Article.source))
        .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
        .limit(limit)
    )
    result = await db.scalars(stmt)
    return list(result.all())


async def get_articles_by_ids(db: AsyncSession, article_ids: list[int]) -> list[Article]:
    if not article_ids:
        return []
    stmt = (
        select(Article)
        .options(selectinload(Article.source))
        .where(Article.id.in_(article_ids))
        .order_by(Article.relevance_score.desc())
    )
    result = await db.scalars(stmt)
    return list(result.all())


async def count_articles_since(db: AsyncSession, since: datetime) -> int:
    return await db.scalar(select(func.count()).select_from(Article).where(Article.fetched_at >= since)) or 0
