import {
  Activity,
  AlertTriangle,
  Globe2,
  Info,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { FormEvent, ReactNode } from "react";
import { ControlTowerData } from "../../api";
import { DateFilterState } from "../../dateFilters";
import { formatDate } from "../../utils";
import { DateFilterBar } from "../DateFilterBar";
import { ThemeSwitcher } from "../ThemeSwitcher";

export type Tab = "overview" | "feed" | "sources" | "briefings" | "about";

const NAV: { id: Tab; label: string; icon: typeof Activity; desc: string }[] = [
  { id: "overview", label: "Control Tower", icon: ShieldAlert, desc: "Map & alerts" },
  { id: "feed", label: "Live Feed", icon: Radio, desc: "All signals" },
  { id: "sources", label: "Sources", icon: Globe2, desc: "RSS feeds" },
  { id: "briefings", label: "Briefings", icon: Sparkles, desc: "Synthesis" },
  { id: "about", label: "About", icon: Info, desc: "Purpose & docs" },
];

export function AppShell({
  tab,
  onTabChange,
  loading,
  busy,
  tower,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  onFetchAll,
  onSearchSubmit,
  dateFilter,
  onDateFilterChange,
  matchedCount,
  children,
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  loading: boolean;
  busy: string | null;
  tower: ControlTowerData | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onRefresh: () => void;
  onFetchAll: () => void;
  onSearchSubmit: (e: FormEvent) => void;
  dateFilter: DateFilterState;
  onDateFilterChange: (next: DateFilterState) => void;
  matchedCount?: number;
  children: ReactNode;
}) {
  const stats = tower?.stats;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-hub-border bg-hub-surface/95 backdrop-blur-xl lg:flex">
        <div className="border-b border-hub-border px-5 py-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hub-crisis-soft ring-1 ring-hub-crisis/30">
              <AlertTriangle className="h-4 w-4 text-hub-crisis" />
            </div>
            <div>
              <p className="eyebrow text-hub-crisis/90">EVD situation</p>
              <h1 className="font-display text-base font-bold tracking-tight">Ebola Situation View</h1>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-hub-subtle">EVD outbreak · corridor + import watch · Public data</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={tab === id ? "nav-item-active" : "nav-item"}
            >
              <Icon className={`h-4 w-4 shrink-0 ${tab === id ? "text-hub-info" : ""}`} />
              <span className="flex flex-col items-start">
                <span>{label}</span>
                <span className="text-2xs font-normal text-hub-subtle">{desc}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="border-t border-hub-border p-4 space-y-3">
          <div>
            <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Appearance</p>
            <ThemeSwitcher fullWidth />
          </div>
          <div className="rounded-xl bg-hub-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-2xs uppercase tracking-wider text-hub-verified">Monitoring live</span>
            </div>
            <p className="text-2xs leading-relaxed text-hub-subtle">
              Auto-refresh every 30 min · {stats?.primary_signals_24h ?? 0} primary signals today
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-hub-border bg-hub-bg/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="lg:hidden">
              <p className="eyebrow text-hub-crisis/90">EVD situation</p>
              <h1 className="font-display text-lg font-bold">Ebola Situation View</h1>
            </div>

            <div className="hidden items-center gap-4 lg:flex">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span className="font-mono text-xs text-hub-verified">LIVE</span>
              </div>
              {stats && (
                <div className="flex items-center gap-4 font-mono text-xs text-hub-subtle">
                  <span>
                    <span className="text-hub-verified">{stats.primary_signals_24h}</span> verified ·{" "}
                    <span className="text-hub-caution">{stats.trust_by_tier?.aggregator ?? 0}</span> media
                  </span>
                  <span>{stats.total_articles} indexed</span>
                </div>
              )}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <ThemeSwitcher className="lg:hidden" />
              <form onSubmit={onSearchSubmit} className="hidden max-w-xs flex-1 md:block lg:max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hub-subtle" />
                  <input
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Search signals…"
                  />
                </div>
              </form>
              <ThemeSwitcher className="hidden lg:inline-flex" />
              <button onClick={onRefresh} disabled={loading || !!busy} className="btn-ghost px-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={onFetchAll} disabled={!!busy} className="btn-primary px-3">
                {busy === "fetch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                <span className="hidden sm:inline">Ingest</span>
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-t border-hub-border px-3 py-2 lg:hidden">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                  tab === id ? "bg-hub-card text-hub-text" : "text-hub-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="border-b border-hub-border bg-hub-bg/60 px-4 py-3 lg:px-8">
          <DateFilterBar
            value={dateFilter}
            onChange={onDateFilterChange}
            matchedCount={matchedCount}
            compact
          />
        </div>

        <main className="relative flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {loading && !tower && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-hub-bg/60 backdrop-blur-sm">
              <div className="panel flex items-center gap-3 px-6 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-hub-info" />
                <span className="text-sm text-hub-muted">Loading situation view…</span>
              </div>
            </div>
          )}
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>

        <footer className="border-t border-hub-border px-4 py-3 lg:px-8">
          <p className="font-mono text-2xs text-hub-subtle">
            Ebola Situation View · Automated OSINT · Not epidemiologically verified · {formatDate(new Date().toISOString())}
          </p>
        </footer>
      </div>
    </div>
  );
}
