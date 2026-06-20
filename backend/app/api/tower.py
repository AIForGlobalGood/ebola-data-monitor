from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas import ControlTowerData
from app.services.ingestion import resolve_date_filters
from app.services.tower import get_control_tower

router = APIRouter()


@router.get("", response_model=ControlTowerData)
async def control_tower(
    date_from: str | None = None,
    date_to: str | None = None,
    date_field: str = Query(default="published", pattern="^(published|fetched)$"),
    db: AsyncSession = Depends(get_db),
) -> ControlTowerData:
    parsed_from, parsed_to, field = resolve_date_filters(date_from, date_to, date_field)
    return await get_control_tower(
        db,
        date_from=parsed_from,
        date_to=parsed_to,
        date_field=field,
    )
