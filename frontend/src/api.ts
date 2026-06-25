import type { DateFilterParams } from "./dateFilters";

export interface CitedFinding {
  text: string;
  article_ids: number[];
  confidence: "confirmed" | "likely" | "unverified" | string;
}

export interface RelevanceSignal {
  pillar: string;
  label: string;
  weight: number;
}

export interface RelevanceTrace {
  goal: string;
  score: number;
  verdict: string;
  source_context: string;
  signals: RelevanceSignal[];
  negatives: string[];
}

export interface DashboardStats {
  total_sources: number;
  active_sources: number;
  total_articles: number;
  articles_24h: number;
  total_briefings: number;
  categories: Record<string, number>;
  regions: Record<string, number>;
  severity_24h: Record<string, number>;
  trust_by_tier: Record<string, number>;
  primary_signals_24h: number;
  latest_briefing: Briefing | null;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  source_type: string;
  category: string;
  region: string | null;
  description: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
  article_count: number;
}

export interface OfficialMetric {
  country: string;
  confirmed_cases: number | null;
  deaths: number | null;
  probable_deaths: number | null;
  recoveries: number | null;
  admissions: number | null;
  imported_cases: number | null;
  local_cases: number | null;
  contacts_active: number | null;
  source_name: string;
  source_url: string;
  source_type: string;
  as_of: string | null;
  fetched_at: string | null;
  notes: string | null;
  status: string;
}

export interface Article {
  id: number;
  source_id: number;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  category: string;
  region: string | null;
  tags: string | null;
  published_at: string | null;
  fetched_at: string;
  relevance_score: number;
  severity: string;
  locations: string[];
  source_tier: string;
  trust_score: number;
  source_name: string | null;
  relevance_trace: RelevanceTrace | null;
}

export interface Briefing {
  id: number;
  title: string;
  query: string | null;
  summary: string;
  key_findings: string | null;
  recommendations: string | null;
  findings: CitedFinding[];
  source_articles: Article[];
  article_ids: string | null;
  provider: string;
  created_at: string;
}

export interface FetchResult {
  source_id: number;
  source_name: string;
  new_articles: number;
  total_fetched: number;
  status: string;
  message?: string | null;
}

export interface TowerAlert {
  article: Article;
  severity: string;
}

export interface TimelineBucket {
  date: string;
  count: number;
  articles: Article[];
}

export interface MapPoint {
  location: string;
  lat: number;
  lng: number;
  count: number;
  primary_count: number;
  media_count: number;
  severity: string;
  zone: string;
}

export interface GeographyStats {
  corridor_regions: number;
  import_watch_regions: number;
  import_signals: number;
  by_location: Record<string, number>;
  import_by_location: Record<string, number>;
}

export interface ImportWatchCountry {
  location: string;
  signal_count: number;
  media_signals: number;
  primary_signals: number;
  top_headline: string | null;
  top_url: string | null;
  top_published_at: string | null;
  top_source_name: string | null;
  top_severity: string | null;
}

export interface TowerHeadline {
  verified_alerts: number;
  affected_regions: number;
  corridor_regions: number;
  import_watch_regions: number;
  import_signals: number;
  critical_high: number;
  matched_signals: number;
  last_official_update: string | null;
  last_ingest_at: string | null;
  as_of: string;
}

export interface RegionDetail {
  location: string;
  map_point: MapPoint | null;
  articles: Article[];
  timeline: TimelineBucket[];
  date_filter?: DateFilterMeta;
}

export interface DateFilterMeta {
  date_from: string | null;
  date_to: string | null;
  date_field: string;
  matched_articles: number;
  active: boolean;
}

export interface ControlTowerData {
  stats: DashboardStats;
  headline: TowerHeadline;
  geography: GeographyStats;
  import_watch_countries: ImportWatchCountry[];
  verified_alerts: TowerAlert[];
  media_signals: TowerAlert[];
  import_signals: TowerAlert[];
  alerts: TowerAlert[];
  timeline: TimelineBucket[];
  map_points: MapPoint[];
  disclaimer: string;
  date_filter?: DateFilterMeta;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_API_BASE ?? "";
  const response = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function appendDateParams(params: URLSearchParams, filters?: DateFilterParams) {
  if (!filters) return;
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.date_field) params.set("date_field", filters.date_field);
}

export const api = {
  tower: (filters?: DateFilterParams) => {
    const params = new URLSearchParams();
    appendDateParams(params, filters);
    const qs = params.toString();
    return request<ControlTowerData>(`/api/tower${qs ? `?${qs}` : ""}`);
  },
  regionDetail: (location: string, filters?: DateFilterParams) => {
    const params = new URLSearchParams({ location });
    appendDateParams(params, filters);
    return request<RegionDetail>(`/api/tower/region?${params}`);
  },
  dashboard: () => request<DashboardStats>("/api/dashboard"),
  officialSituation: () => request<OfficialMetric[]>("/api/official/situation"),
  sources: () => request<Source[]>("/api/sources"),
  fetchAll: () => request<FetchResult[]>("/api/sources/fetch-all", { method: "POST" }),
  feed: (
    limit = 50,
    category?: string,
    severity?: string,
    filters?: DateFilterParams,
  ) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    if (severity) params.set("severity", severity);
    appendDateParams(params, filters);
    return request<Article[]>(`/api/feed?${params}`);
  },
  search: (
    query: string,
    category?: string,
    severity?: string,
    filters?: DateFilterParams,
  ) =>
    request<Article[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        category,
        severity,
        limit: 30,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        date_field: filters?.date_field ?? "published",
      }),
    }),
  briefings: () => request<Briefing[]>("/api/briefings"),
  generateBriefing: (
    query?: string,
    focus = "situational awareness",
    filters?: DateFilterParams,
  ) =>
    request<Briefing>("/api/briefings/generate", {
      method: "POST",
      body: JSON.stringify({
        query,
        focus,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        date_field: filters?.date_field ?? "published",
      }),
    }),
};
