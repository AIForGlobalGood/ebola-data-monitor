from fastapi import APIRouter

from app.schemas import OfficialMetricRead
from app.services.official_stats import fetch_official_situation

router = APIRouter()


@router.get("/situation", response_model=list[OfficialMetricRead])
async def official_situation() -> list[OfficialMetricRead]:
    metrics = await fetch_official_situation()
    return [OfficialMetricRead(**metric.__dict__) for metric in metrics]
