import asyncio
import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing
from app.schemas import (
    ArticleRead,
    BriefingRead,
    ControlTowerData,
    MapPoint,
    TimelineBucket,
    TowerAlert,
)
from app.services.dashboard import article_to_read, briefing_to_read, get_dashboard_stats
from app.services.entities import SEVERITY_ORDER, locations_from_json, map_points_from_locations, max_severity

logger = logging.getLogger(__name__)


async def get_control_tower(db: AsyncSession) -> ControlTowerData:
    stats = await get_dashboard_stats(db)

    alert_articles = (
        await db.scalars(
            select(Article)
            .options(selectinload(Article.source))
            .where(Article.severity.in_(["critical", "high", "medium"]))
            .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
            .limit(30)
        )
    ).all()
    alert_articles.sort(
        key=lambda a: (SEVERITY_ORDER.get(a.severity, 0), a.relevance_score),
        reverse=True,
    )

    alerts = [
        TowerAlert(article=article_to_read(article), severity=article.severity)
        for article in alert_articles[:15]
    ]

    timeline_articles = (
        await db.scalars(
            select(Article)
            .options(selectinload(Article.source))
            .where(Article.published_at.is_not(None))
            .order_by(Article.published_at.desc())
            .limit(100)
        )
    ).all()

    buckets: dict[str, list[ArticleRead]] = defaultdict(list)
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

    all_articles = (await db.scalars(select(Article))).all()
    location_counts: dict[str, int] = defaultdict(int)
    location_severity: dict[str, str] = {}
    for article in all_articles:
        for loc in locations_from_json(article.locations):
            location_counts[loc] += 1
            location_severity[loc] = max_severity(location_severity.get(loc, "low"), article.severity)

    map_points = [MapPoint(**point) for point in map_points_from_locations(location_counts, location_severity)]

    latest = await db.scalar(select(Briefing).order_by(Briefing.created_at.desc()).limit(1))
    if latest:
        article_ids = [int(x) for x in (latest.article_ids or "").split(",") if x.strip().isdigit()]
        articles = (
            await db.scalars(
                select(Article).options(selectinload(Article.source)).where(Article.id.in_(article_ids))
            )
        ).all() if article_ids else []
        stats.latest_briefing = briefing_to_read(latest, list(articles))

    return ControlTowerData(stats=stats, alerts=alerts, timeline=timeline, map_points=map_points)
