from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import Briefing
from app.schemas import BriefingRead, BriefingRequest
from app.services.ingestion import get_articles_by_ids, search_articles
from app.services.synthesizer import synthesize_briefing

router = APIRouter()


@router.get("", response_model=list[BriefingRead])
async def list_briefings(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[BriefingRead]:
    result = await db.scalars(select(Briefing).order_by(Briefing.created_at.desc()).limit(limit))
    return [BriefingRead.model_validate(item) for item in result.all()]


@router.post("/generate", response_model=BriefingRead)
async def generate_briefing(payload: BriefingRequest, db: AsyncSession = Depends(get_db)) -> BriefingRead:
    if payload.article_ids:
        articles = await get_articles_by_ids(db, payload.article_ids)
    elif payload.query:
        articles = await search_articles(db, payload.query, limit=20)
    else:
        articles = await search_articles(db, "ebola outbreak vaccine", limit=15)

    result = await synthesize_briefing(payload.query, payload.focus, articles)

    briefing = Briefing(
        title=payload.title or f"Crisis Briefing — {payload.focus.title()}",
        query=payload.query,
        summary=result.summary,
        key_findings="\n".join(f"• {item}" for item in result.key_findings),
        recommendations="\n".join(f"• {item}" for item in result.recommendations),
        article_ids=",".join(str(a.id) for a in articles),
        provider=result.provider,
    )
    db.add(briefing)
    await db.commit()
    await db.refresh(briefing)
    return BriefingRead.model_validate(briefing)
