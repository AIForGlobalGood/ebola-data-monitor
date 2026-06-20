from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas import ControlTowerData
from app.services.tower import get_control_tower

router = APIRouter()


@router.get("", response_model=ControlTowerData)
async def control_tower(db: AsyncSession = Depends(get_db)) -> ControlTowerData:
    return await get_control_tower(db)
