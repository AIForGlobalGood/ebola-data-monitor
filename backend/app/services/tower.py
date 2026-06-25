import logging
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing
from app.schemas import (
    ControlTowerData,
    DateFilterMeta,
    GeographyStats,
    ImportWatchCountry,
    MapPoint,
    RegionDetail,
    TimelineBucket,
    TowerAlert,
    TowerHeadline,
)
from app.services.dashboard import article_to_read, briefing_to_read, get_dashboard_stats
from app.services.ebola_domain import MIN_EVD_RELEVANCE
from app.services.date_filters import apply_date_filters, date_filter_active
from app.services.ebola_domain import (
    LOCATION_CATALOG,
    SEVERITY_ORDER,
    article_has_import_location,
    location_zone,
    locations_from_json,
    max_severity,
)

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Ebola virus disease (EVD) situational awareness only — not epidemiological confirmation. "
    "Signals are machine-classified from public RSS feeds (WHO, ReliefWeb, CDC). "
    "Severity and geography tags are automated; confirmed case counts must come from official situation reports. "
    "Import-watch regions (EU, Americas, Asia-Pacific) reflect media mentions — not verified import confirmations. "
    "Primary sources (WHO, CDC, ReliefWeb) are shown separately from unverified media aggregators."
)


def _alert_sort_key(article: Article) -> tuple:
    tier_rank = {"primary": 3, "official": 2, "aggregator": 1}.get(article.source_tier, 0)
    import_boost = 1 if article_has_import_location(locations_from_json(article.locations)) else 0
    return (import_boost, tier_rank, SEVERITY_ORDER.get(article.severity, 0), article.relevance_score)


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
    location_media_severity: dict[str, str] = {}

    for article in all_articles:
        for loc in locations_from_json(article.locations):
            location_total[loc] += 1
            if article.source_tier in {"primary", "official"}:
                location_primary[loc] += 1
                location_severity[loc] = max_severity(location_severity.get(loc, "low"), article.severity)
            else:
                location_media[loc] += 1
                location_media_severity[loc] = max_severity(
                    location_media_severity.get(loc, "low"), article.severity
                )

    map_points: list[MapPoint] = []
    for name, count in location_total.items():
        meta = LOCATION_CATALOG.get(name)
        if not meta:
            continue
        zone = location_zone(name)
        sev = location_severity.get(name, "low")
        if location_primary.get(name, 0) == 0:
            sev = location_media_severity.get(name, "low")
        map_points.append(
            MapPoint(
                location=name,
                lat=float(meta["lat"]),  # type: ignore[arg-type]
                lng=float(meta["lng"]),  # type: ignore[arg-type]
                count=count,
                primary_count=location_primary.get(name, 0),
                media_count=location_media.get(name, 0),
                severity=sev,
                zone=zone,
            )
        )

    def _sort_key(point: MapPoint) -> tuple:
        zone_rank = {"hotspot": 4, "endemic": 3, "watch": 2, "import": 1}.get(point.zone, 0)
        return (zone_rank, point.primary_count, point.count)

    map_points.sort(key=_sort_key, reverse=True)
    return map_points


def _build_geography_stats(all_articles: list[Article], map_points: list[MapPoint]) -> GeographyStats:
    import_by_location: dict[str, int] = {}
    for point in map_points:
        if point.zone == "import":
            import_by_location[point.location] = point.count

    return GeographyStats(
        corridor_regions=sum(1 for p in map_points if p.zone in {"endemic", "hotspot", "watch"}),
        import_watch_regions=sum(1 for p in map_points if p.zone == "import"),
        import_signals=sum(
            1
            for article in all_articles
            if article_has_import_location(locations_from_json(article.locations))
        ),
        by_location={point.location: point.count for point in map_points},
        import_by_location=import_by_location,
    )


