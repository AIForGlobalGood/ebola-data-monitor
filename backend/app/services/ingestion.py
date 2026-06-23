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
from app.services.ebola_domain import (
    MIN_EVD_RELEVANCE,
    assess_article_relevance,
    compute_severity,
    extract_locations,
    infer_evd_category,
    is_evd_relevant,
    locations_to_json,
)
from app.services.date_filters import apply_date_filters, parse_date_param
from app.services.source_trust import infer_source_tier, trust_score_for_tier
from app.services.text_utils import clean_html, normalize_title, normalize_url, title_fingerprint, titles_are_duplicate

DEFAULT_SOURCES = [
    {
        "name": "ReliefWeb — DRC Updates",
        "url": "https://reliefweb.int/updates/rss.xml?legacy-river=country/cod",
        "category": "outbreak",
        "region": "drc",
        "description": "DRC humanitarian updates including EVD situation reports",
    },
    {
        "name": "ReliefWeb — Ebola",
        "url": "https://reliefweb.int/updates/rss.xml?search=Ebola",
        "category": "outbreak",
        "region": "africa",
        "description": "ReliefWeb Ebola outbreak and response updates",
    },
    {
        "name": "WHO News",
        "url": "https://www.who.int/rss-feeds/news-english.xml",
        "category": "health",
        "region": "global",
        "description": "WHO global health news (EVD-filtered at ingest)",
    },
    {
        "name": "Google News — EVD Outbreak DRC Uganda",
        "url": "https://news.google.com/rss/search?q=ebola+outbreak+DRC+Uganda+Ituri+confirmed+cases&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "africa",
        "description": "Public news on active DRC/Uganda EVD outbreaks",
    },
    {
        "name": "Google News — Ebola Vaccine Ring Vaccination",
        "url": "https://news.google.com/rss/search?q=ebola+vaccine+Ervebo+ring+vaccination&hl=en-US&gl=US&ceid=US:en",
        "category": "vaccine",
        "region": "africa",
        "description": "EVD ring vaccination and Ervebo coverage",
    },
    {
        "name": "Google News — Uganda Bundibugyo EVD",
        "url": "https://news.google.com/rss/search?q=Uganda+Bundibugyo+ebola+cross+border&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "uganda",
        "description": "Bundibugyo strain and cross-border EVD signals",
    },
    {
        "name": "Google News — EVD Contact Tracing Response",
        "url": "https://news.google.com/rss/search?q=ebola+contact+tracing+safe+burial+response&hl=en-US&gl=US&ceid=US:en",
        "category": "response",
        "region": "africa",
        "description": "EVD response operations — tracing, burial, IPC",
    },
    {
        "name": "Google News — Ebola (broad)",
        "url": "https://news.google.com/rss/search?q=ebola&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "global",
        "description": "Broad Ebola news net — relevance-filtered at ingest",
    },
    {
        "name": "Google News — Ebola Africa",
        "url": "https://news.google.com/rss/search?q=%22ebola%22+Africa+outbreak&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "africa",
        "description": "Ebola coverage across Africa beyond DRC/Uganda corridor",
    },
    {
        "name": "Google News — Sudan ebolavirus",
        "url": "https://news.google.com/rss/search?q=Sudan+ebolavirus+OR+SUDV+OR+%22Sudan+strain%22&hl=en-US&gl=US&ceid=US:en",
        "category": "outbreak",
        "region": "africa",
        "description": "Sudan ebolavirus (SUDV) and strain-specific signals",
    },
    {
        "name": "CDC Health Alert Network",
        "url": "https://tools.cdc.gov/api/v2/resources/media/404372.rss",
        "category": "alert",
        "region": "global",
        "description": "CDC HAN public health alerts (EVD-filtered at ingest)",
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


def _score_relevance(title: str, summary: str | None, source: Source) -> tuple[float, str]:
    assessment = assess_article_relevance(
        title,
        summary,
        source_name=source.name,
        source_url=source.url,
        source_region=source.region,
    )
    return assessment.score, assessment.to_json()


def _infer_category(title: str, summary: str | None, default: str) -> str:
    return infer_evd_category(title, summary, default)


def _enrich_article_fields(title: str, summary: str | None, category: str, source: Source) -> dict:
    tier = infer_source_tier(source.url, source.name)
    relevance, trace_json = _score_relevance(title, summary, source)
    severity = compute_severity(title, summary, category, relevance, source_tier=tier)
    locations = extract_locations(title, summary)
    region = locations[0] if locations else source.region
    return {
        "relevance_score": relevance,
        "relevance_trace": trace_json,
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
        article.relevance_trace = enriched["relevance_trace"]
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
            headers={"User-Agent": "EbolaSituationView/1.0 (public-health monitoring)"},
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

        if not is_evd_relevant(
            title,
            summary,
            source_name=source.name,
            source_url=source.url,
            source_region=source.region,
        ):
            continue

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
            relevance_trace=enriched["relevance_trace"],
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
    evd_only: bool = True,
) -> list[Article]:
    terms = [term.strip() for term in query.split() if term.strip()]
    stmt = select(Article).options(selectinload(Article.source)).order_by(
        Article.relevance_score.desc(),
        Article.published_at.desc().nullslast(),
        Article.fetched_at.desc(),
    )

    if evd_only:
        stmt = stmt.where(Article.relevance_score >= MIN_EVD_RELEVANCE)

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
    evd_only: bool = True,
) -> list[Article]:
    stmt = (
        select(Article)
        .options(selectinload(Article.source))
        .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
    )
    if evd_only:
        stmt = stmt.where(Article.relevance_score >= MIN_EVD_RELEVANCE)
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
