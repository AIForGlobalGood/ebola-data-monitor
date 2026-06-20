from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SourceBase(BaseModel):
    name: str
    url: str
    source_type: str = "rss"
    category: str = "general"
    region: str | None = None
    description: str | None = None
    is_active: bool = True


class SourceCreate(SourceBase):
    pass


class SourceRead(SourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_fetched_at: datetime | None = None
    created_at: datetime
    article_count: int = 0


class ArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: int
    title: str
    url: str
    summary: str | None = None
    author: str | None = None
    category: str
    region: str | None = None
    tags: str | None = None
    published_at: datetime | None = None
    fetched_at: datetime
    relevance_score: float
    source_name: str | None = None


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    category: str | None = None
    region: str | None = None
    limit: int = Field(default=25, ge=1, le=100)


class BriefingRequest(BaseModel):
    query: str | None = None
    title: str | None = None
    article_ids: list[int] | None = None
    focus: str = "situational awareness"


class BriefingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    query: str | None = None
    summary: str
    key_findings: str | None = None
    recommendations: str | None = None
    article_ids: str | None = None
    provider: str
    created_at: datetime


class DashboardStats(BaseModel):
    total_sources: int
    active_sources: int
    total_articles: int
    articles_24h: int
    total_briefings: int
    categories: dict[str, int]
    regions: dict[str, int]
    latest_briefing: BriefingRead | None = None


class FetchResult(BaseModel):
    source_id: int
    source_name: str
    new_articles: int
    total_fetched: int
    status: str
    message: str | None = None
