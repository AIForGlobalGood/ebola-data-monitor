import { Loader2, Sparkles } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  Article,
  Briefing,
  ControlTowerData,
  FetchResult,
  OfficialMetric,
  Source,
} from "./api";
import { ArticleCard } from "./components/ArticleCard";
import { AboutPage } from "./components/AboutPage";
import { BriefingPanel } from "./components/BriefingPanel";
import { ControlTowerView } from "./components/ControlTowerView";
import { AppShell } from "./components/layout/AppShell";
import { TrustDisclaimer } from "./components/TrustDisclaimer";
import { Panel, PanelHeader, ScrollSection, SectionHeader } from "./components/ui/Panel";
import { buildDateFilterParams, DEFAULT_DATE_FILTER, type DateFilterState } from "./dateFilters";
import { SECTION_HEIGHT } from "./components/layout/constants";
import { CATEGORIES, categoryLabel, formatDate } from "./utils";
import type { Tab } from "./components/layout/AppShell";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tower, setTower] = useState<ControlTowerData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [officialMetrics, setOfficialMetrics] = useState<OfficialMetric[]>([]);
  const [fetchResults, setFetchResults] = useState<FetchResult[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [briefingQuery, setBriefingQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [feedCategory, setFeedCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  const dateParams = useMemo(() => buildDateFilterParams(dateFilter), [dateFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [towerData, feed, sourceList, briefingList, officialSituation] = await Promise.all([
        api.tower(dateParams),
        api.feed(50, undefined, undefined, dateParams),
        api.sources(),
        api.briefings(),
        api.officialSituation(),
      ]);
      setTower(towerData);
      setArticles(feed);
      setSources(sourceList);
      setBriefings(briefingList);
      setOfficialMetrics(officialSituation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [dateParams]);

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
        undefined,
        dateParams,
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
      const results = await api.feed(
        50,
        category === "all" ? undefined : category,
        undefined,
        dateParams,
      );
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
      const briefing = await api.generateBriefing(
        briefingQuery || searchQuery || "ebola outbreak Ituri DRC Uganda Bundibugyo confirmed cases contact tracing",
        "situational awareness",
        dateParams,
      );
      setBriefings((prev) => [briefing, ...prev]);
      setTab("briefings");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing generation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      busy={busy}
      tower={tower}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onRefresh={() => void refresh()}
      onFetchAll={() => void handleFetchAll()}
      onSearchSubmit={handleSearch}
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
      matchedCount={tower?.date_filter?.matched_articles}
    >
      {error && (
        <div className="mb-6 rounded-xl border border-hub-crisis/35 bg-hub-crisis-soft px-4 py-3 text-sm text-hub-crisis">
          {error}
        </div>
      )}

      {tab === "overview" && tower && (
        <ControlTowerView
          data={tower}
          officialMetrics={officialMetrics}
          category={categoryFilter}
          onCategoryChange={setCategoryFilter}
          dateParams={dateParams}
        />
      )}

      {tab === "feed" && (
        <div className="space-y-6">
          <ScrollSection
            defaultHeight={SECTION_HEIGHT.feed}
            header={
              <div className="space-y-4">
                <SectionHeader
                  eyebrow="Intelligence feed"
                  title="Live signals"
                  description="All ingested articles ranked by relevance — filter by category or search"
                  className="mb-0"
                />
                <TrustDisclaimer compact />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => void handleFeedCategoryChange(cat)}
                      className={feedCategory === cat ? "chip-active" : "chip-idle"}
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field min-w-[240px] flex-1"
                    placeholder="Search: ebola outbreak Ituri DRC Uganda Bundibugyo contact tracing"
                  />
                  <button type="submit" className="btn-secondary">
                    Search
                  </button>
                </form>
                {busy === "feed" && (
                  <div className="flex items-center gap-2 text-sm text-hub-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating feed…
                  </div>
                )}
              </div>
            }
          >
            <div className="grid gap-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
              {articles.length === 0 && !loading && (
                <Panel><p className="text-sm text-hub-muted">No articles match. Run Ingest to fetch sources.</p></Panel>
              )}
            </div>
          </ScrollSection>
        </div>
      )}

      {tab === "sources" && (
        <ScrollSection
          defaultHeight={SECTION_HEIGHT.sources}
          header={
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Data pipeline"
                title="RSS sources"
                description="EVD-focused RSS · ReliefWeb DRC · WHO · ring vaccination · contact tracing"
                className="mb-0"
              />
              <TrustDisclaimer compact />
              {fetchResults && (
                <Panel noPadding>
                  <PanelHeader eyebrow="Last run" title="Ingestion results" />
                  <ul className="space-y-2 px-5 pb-5 font-mono text-xs text-hub-muted">
                    {fetchResults.map((result) => (
                      <li key={result.source_id} className="flex flex-wrap justify-between gap-2 border-b border-hub-border py-2 last:border-0">
                        <span className="text-hub-text">{result.source_name}</span>
                        <span>
                          +{result.new_articles} new · {result.total_fetched} scanned
                          {result.status === "error" && <span className="text-hub-crisis"> · {result.message}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hub-border bg-hub-surface/80 font-mono text-2xs uppercase tracking-wider text-hub-subtle">
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Articles</th>
                  <th className="px-5 py-3 font-medium">Last fetched</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b border-hub-border/60 transition hover:bg-hub-surface/40">
                    <td className="px-5 py-4">
                      <div className="font-medium text-hub-text">{source.name}</div>
                      <div className="mt-0.5 max-w-md truncate font-mono text-2xs text-hub-subtle">{source.url}</div>
                    </td>
                    <td className="px-5 py-4 capitalize text-hub-muted">{source.category}</td>
                    <td className="px-5 py-4 font-mono text-hub-info">{source.article_count}</td>
                    <td className="px-5 py-4 font-mono text-2xs text-hub-subtle">{formatDate(source.last_fetched_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollSection>
      )}

      {tab === "briefings" && (
        <ScrollSection
          defaultHeight={SECTION_HEIGHT.briefings}
          header={
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Synthesis"
                title="Crisis briefings"
                description="Source-cited executive summaries — configure OpenAI or Anthropic for live LLM output"
                className="mb-0"
              />
              <Panel noPadding>
                <PanelHeader eyebrow="Generate" title="New briefing" />
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  <input
                    value={briefingQuery}
                    onChange={(e) => setBriefingQuery(e.target.value)}
                    placeholder="Focus query (optional — defaults to outbreak context)"
                    className="input-field min-w-[280px] flex-1"
                  />
                  <button onClick={() => void handleGenerateBriefing()} disabled={!!busy} className="btn-accent">
                    {busy === "briefing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Synthesize
                  </button>
                </div>
              </Panel>
            </div>
          }
        >
          <div className="space-y-4">
            {briefings.length === 0 && (
              <Panel>
                <p className="text-sm text-hub-muted">No briefings yet. Generate one to synthesize current signals.</p>
              </Panel>
            )}
            {briefings.map((briefing) => (
              <BriefingPanel key={briefing.id} briefing={briefing} />
            ))}
          </div>
        </ScrollSection>
      )}

      {tab === "about" && <AboutPage />}
    </AppShell>
  );
}
