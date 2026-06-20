from fastapi import APIRouter

from app.api import briefings, dashboard, feed, search, sources, tower

api_router = APIRouter(prefix="/api")
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(tower.router, prefix="/tower", tags=["tower"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(briefings.router, prefix="/briefings", tags=["briefings"])
