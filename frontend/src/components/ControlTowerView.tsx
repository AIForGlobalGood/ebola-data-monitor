import {
  Globe2,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ControlTowerData } from "../api";
import { CATEGORIES, severityStyles, tierStyles } from "../utils";
import { AlertPanel } from "./BriefingPanel";
import { RegionMap } from "./RegionMap";
import { Timeline } from "./Timeline";
import { ArticleCard } from "./ArticleCard";
import { TrustDisclaimer } from "./TrustDisclaimer";
import { Panel, PanelHeader, SectionHeader, StatCard } from "./ui/Panel";

export function ControlTowerView({
  data,
  category,
  onCategoryChange,
}: {
  data: ControlTowerData;
  category: string;
  onCategoryChange: (category: string) => void;
}) {
  const { stats, verified_alerts, media_signals, timeline, map_points, disclaimer, date_filter } = data;

  const filterAlerts = (list: typeof verified_alerts) =>
    category === "all" ? list : list.filter((a) => a.article.category === category);

  const filteredVerified = filterAlerts(verified_alerts);
  const filteredMedia = filterAlerts(media_signals);

  return (
    <div className="space-y-8">
      <TrustDisclaimer text={disclaimer} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Primary signals · 24h"
          value={stats.primary_signals_24h ?? 0}
          hint={`${stats.trust_by_tier?.primary ?? 0} from WHO · CDC · ReliefWeb`}
          icon={ShieldCheck}
          tone="verified"
        />
        <StatCard
          label={date_filter?.active ? "Matched in range" : "Total indexed"}
          value={stats.total_articles}
          hint={
            date_filter?.active
              ? `${date_filter.matched_articles} articles match filter`
              : `${stats.articles_24h} ingested in last 24 hours`
          }
          icon={Radio}
          tone="info"
        />
        <StatCard
          label="Unverified media · 24h"
          value={stats.trust_by_tier?.aggregator ?? 0}
          hint="Confirm independently before action"
          icon={Globe2}
          tone="caution"
        />
        <StatCard
          label="Briefings"
          value={stats.total_briefings}
          hint="Source-tier cited synthesis"
          icon={Sparkles}
          tone="default"
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={category === cat ? "chip-active" : "chip-idle"}
            >
              {cat}
              {cat !== "all" && stats.categories[cat] != null && (
                <span className="ml-1 opacity-50">({stats.categories[cat]})</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RegionMap points={map_points} />
        </div>
        <div className="space-y-4 xl:col-span-2">
          <Panel noPadding>
            <PanelHeader eyebrow="Trust layer" title="Source tiers · 24h" />
            <div className="space-y-3 px-5 pb-5">
              {["primary", "official", "aggregator"].map((tier) => {
                const style = tierStyles(tier);
                const count = stats.trust_by_tier?.[tier] ?? 0;
                const total = stats.articles_24h || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={tier}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className={`chip border ${style.badge}`}>{style.label}</span>
                      <span className="font-mono text-xs text-hub-muted">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hub-surface">
                      <div
                        className={`h-full rounded-full transition-all ${
                          tier === "primary" ? "bg-hub-verified" : tier === "official" ? "bg-hub-info" : "bg-hub-caution"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel noPadding>
            <PanelHeader eyebrow="Classification" title="Severity · 24h" description="Tier-adjusted automated scoring" />
            <div className="space-y-2 px-5 pb-5">
              {["critical", "high", "medium", "low"].map((level) => {
                const sev = severityStyles(level);
                return (
                  <div key={level} className="flex items-center justify-between">
                    <span className={`chip border capitalize ${sev.badge}`}>
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                      {level}
                    </span>
                    <span className="font-mono text-sm text-hub-muted">{stats.severity_24h?.[level] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="Verified"
            title="Primary source signals"
            description="WHO, CDC, ReliefWeb — highest trust tier"
          />
          <AlertPanel
            alerts={filteredVerified}
            emptyMessage="No primary-source alerts match this filter."
            variant="verified"
          />
        </div>
        <div>
          <SectionHeader
            eyebrow="Unverified"
            title="Media mentions"
            description="Aggregated headlines — cross-check with official reports"
          />
          <AlertPanel
            alerts={filteredMedia}
            emptyMessage="No media signals match this filter."
            variant="media"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionHeader eyebrow="Chronology" title="Event timeline" />
          <Panel className="max-h-[560px] overflow-y-auto">
            <Timeline buckets={timeline} />
          </Panel>
        </div>
        <div className="lg:col-span-3">
          <SectionHeader eyebrow="Priority queue" title="Top verified signals" />
          <div className="grid gap-3">
            {filteredVerified.slice(0, 4).map(({ article }) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {filteredVerified.length === 0 && (
              <Panel>
                <p className="text-sm text-hub-muted">No primary-source articles for this filter.</p>
              </Panel>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
