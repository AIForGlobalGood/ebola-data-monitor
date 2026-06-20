export interface CitedFinding {
  text: string;
  article_ids: number[];
  confidence: "confirmed" | "likely" | "unverified" | string;
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
  source_name: string | null;
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
  severity: string;
}

export interface ControlTowerData {
  stats: DashboardStats;
  alerts: TowerAlert[];
  timeline: TimelineBucket[];
  map_points: MapPoint[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  tower: () => request<ControlTowerData>("/api/tower"),
  dashboard: () => request<DashboardStats>("/api/dashboard"),
  sources: () => request<Source[]>("/api/sources"),
  fetchAll: () => request<FetchResult[]>("/api/sources/fetch-all", { method: "POST" }),
  feed: (limit = 50, category?: string, severity?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    if (severity) params.set("severity", severity);
    return request<Article[]>(`/api/feed?${params}`);
  },
  search: (query: string, category?: string, severity?: string) =>
    request<Article[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, category, severity, limit: 30 }),
    }),
  briefings: () => request<Briefing[]>("/api/briefings"),
  generateBriefing: (query?: string, focus = "situational awareness") =>
    request<Briefing>("/api/briefings/generate", {
      method: "POST",
      body: JSON.stringify({ query, focus }),
    }),
};
