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


class RelevanceSignal(BaseModel):
    pillar: str
    label: str
    weight: float


class RelevanceTrace(BaseModel):
    goal: str
    score: float
    verdict: str
    source_context: str
    signals: list[RelevanceSignal] = Field(default_factory=list)
    negatives: list[str] = Field(default_factory=list)


class OfficialMetricRead(BaseModel):
    country: str
    confirmed_cases: int | None = None
    deaths: int | None = None
    probable_deaths: int | None = None
    recoveries: int | None = None
    admissions: int | None = None
    imported_cases: int | None = None
    local_cases: int | None = None
    contacts_active: int | None = None
    source_name: str
    source_url: str
    source_type: str
    as_of: str | None = None
    fetched_at: datetime | None = None
    notes: str | None = None
    status: str = "ok"


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
    severity: str = "low"
    locations: list[str] = Field(default_factory=list)
    source_tier: str = "aggregator"
    trust_score: float = 0.45
    source_name: str | None = None
    relevance_trace: RelevanceTrace | None = None


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    category: str | None = None
    region: str | None = None
    severity: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    date_field: str = Field(default="published", pattern="^(published|fetched)$")
    limit: int = Field(default=25, ge=1, le=100)


class DateFilterMeta(BaseModel):
    date_from: datetime | None = None
    date_to: datetime | None = None
    date_field: str = "published"
    matched_articles: int = 0
    active: bool = False


class CitedFinding(BaseModel):
    text: str
    article_ids: list[int] = Field(default_factory=list)
    confidence: str = "likely"


class BriefingRequest(BaseModel):
    query: str | None = None
    title: str | None = None
    article_ids: list[int] | None = None
    focus: str = "situational awareness"
    date_from: str | None = None
    date_to: str | None = None
    date_field: str = Field(default="published", pattern="^(published|fetched)$")


class BriefingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    query: str | None = None
    summary: str
    key_findings: str | None = None
    recommendations: str | None = None
    findings: list[CitedFinding] = Field(default_factory=list)
    source_articles: list[ArticleRead] = Field(default_factory=list)
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
    severity_24h: dict[str, int] = Field(default_factory=dict)
    trust_by_tier: dict[str, int] = Field(default_factory=dict)
    primary_signals_24h: int = 0
    latest_briefing: BriefingRead | None = None


class FetchResult(BaseModel):
    source_id: int
    source_name: str
    new_articles: int
    total_fetched: int
    status: str
    message: str | None = None


class TowerAlert(BaseModel):
    article: ArticleRead
    severity: str


class TimelineBucket(BaseModel):
    date: str
    count: int
    articles: list[ArticleRead]


class MapPoint(BaseModel):
    location: str
    lat: float
    lng: float
    count: int
    primary_count: int = 0
    media_count: int = 0
    severity: str
    zone: str = "watch"


class GeographyStats(BaseModel):
    corridor_regions: int = 0
    import_watch_regions: int = 0
    import_signals: int = 0
    by_location: dict[str, int] = Field(default_factory=dict)
    import_by_location: dict[str, int] = Field(default_factory=dict)


class TowerHeadline(BaseModel):
    verified_alerts: int = 0
    affected_regions: int = 0
    corridor_regions: int = 0
    import_watch_regions: int = 0
    import_signals: int = 0
    critical_high: int = 0
    matched_signals: int = 0
    last_official_update: datetime | None = None
    last_ingest_at: datetime | None = None
    as_of: datetime


class RegionDetail(BaseModel):
    location: str
    map_point: MapPoint | None = None
    articles: list[ArticleRead] = Field(default_factory=list)
    timeline: list[TimelineBucket] = Field(default_factory=list)
    date_filter: DateFilterMeta = Field(default_factory=DateFilterMeta)


class ControlTowerData(BaseModel):
    stats: DashboardStats
    headline: TowerHeadline
    geography: GeographyStats = Field(default_factory=GeographyStats)
    verified_alerts: list[TowerAlert]
    media_signals: list[TowerAlert]
    import_signals: list[TowerAlert] = Field(default_factory=list)
    alerts: list[TowerAlert]
    timeline: list[TimelineBucket]
    map_points: list[MapPoint]
    disclaimer: str
    date_filter: DateFilterMeta = Field(default_factory=DateFilterMeta)
