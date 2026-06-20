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
import { api, Article, Briefing, DashboardStats, FetchResult, Source } from "./api";

type Tab = "overview" | "feed" | "sources" | "briefings";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relevanceColor(score: number) {
  if (score >= 0.7) return "text-red-400 bg-red-500/10 border-red-500/30";
  if (score >= 0.4) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-slate-400 bg-slate-500/10 border-slate-500/30";
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-hub-teal",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Activity;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-hub-border bg-hub-card/80 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-hub-muted">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <p className="mt-1 text-xs text-hub-muted">{hint}</p>}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="rounded-xl border border-hub-border bg-hub-panel/70 p-4 transition hover:border-hub-teal/40">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium leading-snug text-white hover:text-hub-teal"
        >
          {article.title}
        </a>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${relevanceColor(article.relevance_score)}`}
        >
          {(article.relevance_score * 100).toFixed(0)}% match
        </span>
      </div>
      {article.summary && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-hub-muted">{article.summary.replace(/<[^>]+>/g, "")}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-hub-muted">
        <span className="rounded bg-hub-bg px-2 py-1">{article.source_name ?? "Unknown source"}</span>
        <span className="rounded bg-hub-bg px-2 py-1 capitalize">{article.category}</span>
        {article.region && <span className="rounded bg-hub-bg px-2 py-1">{article.region}</span>}
        <span>{formatDate(article.published_at)}</span>
      </div>
    </article>
  );
}

function BriefingPanel({ briefing }: { briefing: Briefing }) {
  return (
    <div className="space-y-4 rounded-xl border border-hub-border bg-hub-panel/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{briefing.title}</h3>
        <span className="rounded-full border border-hub-border px-2 py-1 text-xs uppercase tracking-wide text-hub-muted">
          {briefing.provider}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-hub-text">{briefing.summary}</p>
      {briefing.key_findings && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-hub-teal">Key findings</h4>
          <pre className="whitespace-pre-wrap font-sans text-sm text-hub-muted">{briefing.key_findings}</pre>
        </div>
      )}
      {briefing.recommendations && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-hub-amber">Recommendations</h4>
          <pre className="whitespace-pre-wrap font-sans text-sm text-hub-muted">{briefing.recommendations}</pre>
        </div>
      )}
      <p className="text-xs text-hub-muted">Generated {formatDate(briefing.created_at)}</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [fetchResults, setFetchResults] = useState<FetchResult[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("ebola outbreak vaccine surveillance");
  const [briefingQuery, setBriefingQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, feed, sourceList, briefingList] = await Promise.all([
        api.dashboard(),
        api.feed(),
        api.sources(),
        api.briefings(),
      ]);
      setStats(dashboard);
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
  }, [refresh]);

  async function handleFetchAll() {
    setBusy("fetch");
    setError(null);
    try {
      const results = await api.fetchAll();
      setFetchResults(results);
      await refresh();
      setTab("sources");
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
      const results = await api.search(searchQuery);
      setArticles(results);
      setTab("feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
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
            <p className="text-sm text-hub-muted">Control Tower — monitor, retrieve, organize & synthesize public information</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              Fetch All Sources
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                tab === id
                  ? "bg-hub-teal/15 text-hub-teal"
                  : "text-hub-muted hover:bg-hub-panel hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {tab === "overview" && stats && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Active sources" value={stats.active_sources} hint={`${stats.total_sources} total configured`} icon={Globe2} />
              <StatCard label="Articles indexed" value={stats.total_articles} hint={`${stats.articles_24h} in last 24h`} icon={Radio} accent="text-red-400" />
              <StatCard label="Briefings generated" value={stats.total_briefings} hint="AI situational summaries" icon={Sparkles} accent="text-amber-400" />
              <StatCard label="Categories tracked" value={Object.keys(stats.categories).length} hint="Outbreak, vaccine, treatment…" icon={Activity} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-5">
                <h2 className="mb-4 font-semibold">Category breakdown</h2>
                <div className="space-y-2">
                  {Object.entries(stats.categories).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-hub-muted">{category}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.categories).length === 0 && (
                    <p className="text-sm text-hub-muted">No articles yet — run Fetch All Sources to ingest public feeds.</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-5">
                <h2 className="mb-4 font-semibold">Search & synthesize</h2>
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hub-muted" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-hub-border bg-hub-bg py-2.5 pl-10 pr-3 text-sm outline-none focus:border-hub-teal"
                      placeholder="Search public information…"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={!!busy} className="rounded-lg bg-hub-teal/20 px-3 py-2 text-sm text-hub-teal hover:bg-hub-teal/30 disabled:opacity-50">
                      Search feed
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGenerateBriefing()}
                      disabled={!!busy}
                      className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                    >
                      Generate briefing
                    </button>
                  </div>
                </form>
                {stats.latest_briefing && (
                  <div className="mt-5 border-t border-hub-border pt-5">
                    <h3 className="mb-2 text-sm font-semibold text-hub-muted">Latest briefing</h3>
                    <BriefingPanel briefing={stats.latest_briefing} />
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 font-semibold">High-priority signals</h2>
              <div className="grid gap-3">
                {articles.slice(0, 5).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
                {articles.length === 0 && !loading && (
                  <p className="text-sm text-hub-muted">No signals yet. Fetch sources to populate the control tower.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "feed" && (
          <div className="space-y-4">
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
              <h3 className="mb-2 font-semibold">Generate situational briefing</h3>
              <p className="mb-3 text-sm text-hub-muted">
                Synthesizes retrieved public articles into an executive summary. Configure OpenAI or Anthropic keys for live LLM output.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={briefingQuery}
                  onChange={(e) => setBriefingQuery(e.target.value)}
                  placeholder="Optional focus query (defaults to Ebola outbreak context)"
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
