from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas import ArticleRead, SearchRequest
from app.services.dashboard import article_to_read
from app.services.ingestion import resolve_date_filters, search_articles

router = APIRouter()


@router.post("", response_model=list[ArticleRead])
async def search(payload: SearchRequest, db: AsyncSession = Depends(get_db)) -> list[ArticleRead]:
    parsed_from, parsed_to, field = resolve_date_filters(
        payload.date_from, payload.date_to, payload.date_field
    )
    articles = await search_articles(
        db,
        payload.query,
        category=payload.category,
        region=payload.region,
        severity=payload.severity,
        date_from=parsed_from,
        date_to=parsed_to,
        date_field=field,
        limit=payload.limit,
    )
    return [article_to_read(article) for article in articles]
