from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import ControlTowerData, RegionDetail
from app.services.ingestion import resolve_date_filters
from app.services.tower import get_control_tower, get_region_detail

router = APIRouter()


@router.get("", response_model=ControlTowerData)
async def control_tower(
    date_from: str | None = None,
    date_to: str | None = None,
    date_field: str = Query(default="published", pattern="^(published|fetched)$"),
    db: Session = Depends(get_db),
) -> ControlTowerData:
    parsed_from, parsed_to, field = resolve_date_filters(date_from, date_to, date_field)
    return get_control_tower(
        db,
        date_from=parsed_from,
        date_to=parsed_to,
        date_field=field,
    )


@router.get("/region", response_model=RegionDetail)
async def region_detail(
    location: str = Query(min_length=1, max_length=120),
    date_from: str | None = None,
    date_to: str | None = None,
    date_field: str = Query(default="published", pattern="^(published|fetched)$"),
    db: Session = Depends(get_db),
) -> RegionDetail:
    parsed_from, parsed_to, field = resolve_date_filters(date_from, date_to, date_field)
    detail = get_region_detail(
        db,
        location,
        date_from=parsed_from,
        date_to=parsed_to,
        date_field=field,
    )
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Unknown location: {location}")
    return detail
