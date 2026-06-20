from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas import ArticleRead
from app.services.dashboard import article_to_read
from app.services.ingestion import get_recent_articles

router = APIRouter()


@router.get("", response_model=list[ArticleRead])
async def recent_feed(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[ArticleRead]:
    articles = await get_recent_articles(db, limit=limit)
    return [article_to_read(article) for article in articles]
