import os

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    warnings: list[str] = []

    if settings.is_vercel and not settings.uses_turso:
        warnings.append(
            "Production is using ephemeral SQLite. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
        )
    if settings.is_vercel and not (settings.cron_secret or os.environ.get("CRON_SECRET")):
        warnings.append("CRON_SECRET is not set; cron ingest is disabled on Vercel.")

    persistence = "turso" if settings.uses_turso else "sqlite"
    if settings.is_vercel and not settings.uses_turso:
        persistence = "ephemeral-sqlite"

    return {
        "ok": len(warnings) == 0,
        "app": settings.app_name,
        "database": {
            "persistence": persistence,
            "turso_configured": settings.uses_turso,
        },
        "reliefweb_appname_configured": bool(settings.reliefweb_appname),
        "warnings": warnings,
    }
