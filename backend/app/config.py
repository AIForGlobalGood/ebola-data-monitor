from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Ebola Crisis Hub"
    database_url: str = "sqlite+aiosqlite:///./data/crisis_hub.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # LLM providers — set one to enable live synthesis
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"
    llm_provider: str = "mock"  # mock | openai | anthropic

    fetch_interval_minutes: int = 30
    max_articles_per_source: int = 50

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