def _build_headline(
    *,
    all_articles: list[Article],
    verified_alerts: list[TowerAlert],
    geography: GeographyStats,
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
        affected_regions=geography.corridor_regions + geography.import_watch_regions,
        corridor_regions=geography.corridor_regions,
        import_watch_regions=geography.import_watch_regions,
        import_signals=geography.import_signals,
        critical_high=sum(1 for a in all_articles if a.severity in {"critical", "high"}),
        matched_signals=matched,
        last_official_update=max(official_times) if official_times else None,
        last_ingest_at=max(ingest_times) if ingest_times else None,
        as_of=datetime.now(UTC),
    )


def _build_import_watch_countries(all_articles: list[Article], map_points: list[MapPoint]) -> list[ImportWatchCountry]:
    import_points = [point for point in map_points if point.zone == "import"]
    import_points.sort(key=lambda point: (point.count, point.media_count), reverse=True)

    rows: list[ImportWatchCountry] = []
    for point in import_points:
        matching = [
            article
            for article in all_articles
            if _location_matches(locations_from_json(article.locations), point.location)
        ]
        matching.sort(key=_alert_sort_key, reverse=True)
        top = matching[0] if matching else None
        rows.append(
            ImportWatchCountry(
                location=point.location,
                signal_count=point.count,
                media_signals=point.media_count,
                primary_signals=point.primary_count,
                top_headline=top.title if top else None,
                top_url=top.url if top else None,
                top_published_at=top.published_at if top else None,
                top_source_name=top.source.name if top and top.source else None,
                top_severity=top.severity if top else None,
            )
        )
    return rows


def _build_import_alerts(candidates: list[Article], *, limit: int = 12) -> list[TowerAlert]:
    import_candidates = [
        article
        for article in candidates
        if article_has_import_location(locations_from_json(article.locations))
    ]
    import_candidates.sort(key=_alert_sort_key, reverse=True)
    return [TowerAlert(article=article_to_read(a), severity=a.severity) for a in import_candidates[:limit]]


def get_control_tower(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> ControlTowerData:
    stats = get_dashboard_stats(db)

    base = select(Article).options(selectinload(Article.source))
    base = base.where(Article.relevance_score >= MIN_EVD_RELEVANCE)
    base = apply_date_filters(base, date_from=date_from, date_to=date_to, date_field=date_field)

    matched = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    candidates_stmt = (
        base.where(Article.severity.in_(["critical", "high", "medium"]))
        .order_by(Article.relevance_score.desc(), Article.published_at.desc().nullslast())
        .limit(60)
    )
    candidates = (db.scalars(candidates_stmt)).all()
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

    import_alerts = _build_import_alerts(candidates)

    timeline_stmt = base.where(Article.published_at.is_not(None)).order_by(Article.published_at.desc()).limit(200)
    timeline_articles = (db.scalars(timeline_stmt)).all()
    timeline = _build_timeline(timeline_articles)

    all_articles = (db.scalars(base)).all()
    map_points = _build_map_points(all_articles)
    geography = _build_geography_stats(all_articles, map_points)
    headline = _build_headline(
        all_articles=all_articles,
        verified_alerts=verified_alerts,
        geography=geography,
        matched=matched,
    )

    latest = db.scalar(select(Briefing).order_by(Briefing.created_at.desc()).limit(1))
    if latest:
        article_ids = [int(x) for x in (latest.article_ids or "").split(",") if x.strip().isdigit()]
        articles = (
            db.scalars(
                select(Article).options(selectinload(Article.source)).where(Article.id.in_(article_ids))
            )
        ).all() if article_ids else []
        stats.latest_briefing = briefing_to_read(latest, list(articles))

    stats.total_articles = matched

    filter_meta = DateFilterMeta(
        date_from=date_from,
        date_to=date_to,
        date_field=date_field,
        matched_articles=matched,
        active=date_filter_active(date_from, date_to),
    )

    import_watch_countries = _build_import_watch_countries(all_articles, map_points)

    return ControlTowerData(
        stats=stats,
        headline=headline,
        geography=geography,
        import_watch_countries=import_watch_countries,
        verified_alerts=verified_alerts,
        media_signals=media_signals,
        import_signals=import_alerts,
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


def get_region_detail(
    db: Session,
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
    all_articles = (db.scalars(base)).all()

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
