import logging
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing
from app.schemas import (
    ControlTowerData,
    DateFilterMeta,
    MapPoint,
    RegionDetail,
    TimelineBucket,
    TowerAlert,
    TowerHeadline,
)
from app.services.dashboard import article_to_read, briefing_to_read, get_dashboard_stats
from app.services.ebola_domain import MIN_EVD_RELEVANCE
from app.services.date_filters import apply_date_filters, date_filter_active
from app.services.ebola_domain import LOCATION_CATALOG, SEVERITY_ORDER, locations_from_json, max_severity

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Ebola virus disease (EVD) situational awareness only — not epidemiological confirmation. "
    "Signals are machine-classified from public RSS feeds (WHO, ReliefWeb, CDC). "
    "Severity and health-zone tagging are automated; confirmed case counts must come from official situation reports. "
    "Primary sources (WHO, CDC, ReliefWeb) are shown separately from unverified media aggregators."
)


def _alert_sort_key(article: Article) -> tuple:
    tier_rank = {"primary": 3, "official": 2, "aggregator": 1}.get(article.source_tier, 0)
    return (tier_rank, SEVERITY_ORDER.get(article.severity, 0), article.relevance_score)


def _build_timeline(articles: list[Article], *, max_days: int = 14, max_per_day: int = 8) -> list[TimelineBucket]:
    day_total: dict[str, int] = defaultdict(int)
    day_items: dict[str, list] = defaultdict(list)

    for article in articles:
        if not article.published_at:
            continue
        day = article.published_at.date().isoformat()
        day_total[day] += 1
        if len(day_items[day]) < max_per_day:
            day_items[day].append(article_to_read(article))

    return [
        TimelineBucket(date=day, count=day_total[day], articles=day_items[day])
        for day in sorted(day_total.keys(), reverse=True)[:max_days]
    ]


def _build_map_points(all_articles: list[Article]) -> list[MapPoint]:
    location_total: dict[str, int] = defaultdict(int)
    location_primary: dict[str, int] = defaultdict(int)
    location_media: dict[str, int] = defaultdict(int)
    location_severity: dict[str, str] = {}

    for article in all_articles:
        for loc in locations_from_json(article.locations):
            location_total[loc] += 1
            if article.source_tier in {"primary", "official"}:
                location_primary[loc] += 1
                location_severity[loc] = max_severity(location_severity.get(loc, "low"), article.severity)
            else:
                location_media[loc] += 1

    map_points: list[MapPoint] = []
    for name, count in location_total.items():
        meta = LOCATION_CATALOG.get(name)
        if not meta:
            continue
        sev = location_severity.get(name, "low")
        if location_primary.get(name, 0) == 0:
            sev = "low"
        map_points.append(
            MapPoint(
                location=name,
                lat=float(meta["lat"]),  # type: ignore[arg-type]
                lng=float(meta["lng"]),  # type: ignore[arg-type]
                count=count,
                primary_count=location_primary.get(name, 0),
                media_count=location_media.get(name, 0),
                severity=sev,
            )
        )
    map_points.sort(key=lambda p: p.primary_count, reverse=True)
    return map_points


def _build_headline(
    *,
    all_articles: list[Article],
    verified_alerts: list[TowerAlert],
    map_points: list[MapPoint],
    matched: int,
) -> TowerHeadline:
    official_times = [
        a.published_at
        for a in all_articles
        if a.source_tier in {"primary", "official"} and a.published_at is not None
    ]
    ingest_times = [a.fetched_at for a in all_articles if a.fetched_at is not None]

    return TowerHeadline(
        verified_alerts=len(verified_alerts),
        affected_regions=len(map_points),
        critical_high=sum(1 for a in all_articles if a.severity in {"critical", "high"}),
        matched_signals=matched,
        last_official_update=max(official_times) if official_times else None,
        last_ingest_at=max(ingest_times) if ingest_times else None,
        as_of=datetime.now(UTC),
    )


