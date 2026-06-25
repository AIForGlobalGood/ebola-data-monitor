from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import DashboardStats
from app.services.dashboard import get_dashboard_stats

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(db: Session = Depends(get_db)) -> DashboardStats:
    return get_dashboard_stats(db)
