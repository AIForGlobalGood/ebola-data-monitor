import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plane,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { ImportWatchCountry, OfficialMetric, TowerAlert } from "../api";
import { formatDate, severityStyles } from "../utils";
import { Panel } from "./ui/Panel";

type SituationTab = "official" | "import";

function numberOrDash(value: number | null) {
  return value == null ? "—" : value.toLocaleString();
}

function sourceLabel(metric: OfficialMetric) {
  if (metric.source_type === "national_ministry") return "National MoH";
  if (metric.source_type === "who_don") return "WHO DON";
  if (metric.source_type === "ecdc") return "ECDC";
  return "Official";
}

function metricScore(metric: OfficialMetric) {
  const sourcePriority =
    metric.source_type === "national_ministry" ? 3 : metric.source_type === "who_don" ? 2 : 1;
  return (metric.confirmed_cases ?? 0) * 100 + (metric.deaths ?? 0) * 10 + sourcePriority;
}

function cumulativeMetrics(rows: OfficialMetric[]) {
  const byCountry = new Map<string, OfficialMetric>();
  for (const metric of rows) {
    const current = byCountry.get(metric.country);
    if (!current || metricScore(metric) > metricScore(current)) {
      byCountry.set(metric.country, metric);
    }
  }

  const selected = [...byCountry.values()];
  return {
    confirmed: selected.reduce((sum, metric) => sum + (metric.confirmed_cases ?? 0), 0),
    deaths: selected.reduce((sum, metric) => sum + (metric.deaths ?? 0), 0),
    countries: selected.length,
    sources: selected.map((metric) => sourceLabel(metric)).join(" · "),
  };
}

function officialMetricsByCountry(rows: OfficialMetric[]) {
  const grouped = new Map<string, OfficialMetric[]>();
  for (const metric of rows) {
    const list = grouped.get(metric.country) ?? [];
    list.push(metric);
    grouped.set(metric.country, list);
  }

  return [...grouped.entries()]
    .map(([country, metrics]) => {
      const sorted = [...metrics].sort((a, b) => metricScore(b) - metricScore(a));
      return { country, primary: sorted[0], alternates: sorted.slice(1) };
    })
    .sort((a, b) => a.country.localeCompare(b.country));
}

