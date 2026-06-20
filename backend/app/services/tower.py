import logging
from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing
from app.schemas import ControlTowerData, DateFilterMeta, MapPoint, TimelineBucket, TowerAlert
from app.services.dashboard import article_to_read, briefing_to_read, get_dashboard_stats
from app.services.date_filters import apply_date_filters, date_filter_active
from app.services.entities import LOCATION_CATALOG, SEVERITY_ORDER, locations_from_json, max_severity

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Automated situational awareness only. Severity, locations, and briefings are machine-classified "
    "from public RSS feeds — not verified by epidemiologists. Primary-source signals (WHO, CDC, ReliefWeb) "
    "are shown separately from unverified media aggregators. Always confirm against official situation reports."
)


def _alert_sort_key(article: Article) -> tuple:
    tier_rank = {"primary": 3, "official": 2, "aggregator": 1}.get(article.source_tier, 0)
    return (tier_rank, SEVERITY_ORDER.get(article.severity, 0), article.relevance_score)


async def get_control_tower(
    db: AsyncSession,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> ControlTowerData:
    stats = await get_dashboard_stats(db)

    base = select(Article).options(selectinload(Article.source))
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

    timeline_stmt = (
        base.where(Article.published_at.is_not(None))
        .order_by(Article.published_at.desc())
        .limit(100)
    )
    timeline_articles = (await db.scalars(timeline_stmt)).all()

    buckets: dict[str, list] = defaultdict(list)
    for article in timeline_articles:
        if not article.published_at:
            continue
        day = article.published_at.date().isoformat()
        if len(buckets[day]) < 8:
            buckets[day].append(article_to_read(article))

    timeline = [
        TimelineBucket(date=day, count=len(items), articles=items)
        for day, items in sorted(buckets.items(), reverse=True)[:14]
    ]

    all_articles = (await db.scalars(base)).all()
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
        verified_alerts=verified_alerts,
        media_signals=media_signals,
        alerts=verified_alerts,
        timeline=timeline,
        map_points=map_points,
        disclaimer=DISCLAIMER,
        date_filter=filter_meta,
    )
