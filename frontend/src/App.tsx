import {
  Activity,
  AlertTriangle,
  Globe2,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  api,
  Article,
  Briefing,
  ControlTowerData,
  FetchResult,
  Source,
} from "./api";
import { ArticleCard } from "./components/ArticleCard";
import { BriefingPanel } from "./components/BriefingPanel";
import { ControlTowerView } from "./components/ControlTowerView";
import { TrustDisclaimer } from "./components/TrustDisclaimer";
import { CATEGORIES, formatDate } from "./utils";

type Tab = "overview" | "feed" | "sources" | "briefings";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tower, setTower] = useState<ControlTowerData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [fetchResults, setFetchResults] = useState<FetchResult[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("ebola outbreak vaccine surveillance");
  const [briefingQuery, setBriefingQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [feedCategory, setFeedCategory] = useState("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [towerData, feed, sourceList, briefingList] = await Promise.all([
        api.tower(),
        api.feed(50),
        api.sources(),
        api.briefings(),
      ]);
      setTower(towerData);
      setArticles(feed);
      setSources(sourceList);
      setBriefings(briefingList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleFetchAll() {
    setBusy("fetch");
    setError(null);
    try {
      const results = await api.fetchAll();
      setFetchResults(results);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setBusy("search");
    setError(null);
    try {
      const results = await api.search(
        searchQuery,
        feedCategory === "all" ? undefined : feedCategory,
      );
      setArticles(results);
      setTab("feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleFeedCategoryChange(category: string) {
    setFeedCategory(category);
    setBusy("feed");
    try {
      const results = await api.feed(50, category === "all" ? undefined : category);
      setArticles(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to filter feed");
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateBriefing() {
    setBusy("briefing");
    setError(null);
    try {
      const briefing = await api.generateBriefing(briefingQuery || searchQuery);
      setBriefings((prev) => [briefing, ...prev]);
      setTab("briefings");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing generation failed");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "overview", label: "Control Tower", icon: ShieldAlert },
    { id: "feed", label: "Live Feed", icon: Radio },
    { id: "sources", label: "Sources", icon: Globe2 },
    { id: "briefings", label: "Briefings", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-hub-border/80 bg-hub-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Emergency Response
            </div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Ebola Crisis Hub</h1>
            <p className="text-sm text-hub-muted">Control Tower — live map, alerts, timeline & source-cited briefings</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form onSubmit={handleSearch} className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hub-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-lg border border-hub-border bg-hub-panel py-2 pl-10 pr-3 text-sm outline-none focus:border-hub-teal"
                  placeholder="Search public information…"
                />
              </div>
            </form>
            <button
              onClick={() => void refresh()}
              disabled={loading || !!busy}
              className="inline-flex items-center gap-2 rounded-lg border border-hub-border bg-hub-panel px-3 py-2 text-sm hover:border-hub-teal/50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              onClick={() => void handleFetchAll()}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {busy === "fetch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Fetch All
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                tab === id ? "bg-hub-teal/15 text-hub-teal" : "text-hub-muted hover:bg-hub-panel hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab !== "overview" && (
          <div className="mb-4">
            <TrustDisclaimer compact />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {tab === "overview" && tower && (
          <ControlTowerView data={tower} category={categoryFilter} onCategoryChange={setCategoryFilter} />
        )}

        {tab === "feed" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => void handleFeedCategoryChange(cat)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${
                    feedCategory === cat ? "border-hub-teal bg-hub-teal/15 text-hub-teal" : "border-hub-border text-hub-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-[240px] flex-1 rounded-lg border border-hub-border bg-hub-panel px-3 py-2 text-sm outline-none focus:border-hub-teal"
              />
              <button type="submit" className="rounded-lg bg-hub-teal px-4 py-2 text-sm font-medium text-hub-bg">
                Search
              </button>
            </form>
            <div className="grid gap-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        )}

        {tab === "sources" && (
          <div className="space-y-4">
            <p className="text-sm text-hub-muted">Sources auto-refresh every 30 minutes. Last manual fetch results below.</p>
            {fetchResults && (
              <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-4 text-sm">
                <h3 className="mb-2 font-semibold">Last fetch run</h3>
                <ul className="space-y-1 text-hub-muted">
                  {fetchResults.map((result) => (
                    <li key={result.source_id}>
                      {result.source_name}: {result.new_articles} new / {result.total_fetched} scanned
                      {result.status === "error" && ` — ${result.message}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-hub-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-hub-panel text-hub-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Articles</th>
                    <th className="px-4 py-3 font-medium">Last fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-t border-hub-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{source.name}</div>
                        <div className="text-xs text-hub-muted">{source.url}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{source.category}</td>
                      <td className="px-4 py-3 font-mono">{source.article_count}</td>
                      <td className="px-4 py-3 text-hub-muted">{formatDate(source.last_fetched_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "briefings" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-4">
              <h3 className="mb-2 font-semibold">Generate source-cited briefing</h3>
              <p className="mb-3 text-sm text-hub-muted">
                Each finding links back to the articles it was derived from. Configure OpenAI or Anthropic for live LLM synthesis.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={briefingQuery}
                  onChange={(e) => setBriefingQuery(e.target.value)}
                  placeholder="Optional focus query"
                  className="min-w-[280px] flex-1 rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm outline-none focus:border-hub-teal"
                />
                <button
                  onClick={() => void handleGenerateBriefing()}
                  disabled={!!busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-hub-bg disabled:opacity-50"
                >
                  {busy === "briefing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Synthesize
                </button>
              </div>
            </div>
            {briefings.map((briefing) => (
              <BriefingPanel key={briefing.id} briefing={briefing} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
