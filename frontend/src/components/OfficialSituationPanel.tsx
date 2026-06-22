import { ChevronDown, ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { OfficialMetric } from "../api";
import { formatDate } from "../utils";
import { Panel } from "./ui/Panel";

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

export function OfficialSituationPanel({ metrics }: { metrics: OfficialMetric[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = metrics.filter((metric) => metric.status === "ok");
  const errors = metrics.filter((metric) => metric.status !== "ok");
  const cumulative = useMemo(() => cumulativeMetrics(rows), [rows]);

  return (
    <Panel noPadding>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-hub-border px-5 py-4 text-left transition hover:bg-hub-surface/40"
        aria-expanded={expanded}
      >
        <div className="flex min-w-[240px] flex-1 items-start gap-3">
          <div className="mt-1 rounded-lg border border-hub-border bg-hub-surface p-1.5 text-hub-muted">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div>
            <p className="eyebrow mb-1 text-hub-subtle">Official situation</p>
            <h2 className="text-base font-semibold text-hub-text">Confirmed case counts</h2>
            <p className="mt-1 text-sm text-hub-muted">
              Parsed from official MoH / WHO / ECDC sources, separate from media signals
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-hub-border bg-hub-surface/60 px-4 py-2">
            <p className="font-mono text-2xl font-semibold text-hub-text">{numberOrDash(cumulative.confirmed)}</p>
            <p className="font-mono text-2xs uppercase tracking-wide text-hub-subtle">cumulative confirmed</p>
          </div>
          <div className="rounded-xl border border-hub-crisis/25 bg-hub-crisis-soft px-4 py-2">
            <p className="font-mono text-2xl font-semibold text-hub-crisis">{numberOrDash(cumulative.deaths)}</p>
            <p className="font-mono text-2xs uppercase tracking-wide text-hub-subtle">cumulative deaths</p>
          </div>
        </div>
      </button>

      {!expanded && rows.length > 0 && (
        <div className="px-5 py-3 font-mono text-2xs text-hub-subtle">
          Deduplicated across {cumulative.countries} affected countr{cumulative.countries === 1 ? "y" : "ies"} using
          the strongest available official source per country ({cumulative.sources || "official sources"}).
        </div>
      )}

      {expanded && (
        <div className="grid gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((metric) => (
            <a
              key={`${metric.source_name}-${metric.country}`}
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
                <p className="font-mono text-3xl font-semibold text-hub-text">
                  {numberOrDash(metric.confirmed_cases)}
                </p>
                <p className="text-2xs uppercase tracking-wide text-hub-subtle">confirmed</p>
              </div>
              <div>
                <p className="font-mono text-3xl font-semibold text-hub-crisis">
                  {numberOrDash(metric.deaths)}
                </p>
                <p className="text-2xs uppercase tracking-wide text-hub-subtle">deaths</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-2xs text-hub-subtle">
              {metric.recoveries != null && <span className="chip border border-hub-border">recoveries {metric.recoveries}</span>}
              {metric.admissions != null && <span className="chip border border-hub-border">admitted {metric.admissions}</span>}
              {metric.imported_cases != null && <span className="chip border border-hub-border">imported {metric.imported_cases}</span>}
              {metric.local_cases != null && <span className="chip border border-hub-border">local {metric.local_cases}</span>}
              {metric.probable_deaths != null && <span className="chip border border-hub-border">probable deaths {metric.probable_deaths}</span>}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-2xs text-hub-verified">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{metric.source_name}</span>
            </div>
            </a>
          ))}
        </div>
      )}
      {rows.length === 0 && (
        <div className="px-5 py-5 text-sm text-hub-muted">
          No official counts parsed yet. Try refreshing once the official source pages are reachable.
        </div>
      )}
      {errors.length > 0 && (
        <div className="border-t border-hub-border px-5 py-3 font-mono text-2xs text-hub-subtle">
          {errors.length} official source{errors.length === 1 ? "" : "s"} could not be reached during the last refresh.
          Last attempted {formatDate(errors[0]?.fetched_at ?? null)}.
        </div>
      )}
    </Panel>
  );
}
