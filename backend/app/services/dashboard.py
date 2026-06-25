import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing, Source
from app.schemas import ArticleRead, BriefingRead, CitedFinding, DashboardStats, RelevanceTrace, SourceRead
from app.services.entities import locations_from_json
from app.services.date_filters import retention_predicate
from app.services.relevance_trace import trace_from_json


def article_to_read(article: Article) -> ArticleRead:
    trace_raw = trace_from_json(getattr(article, "relevance_trace", None))
    trace = RelevanceTrace(**trace_raw) if trace_raw else None
    return ArticleRead(
        id=article.id,
        source_id=article.source_id,
        title=article.title,
        url=article.url,
        summary=article.summary,
        author=article.author,
        category=article.category,
        region=article.region,
        tags=article.tags,
        published_at=article.published_at,
        fetched_at=article.fetched_at,
        relevance_score=article.relevance_score,
        severity=getattr(article, "severity", "low") or "low",
        locations=locations_from_json(getattr(article, "locations", None)),
        source_tier=getattr(article, "source_tier", "aggregator") or "aggregator",
        trust_score=float(getattr(article, "trust_score", 0.45) or 0.45),
        source_name=article.source.name if article.source else None,
        relevance_trace=trace,
    )


def briefing_to_read(briefing: Briefing, articles: list[Article] | None = None) -> BriefingRead:
    findings: list[CitedFinding] = []
    if briefing.citations_json:
        try:
            raw = json.loads(briefing.citations_json)
            findings = [CitedFinding(**item) for item in raw if isinstance(item, dict)]
        except json.JSONDecodeError:
            findings = []

    source_articles = [article_to_read(a) for a in (articles or [])]
    return BriefingRead(
        id=briefing.id,
        title=briefing.title,
        query=briefing.query,
        summary=briefing.summary,
        key_findings=briefing.key_findings,
        recommendations=briefing.recommendations,
        findings=findings,
        source_articles=source_articles,
        article_ids=briefing.article_ids,
        provider=briefing.provider,
        created_at=briefing.created_at,
    )


def get_dashboard_stats(db: Session) -> DashboardStats:
    retained = retention_predicate()
    total_sources = db.scalar(select(func.count()).select_from(Source)) or 0
    active_sources = db.scalar(select(func.count()).select_from(Source).where(Source.is_active.is_(True))) or 0
    total_articles = db.scalar(select(func.count()).select_from(Article).where(retained)) or 0
    total_briefings = db.scalar(select(func.count()).select_from(Briefing)) or 0

    since = datetime.now(UTC) - timedelta(hours=24)
    articles_24h = (
        db.scalar(select(func.count()).select_from(Article).where(retained, Article.fetched_at >= since)) or 0
    )

    category_rows = db.execute(
        select(Article.category, func.count())
        .where(retained)
        .group_by(Article.category)
        .order_by(func.count().desc())
    )
    categories = {row[0]: row[1] for row in category_rows.all()}

    region_rows = db.execute(
        select(Article.region, func.count())
        .where(retained, Article.region.is_not(None))
        .group_by(Article.region)
        .order_by(func.count().desc())
    )
    regions = {row[0]: row[1] for row in region_rows.all() if row[0]}

    severity_rows = db.execute(
        select(Article.severity, func.count())
        .where(retained, Article.fetched_at >= since)
        .group_by(Article.severity)
    )
    severity_24h = {row[0]: row[1] for row in severity_rows.all()}

    tier_rows = db.execute(
        select(Article.source_tier, func.count())
        .where(retained, Article.fetched_at >= since)
        .group_by(Article.source_tier)
    )
    trust_by_tier = {row[0]: row[1] for row in tier_rows.all()}

    primary_signals_24h = (
        db.scalar(
            select(func.count())
            .select_from(Article)
            .where(retained, Article.fetched_at >= since, Article.source_tier == "primary")
        )
        or 0
    )

    latest = db.scalar(select(Briefing).order_by(Briefing.created_at.desc()).limit(1))
    latest_briefing = None
    if latest:
        article_ids = [int(x) for x in (latest.article_ids or "").split(",") if x.strip().isdigit()]
        articles = (
            db.scalars(
                select(Article).options(selectinload(Article.source)).where(Article.id.in_(article_ids))
            )
        ).all() if article_ids else []
        latest_briefing = briefing_to_read(latest, list(articles))

    return DashboardStats(
        total_sources=total_sources,
        active_sources=active_sources,
        total_articles=total_articles,
        articles_24h=articles_24h,
        total_briefings=total_briefings,
        categories=categories,
        regions=regions,
        severity_24h=severity_24h,
        trust_by_tier=trust_by_tier,
        primary_signals_24h=primary_signals_24h,
        latest_briefing=latest_briefing,
    )


def list_sources(db: Session) -> list[SourceRead]:
    retained = retention_predicate()
    stmt = (
        select(Source, func.count(Article.id))
        .outerjoin(Article, and_(Article.source_id == Source.id, retained))
        .group_by(Source.id)
        .order_by(Source.name)
    )
    rows = db.execute(stmt)
    items: list[SourceRead] = []
    for source, count in rows.all():
        data = SourceRead.model_validate(source)
        data.article_count = count
        items.append(data)
    return items


def get_source(db: Session, source_id: int) -> Source | None:
    return db.get(Source, source_id)
