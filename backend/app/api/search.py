from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas import ArticleRead, SearchRequest
from app.services.dashboard import article_to_read
from app.services.ingestion import search_articles

router = APIRouter()


@router.post("", response_model=list[ArticleRead])
async def search(payload: SearchRequest, db: AsyncSession = Depends(get_db)) -> list[ArticleRead]:
    articles = await search_articles(
        db,
        payload.query,
        category=payload.category,
        region=payload.region,
        severity=payload.severity,
        limit=payload.limit,
    )
    return [article_to_read(article) for article in articles]
