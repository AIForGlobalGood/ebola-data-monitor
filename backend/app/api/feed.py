from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import ArticleRead
from app.services.ingestion import get_recent_articles, resolve_date_filters

router = APIRouter()


@router.get("", response_model=list[ArticleRead])
async def recent_feed(
    limit: int = Query(default=50, ge=1, le=200),
    category: str | None = None,
    severity: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    date_field: str = Query(default="published", pattern="^(published|fetched)$"),
    db: Session = Depends(get_db),
) -> list[ArticleRead]:
    from app.services.dashboard import article_to_read

    parsed_from, parsed_to, field = resolve_date_filters(date_from, date_to, date_field)
    articles = get_recent_articles(
        db,
        limit=limit,
        category=category,
        severity=severity,
        date_from=parsed_from,
        date_to=parsed_to,
        date_field=field,
    )
    return [article_to_read(article) for article in articles]
