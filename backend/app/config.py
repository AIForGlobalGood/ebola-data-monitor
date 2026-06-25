import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Ebola Situation View"
    database_url: str | None = None
    turso_database_url: str | None = None
    turso_auth_token: str | None = None
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # LLM providers — set one to enable live synthesis
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"
    llm_provider: str = "mock"  # mock | openai | anthropic

    fetch_interval_minutes: int = 30
    max_articles_per_source: int = 50
    cron_secret: str | None = None

    @property
    def uses_turso(self) -> bool:
        return bool(self.turso_database_url and self.turso_auth_token)

    @property
    def resolved_database_url(self) -> str:
        if self.uses_turso:
            replica_path = "/tmp/data/replica.db" if os.getenv("VERCEL") else "./data/replica.db"
            return f"sqlite+libsql:///{replica_path}"
        if self.database_url:
            return self._normalize_sqlite_url(self.database_url)
        if os.getenv("VERCEL"):
            return "sqlite:////tmp/data/crisis_hub.db"
        return "sqlite:///./data/crisis_hub.db"

    @property
    def database_connect_args(self) -> dict:
        if not self.uses_turso:
            return {}
        sync_url = self.turso_database_url or ""
        if sync_url.startswith("libsql://"):
            sync_url = sync_url.removeprefix("libsql://")
        if not sync_url.startswith("https://"):
            sync_url = f"https://{sync_url}"
        return {
            "auth_token": self.turso_auth_token,
            "sync_url": sync_url,
        }

    @staticmethod
    def _normalize_sqlite_url(url: str) -> str:
        return (
            url.replace("sqlite+aiosqlite:///", "sqlite:///")
            .replace("sqlite+aiosqlite://", "sqlite://")
        )

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        for key in ("VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
            host = os.getenv(key)
            if host:
                origins.append(f"https://{host}")
        return list(dict.fromkeys(origins))

    @property
    def is_vercel(self) -> bool:
        return os.getenv("VERCEL") == "1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