export function SituationOverviewPanel({
  metrics,
  countries,
  totalSignals,
  importAlerts,
  onSelectLocation,
}: {
  metrics: OfficialMetric[];
  countries: ImportWatchCountry[];
  totalSignals: number;
  importAlerts: TowerAlert[];
  onSelectLocation?: (location: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<SituationTab>("official");

  const officialRows = metrics.filter((metric) => metric.status === "ok");
  const officialErrors = metrics.filter((metric) => metric.status !== "ok");
  const official = useMemo(() => cumulativeMetrics(officialRows), [officialRows]);
  const officialByCountry = useMemo(() => officialMetricsByCountry(officialRows), [officialRows]);

  const importTotals = useMemo(
    () => ({
      regions: countries.length,
      media: countries.reduce((sum, row) => sum + row.media_signals, 0),
    }),
    [countries],
  );

  return (
    <Panel noPadding>
      <div className="border-b border-hub-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-[200px] flex-1 items-start gap-3 text-left transition hover:opacity-90"
            aria-expanded={expanded}
          >
            <div className="mt-1 rounded-lg border border-hub-border bg-hub-surface p-1.5 text-hub-muted">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <div>
              <p className="eyebrow mb-1 text-hub-subtle">Situation overview</p>
              <h2 className="text-base font-semibold text-hub-text">Official counts &amp; import-watch media</h2>
              {!expanded && (
                <p className="mt-1 text-sm text-hub-muted">
                  Official {numberOrDash(official.confirmed)} confirmed (DRC/Uganda) · Import watch{" "}
                  {importTotals.regions} regions · {totalSignals} media signals
                </p>
              )}
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === "official"} onClick={() => setTab("official")} tone="verified">
              Official
            </TabButton>
            <TabButton active={tab === "import"} onClick={() => setTab("import")} tone="caution">
              Import watch
            </TabButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {tab === "official" ? (
            <>
              <StatPill label="cumulative confirmed" value={numberOrDash(official.confirmed)} tone="default" />
              <StatPill label="cumulative deaths" value={numberOrDash(official.deaths)} tone="crisis" />
            </>
          ) : (
            <>
              <StatPill label="regions tagged" value={String(importTotals.regions)} tone="default" />
              <StatPill label="media signals" value={String(totalSignals)} tone="caution" />
            </>
          )}
        </div>
      </div>

      {tab === "official" ? (
        <p className="border-b border-hub-border px-5 py-2.5 text-2xs leading-relaxed text-hub-subtle">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-hub-verified" />
          Parsed MoH / WHO / ECDC only — DRC &amp; Uganda corridor today.
        </p>
      ) : (
        <p className="border-b border-hub-border bg-hub-caution-soft/30 px-5 py-2.5 text-2xs leading-relaxed text-hub-muted">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-hub-caution" />
          Media headlines only — signal counts are <strong className="font-medium text-hub-text">not</strong> confirmed
          cases. Verify with national authorities before acting.
        </p>
      )}

      {!expanded && tab === "official" && officialRows.length > 0 && (
        <div className="px-5 py-3 font-mono text-2xs text-hub-subtle">
          {official.countries} countr{official.countries === 1 ? "y" : "ies"} · {official.sources || "official sources"}
        </div>
      )}

      {!expanded && tab === "import" && countries.length > 0 && (
        <div className="px-5 py-3 font-mono text-2xs text-hub-subtle">
          {countries
            .slice(0, 8)
            .map((row) => row.location)
            .join(" · ")}
          {countries.length > 8 && ` · +${countries.length - 8} more`}
        </div>
      )}

      {expanded && tab === "official" && (
        <div className="grid gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
          {officialByCountry.map(({ country, primary, alternates }) => (
            <OfficialCard
              key={country}
              metric={primary}
              alternates={alternates}
            />
          ))}
          {officialByCountry.length === 0 && (
            <p className="text-sm text-hub-muted md:col-span-2 xl:col-span-3">
              No official counts parsed yet. Try refreshing once source pages are reachable.
            </p>
          )}
        </div>
      )}

      {expanded && tab === "import" && (
        <div className="space-y-5 px-5 py-5">
          {countries.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {countries.map((row) => (
                <ImportCountryCard key={row.location} row={row} onSelectLocation={onSelectLocation} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-hub-muted">
              No import-watch geography tagged yet. Re-ingest to pick up EU, Americas, and Asia-Pacific mentions.
            </p>
          )}

          {importAlerts.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Recent import signals</p>
              <div className="space-y-2">
                {importAlerts.slice(0, 6).map(({ article, severity }) => {
                  const sev = severityStyles(severity);
                  return (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-2 rounded-lg border border-hub-border bg-hub-surface/40 px-3 py-2.5 transition hover:border-hub-caution/35"
                    >
                      <span className={`mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full ${sev.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm leading-snug text-hub-text">{article.title}</p>
                        <p className="mt-1 font-mono text-2xs text-hub-subtle">
                          {article.locations.slice(0, 3).join(" · ") || "Import watch"}
                          {article.published_at && <> · {formatDate(article.published_at)}</>}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-hub-muted" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "official" && officialErrors.length > 0 && (
        <div className="border-t border-hub-border px-5 py-3 font-mono text-2xs text-hub-subtle">
          {officialErrors.length} official source{officialErrors.length === 1 ? "" : "s"} unreachable on last refresh
          {officialErrors[0]?.fetched_at && <> · {formatDate(officialErrors[0].fetched_at)}</>}.
        </div>
      )}
    </Panel>
  );
}

function TabButton({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "verified" | "caution";
  children: ReactNode;
}) {
  const activeClass =
    tone === "verified"
      ? "border-hub-verified/40 bg-hub-verified-soft text-hub-verified"
      : "border-hub-caution/40 bg-hub-caution-soft text-hub-caution";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 font-mono text-2xs uppercase tracking-wide transition ${
        active ? activeClass : "border-hub-border bg-hub-surface text-hub-muted hover:text-hub-text"
      }`}
    >
      {children}
    </button>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "crisis" | "caution";
}) {
  const valueClass =
    tone === "crisis" ? "text-hub-crisis" : tone === "caution" ? "text-hub-caution" : "text-hub-text";
  const borderClass =
    tone === "crisis"
      ? "border-hub-crisis/25 bg-hub-crisis-soft"
      : tone === "caution"
        ? "border-hub-caution/30 bg-hub-caution-soft"
        : "border-hub-border bg-hub-surface/60";

  return (
    <div className={`rounded-xl border px-4 py-2 ${borderClass}`}>
      <p className={`font-mono text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="font-mono text-2xs uppercase tracking-wide text-hub-subtle">{label}</p>
    </div>
  );
}

function OfficialCard({
  metric,
  alternates = [],
}: {
  metric: OfficialMetric;
  alternates?: OfficialMetric[];
}) {
  return (
    <a
      href={metric.source_url}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border border-hub-border bg-hub-surface/50 p-4 transition hover:border-hub-border-strong"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-hub-text">{metric.country}</p>
          <p className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-hub-subtle">
            {sourceLabel(metric)}
            {metric.as_of && <> · as of {metric.as_of}</>}
          </p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-hub-muted" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-3xl font-semibold text-hub-text">{numberOrDash(metric.confirmed_cases)}</p>
          <p className="text-2xs uppercase tracking-wide text-hub-subtle">confirmed</p>
        </div>
        <div>
          <p className="font-mono text-3xl font-semibold text-hub-crisis">{numberOrDash(metric.deaths)}</p>
          <p className="text-2xs uppercase tracking-wide text-hub-subtle">deaths</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-2xs text-hub-subtle">
        {metric.recoveries != null && <span className="chip border border-hub-border">recoveries {metric.recoveries}</span>}
        {metric.admissions != null && <span className="chip border border-hub-border">admitted {metric.admissions}</span>}
        {metric.imported_cases != null && <span className="chip border border-hub-border">imported {metric.imported_cases}</span>}
        {metric.local_cases != null && <span className="chip border border-hub-border">local {metric.local_cases}</span>}
      </div>

      {alternates.length > 0 && (
        <div className="mt-3 border-t border-hub-border pt-3">
          <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Also reported by</p>
          <div className="flex flex-wrap gap-1">
            {alternates.map((alt) => (
              <span key={alt.source_name} className="chip border border-hub-border text-hub-subtle">
                {sourceLabel(alt)} ({numberOrDash(alt.confirmed_cases)})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-2xs text-hub-verified">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span className="line-clamp-1">{metric.source_name}</span>
      </div>
    </a>
  );
}

function ImportCountryCard({
  row,
  onSelectLocation,
}: {
  row: ImportWatchCountry;
  onSelectLocation?: (location: string) => void;
}) {
  const sev = severityStyles(row.top_severity ?? "medium");
  const inner = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-hub-text">{row.location}</p>
          <p className="font-mono text-2xs text-hub-caution">{row.signal_count} media signal{row.signal_count === 1 ? "" : "s"}</p>
        </div>
        {row.top_url ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-hub-muted" /> : <Plane className="h-3.5 w-3.5 shrink-0 text-hub-caution" />}
      </div>
      {row.top_headline && <p className="line-clamp-2 text-sm leading-snug text-hub-text">{row.top_headline}</p>}
      <div className="mt-2 flex flex-wrap gap-1 font-mono text-2xs">
        <span className="chip border border-hub-caution/40 bg-hub-caution-soft text-hub-caution">
          <Radio className="mr-0.5 inline h-3 w-3" />
          Unverified
        </span>
        {row.top_severity && <span className={`chip border capitalize ${sev.badge}`}>{row.top_severity}</span>}
      </div>
    </>
  );

  if (row.top_url) {
    return (
      <a
        href={row.top_url}
        target="_blank"
        rel="noreferrer"
        className="rounded-xl border border-hub-caution/25 bg-hub-surface/50 p-3 transition hover:border-hub-caution/45"
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectLocation?.(row.location)}
      className="rounded-xl border border-hub-caution/25 bg-hub-surface/50 p-3 text-left transition hover:border-hub-caution/45"
    >
      {inner}
    </button>
  );
}
