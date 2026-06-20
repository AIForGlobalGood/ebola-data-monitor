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
from app.services.entities import (
    compute_severity,
    extract_locations,
    locations_to_json,
)
from app.services.date_filters import apply_date_filters, parse_date_param
from app.services.source_trust import infer_source_tier, trust_score_for_tier
from app.services.text_utils import clean_html, normalize_title, normalize_url, title_fingerprint, titles_are_duplicate

EBOLA_KEYWORDS = re.compile(
    r"\b(ebola|hemorrhagic|outbreak|epidemic|vaccine|vaccination|"
    r"immunization|biotech|virus|viral|surveillance|contact.?tracing|"
    r"therapeutic|treatment|clinical.?trial|who|cdc|health.?emergency|filovirus|marburg)\b",
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
        "name": "Google News — Ebola Outbreak",
        "url": "https://news.google.com/rss/search?q=ebola+outbreak+confirmed+cases&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "global",
        "description": "Aggregated public news on Ebola outbreaks",
    },
    {
        "name": "Google News — Ebola Vaccine",
        "url": "https://news.google.com/rss/search?q=ebola+vaccine+immunization&hl=en-US&gl=US&ceid=US:en",
        "category": "vaccine",
        "region": "global",
        "description": "Public news on Ebola vaccines and immunization",
    },
    {
        "name": "Google News — Hemorrhagic Fever",
        "url": "https://news.google.com/rss/search?q=viral+hemorrhagic+fever+surveillance&hl=en-US&gl=US&ceid=US:en",
        "category": "surveillance",
        "region": "global",
        "description": "Public news on viral hemorrhagic fever surveillance",
    },
    {
        "name": "Google News — DRC Health",
        "url": "https://news.google.com/rss/search?q=DRC+Congo+ebola+health&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "africa",
        "description": "DRC and Central Africa Ebola-related coverage",
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
    if any(k in text for k in ("outbreak", "case", "epidemic", "surveillance", "cluster")):
        return "outbreak"
    if any(k in text for k in ("trial", "treatment", "therapeutic", "drug", "guideline")):
        return "treatment"
    if any(k in text for k in ("humanitarian", "relief", "response")):
        return "humanitarian"
    if any(k in text for k in ("alert", "emergency", "han")):
        return "alert"
    return default


def _enrich_article_fields(title: str, summary: str | None, category: str, source: Source) -> dict:
    tier = infer_source_tier(source.url, source.name)
    relevance = _score_relevance(title, summary)
    severity = compute_severity(title, summary, category, relevance, source_tier=tier)
    locations = extract_locations(title, summary)
    region = locations[0] if locations else source.region
    return {
        "relevance_score": relevance,
        "severity": severity,
        "locations": locations_to_json(locations),
        "region": region,
        "source_tier": tier,
        "trust_score": trust_score_for_tier(tier),
    }


async def _is_duplicate(db: AsyncSession, url: str, title: str) -> bool:
    normalized = normalize_url(url)
    existing_url = await db.scalar(
        select(Article.id).where(or_(Article.url == url, Article.url == normalized))
    )
    if existing_url:
        return True

    fp = title_fingerprint(title)
    if len(fp) >= 15:
        recent = await db.scalars(select(Article.title).order_by(Article.fetched_at.desc()).limit(500))
        for existing in recent.all():
            if title_fingerprint(existing) == fp or titles_are_duplicate(title, existing):
                return True
    return False


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


async def reprocess_articles(db: AsyncSession) -> int:
    """Re-clean HTML and recompute metadata for existing articles."""
    articles = (await db.scalars(select(Article))).all()
    updated = 0
    for article in articles:
        cleaned = clean_html(article.summary)
        category = _infer_category(article.title, cleaned, article.category)
        source = await db.get(Source, article.source_id)
        if not source:
            continue
        enriched = _enrich_article_fields(article.title, cleaned, category, source)
        article.summary = cleaned
        article.category = category
        article.relevance_score = enriched["relevance_score"]
        article.severity = enriched["severity"]
        article.locations = enriched["locations"]
        if enriched["region"]:
            article.region = enriched["region"]
        article.source_tier = enriched["source_tier"]
        article.trust_score = enriched["trust_score"]
        updated += 1
    if updated:
        await db.commit()
    return updated


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
        raw_url = entry.get("link") or entry.get("id")
        if not raw_url:
            continue

        url = normalize_url(raw_url)
        title = clean_html(entry.get("title", "Untitled"), max_length=500) or "Untitled"

        if await _is_duplicate(db, url, title):
            continue

        raw_summary = entry.get("summary") or entry.get("description")
        summary = clean_html(raw_summary)
        category = _infer_category(title, summary, source.category)
        enriched = _enrich_article_fields(title, summary, category, source)

        article = Article(
            source_id=source.id,
            title=title,
            url=url,
            summary=summary,
            author=entry.get("author"),
            category=category,
            region=enriched["region"],
            published_at=_parse_date(entry.get("published") or entry.get("updated")),
            relevance_score=enriched["relevance_score"],
            severity=enriched["severity"],
            locations=enriched["locations"],
            source_tier=enriched["source_tier"],
            trust_score=enriched["trust_score"],
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
        except Exception as exc:  # noqa: BLE001
            outcomes.append((source, 0, 0, str(exc)))

    return outcomes


async def search_articles(
    db: AsyncSession,
    query: str,
    *,
    category: str | None = None,
    region: str | None = None,
    severity: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
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
        stmt = stmt.where(or_(Article.region == region, Article.locations.ilike(f"%{region}%")))
    if severity:
        stmt = stmt.where(Article.severity == severity)

    stmt = apply_date_filters(stmt, date_from=date_from, date_to=date_to, date_field=date_field)

    if terms:
        filters = []
        for term in terms:
            pattern = f"%{term}%"
            filters.append(
                or_(
                    Article.title.ilike(pattern),
                    Article.summary.ilike(pattern),
                    Article.tags.ilike(pattern),
                    Article.locations.ilike(pattern),
                )
            )
        stmt = stmt.where(*filters)

    stmt = stmt.limit(limit)
    result = await db.scalars(stmt)
    return list(result.all())


async def get_recent_articles(
    db: AsyncSession,
    limit: int = 50,
    *,
    category: str | None = None,
    severity: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> list[Article]:
    stmt = (
        select(Article)
        .options(selectinload(Article.source))
        .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
    )
    if category:
        stmt = stmt.where(Article.category == category)
    if severity:
        stmt = stmt.where(Article.severity == severity)
    stmt = apply_date_filters(stmt, date_from=date_from, date_to=date_to, date_field=date_field)
    stmt = stmt.limit(limit)
    result = await db.scalars(stmt)
    return list(result.all())


def resolve_date_filters(
    date_from: str | None,
    date_to: str | None,
    date_field: str = "published",
) -> tuple[datetime | None, datetime | None, str]:
    parsed_from = parse_date_param(date_from, end_of_day=False)
    parsed_to = parse_date_param(date_to, end_of_day=True)
    field = date_field if date_field in {"published", "fetched"} else "published"
    return parsed_from, parsed_to, field


async def get_alerts(db: AsyncSession, limit: int = 20) -> list[Article]:
    stmt = (
        select(Article)
        .options(selectinload(Article.source))
        .where(Article.severity.in_(["critical", "high"]))
        .order_by(Article.published_at.desc().nullslast(), Article.relevance_score.desc())
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