async def get_control_tower(
    db: AsyncSession,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> ControlTowerData:
    stats = await get_dashboard_stats(db)

    base = select(Article).options(selectinload(Article.source))
    base = base.where(Article.relevance_score >= MIN_EVD_RELEVANCE)
    base = apply_date_filters(base, date_from=date_from, date_to=date_to, date_field=date_field)

    matched = await db.scalar(select(func.count()).select_from(base.subquery())) or 0

    candidates_stmt = (
        base.where(Article.severity.in_(["critical", "high", "medium"]))
        .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
        .limit(40)
    )
    candidates = (await db.scalars(candidates_stmt)).all()
    candidates.sort(key=_alert_sort_key, reverse=True)

    verified_alerts = [
        TowerAlert(article=article_to_read(a), severity=a.severity)
        for a in candidates
        if a.source_tier in {"primary", "official"}
    ][:12]

    media_signals = [
        TowerAlert(article=article_to_read(a), severity=a.severity)
        for a in candidates
        if a.source_tier == "aggregator"
    ][:12]

    timeline_stmt = base.where(Article.published_at.is_not(None)).order_by(Article.published_at.desc()).limit(200)
    timeline_articles = (await db.scalars(timeline_stmt)).all()
    timeline = _build_timeline(timeline_articles)

    all_articles = (await db.scalars(base)).all()
    map_points = _build_map_points(all_articles)
    headline = _build_headline(
        all_articles=all_articles,
        verified_alerts=verified_alerts,
        map_points=map_points,
        matched=matched,
    )

    latest = await db.scalar(select(Briefing).order_by(Briefing.created_at.desc()).limit(1))
    if latest:
        article_ids = [int(x) for x in (latest.article_ids or "").split(",") if x.strip().isdigit()]
        articles = (
            await db.scalars(
                select(Article).options(selectinload(Article.source)).where(Article.id.in_(article_ids))
            )
        ).all() if article_ids else []
        stats.latest_briefing = briefing_to_read(latest, list(articles))

    if date_filter_active(date_from, date_to):
        stats.total_articles = matched

    filter_meta = DateFilterMeta(
        date_from=date_from,
        date_to=date_to,
        date_field=date_field,
        matched_articles=matched,
        active=date_filter_active(date_from, date_to),
    )

    return ControlTowerData(
        stats=stats,
        headline=headline,
        verified_alerts=verified_alerts,
        media_signals=media_signals,
        alerts=verified_alerts,
        timeline=timeline,
        map_points=map_points,
        disclaimer=DISCLAIMER,
        date_filter=filter_meta,
    )


def _location_matches(article_locations: list[str], target: str) -> bool:
    if target in article_locations:
        return True
    target_meta = LOCATION_CATALOG.get(target, {})
    parent = target_meta.get("parent")
    if isinstance(parent, str) and parent in article_locations:
        return True
    for loc in article_locations:
        child_meta = LOCATION_CATALOG.get(loc, {})
        if child_meta.get("parent") == target:
            return True
    return False


async def get_region_detail(
    db: AsyncSession,
    location: str,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> RegionDetail | None:
    if location not in LOCATION_CATALOG:
        return None

    base = select(Article).options(selectinload(Article.source))
    base = base.where(Article.relevance_score >= MIN_EVD_RELEVANCE)
    base = apply_date_filters(base, date_from=date_from, date_to=date_to, date_field=date_field)
    all_articles = (await db.scalars(base)).all()

    matching = [a for a in all_articles if _location_matches(locations_from_json(a.locations), location)]
    matching.sort(key=_alert_sort_key, reverse=True)

    map_points = _build_map_points(all_articles)
    map_point = next((p for p in map_points if p.location == location), None)

    timeline_source = sorted(
        [a for a in matching if a.published_at is not None],
        key=lambda a: a.published_at or datetime.min.replace(tzinfo=UTC),
        reverse=True,
    )
    timeline = _build_timeline(timeline_source, max_days=10, max_per_day=6)

    filter_meta = DateFilterMeta(
        date_from=date_from,
        date_to=date_to,
        date_field=date_field,
        matched_articles=len(matching),
        active=date_filter_active(date_from, date_to),
    )

    return RegionDetail(
        location=location,
        map_point=map_point,
        articles=[article_to_read(a) for a in matching[:30]],
        timeline=timeline,
        date_filter=filter_meta,
    )
