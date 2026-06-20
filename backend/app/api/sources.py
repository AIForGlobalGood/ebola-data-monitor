from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import Source
from app.schemas import FetchResult, SourceCreate, SourceRead
from app.services.dashboard import get_source, list_sources
from app.services.ingestion import fetch_all_sources, fetch_source, seed_default_sources

router = APIRouter()


@router.get("", response_model=list[SourceRead])
async def get_sources(db: AsyncSession = Depends(get_db)) -> list[SourceRead]:
    return await list_sources(db)


@router.post("", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def create_source(payload: SourceCreate, db: AsyncSession = Depends(get_db)) -> SourceRead:
    source = Source(**payload.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    item = SourceRead.model_validate(source)
    item.article_count = 0
    return item


@router.post("/seed", response_model=dict)
async def seed_sources(db: AsyncSession = Depends(get_db)) -> dict:
    created = await seed_default_sources(db)
    return {"created": created, "message": f"Seeded {created} default public-health feeds"}


@router.post("/fetch-all", response_model=list[FetchResult])
async def fetch_all(db: AsyncSession = Depends(get_db)) -> list[FetchResult]:
    outcomes = await fetch_all_sources(db)
    return [
        FetchResult(
            source_id=source.id,
            source_name=source.name,
            new_articles=new_count,
            total_fetched=fetched,
            status="ok" if error is None else "error",
            message=error,
        )
        for source, new_count, fetched, error in outcomes
    ]


@router.post("/{source_id}/fetch", response_model=FetchResult)
async def fetch_one(source_id: int, db: AsyncSession = Depends(get_db)) -> FetchResult:
    source = await get_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    try:
        new_count, fetched = await fetch_source(db, source)
        return FetchResult(
            source_id=source.id,
            source_name=source.name,
            new_articles=new_count,
            total_fetched=fetched,
            status="ok",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
