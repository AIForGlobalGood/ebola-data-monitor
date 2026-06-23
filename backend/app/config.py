import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Ebola Situation ViewView"
    database_url: str | None = None
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
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        if os.getenv("VERCEL"):
            return "sqlite+aiosqlite:////tmp/data/crisis_hub.db"
        return "sqlite+aiosqlite:///./data/crisis_hub.db"

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
