import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.db.database import SessionLocal, init_db
from app.services.ingestion import seed_default_sources
from app.services.scheduler import background_fetch_loop, startup_tasks

_stop_event: asyncio.Event | None = None
_fetch_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _stop_event, _fetch_task

    Path("data").mkdir(exist_ok=True)
    await init_db()
    async with SessionLocal() as db:
        await seed_default_sources(db)
    await startup_tasks()

    _stop_event = asyncio.Event()
    _fetch_task = asyncio.create_task(background_fetch_loop(_stop_event))

    yield

    if _stop_event:
        _stop_event.set()
    if _fetch_task:
        await _fetch_task


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description=(
            "Ebola Emergency Crisis Control Tower — monitor, retrieve, organize, "
            "and synthesize public information for situational awareness."
        ),
        version="0.2.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
