import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models import Article, Briefing
from app.schemas import BriefingRead, BriefingRequest
from app.services.dashboard import briefing_to_read
from app.services.ingestion import get_articles_by_ids, search_articles
from app.services.synthesizer import synthesize_briefing

router = APIRouter()


@router.get("", response_model=list[BriefingRead])
async def list_briefings(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[BriefingRead]:
    result = await db.scalars(select(Briefing).order_by(Briefing.created_at.desc()).limit(limit))
    briefings = result.all()
    items: list[BriefingRead] = []
    for briefing in briefings:
        article_ids = [int(x) for x in (briefing.article_ids or "").split(",") if x.strip().isdigit()]
        articles = (
            await db.scalars(
                select(Article).options(selectinload(Article.source)).where(Article.id.in_(article_ids))
            )
        ).all() if article_ids else []
        items.append(briefing_to_read(briefing, list(articles)))
    return items


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
        citations_json=json.dumps([f.model_dump() for f in result.findings]),
        article_ids=",".join(str(a.id) for a in articles),
        provider=result.provider,
    )
    db.add(briefing)
    await db.commit()
    await db.refresh(briefing)
    return briefing_to_read(briefing, articles)
