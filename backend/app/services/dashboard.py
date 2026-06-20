from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Article, Briefing, Source
from app.schemas import ArticleRead, BriefingRead, DashboardStats, SourceRead


def article_to_read(article: Article) -> ArticleRead:
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
        source_name=article.source.name if article.source else None,
    )


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    total_sources = await db.scalar(select(func.count()).select_from(Source)) or 0
    active_sources = await db.scalar(select(func.count()).select_from(Source).where(Source.is_active.is_(True))) or 0
    total_articles = await db.scalar(select(func.count()).select_from(Article)) or 0
    total_briefings = await db.scalar(select(func.count()).select_from(Briefing)) or 0

    since = datetime.now(UTC) - timedelta(hours=24)
    articles_24h = await db.scalar(select(func.count()).select_from(Article).where(Article.fetched_at >= since)) or 0

    category_rows = await db.execute(
        select(Article.category, func.count())
        .group_by(Article.category)
        .order_by(func.count().desc())
    )
    categories = {row[0]: row[1] for row in category_rows.all()}

    region_rows = await db.execute(
        select(Article.region, func.count())
        .where(Article.region.is_not(None))
        .group_by(Article.region)
        .order_by(func.count().desc())
    )
    regions = {row[0]: row[1] for row in region_rows.all() if row[0]}

    latest = await db.scalar(select(Briefing).order_by(Briefing.created_at.desc()).limit(1))
    latest_briefing = BriefingRead.model_validate(latest) if latest else None

    return DashboardStats(
        total_sources=total_sources,
        active_sources=active_sources,
        total_articles=total_articles,
        articles_24h=articles_24h,
        total_briefings=total_briefings,
        categories=categories,
        regions=regions,
        latest_briefing=latest_briefing,
    )


async def list_sources(db: AsyncSession) -> list[SourceRead]:
    stmt = (
        select(Source, func.count(Article.id))
        .outerjoin(Article, Article.source_id == Source.id)
        .group_by(Source.id)
        .order_by(Source.name)
    )
    rows = await db.execute(stmt)
    items: list[SourceRead] = []
    for source, count in rows.all():
        data = SourceRead.model_validate(source)
        data.article_count = count
        items.append(data)
    return items


async def get_source(db: AsyncSession, source_id: int) -> Source | None:
    return await db.get(Source, source_id)
