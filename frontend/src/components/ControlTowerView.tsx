import {
  Globe2,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { ControlTowerData } from "../api";
import type { OfficialMetric } from "../api";
import type { DateFilterParams } from "../dateFilters";
import { CATEGORIES, categoryLabel, severityStyles, tierStyles } from "../utils";
import { SignalFeedsSection } from "./SignalFeedsSection";
import { HeadlineStrip } from "./HeadlineStrip";
import { GeographyPanel } from "./GeographyPanel";
import { SituationOverviewPanel } from "./SituationOverviewPanel";
import { RegionDrilldown } from "./RegionDrilldown";
import { RegionMap } from "./RegionMap";
import { Timeline } from "./Timeline";
import { ArticleCard } from "./ArticleCard";
import { TrustDisclaimer } from "./TrustDisclaimer";
import { SECTION_HEIGHT } from "./layout/constants";
import { Panel, PanelHeader, ScrollSection, SectionHeader, StatCard } from "./ui/Panel";

export function ControlTowerView({
  data,
  officialMetrics,
  category,
  onCategoryChange,
  dateParams,
}: {
  data: ControlTowerData;
  officialMetrics: OfficialMetric[];
  category: string;
  onCategoryChange: (category: string) => void;
  dateParams?: DateFilterParams;
}) {
  const {
    stats,
    headline,
    geography,
    verified_alerts,
    media_signals,
    import_signals,
    import_watch_countries,
    timeline,
    map_points,
    disclaimer,
    date_filter,
  } = data;

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const filterAlerts = (list: typeof verified_alerts) =>
    category === "all" ? list : list.filter((a) => a.article.category === category);

  const filteredVerified = filterAlerts(verified_alerts);
  const filteredMedia = filterAlerts(media_signals);
  const importLocationSet = new Set(Object.keys(geography.import_by_location));

  const mapSidebar = (
    <div className="flex flex-col gap-4" style={{ minHeight: SECTION_HEIGHT.sidebar }}>
      <GeographyPanel geography={geography} onSelectLocation={setSelectedLocation} />
      <Panel noPadding className="flex-1">
        <PanelHeader eyebrow="24h intake" title="Source & severity" description="Automated tier and severity mix" />
        <div className="grid gap-5 px-5 py-3 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="font-mono text-2xs uppercase tracking-wider text-hub-subtle">Source tier</p>
            {["primary", "official", "aggregator"].map((tier) => {
              const style = tierStyles(tier);
              const count = stats.trust_by_tier?.[tier] ?? 0;
              const total = stats.articles_24h || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`chip border ${style.badge}`}>{style.label}</span>
                    <span className="font-mono text-xs text-hub-muted">{count}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-hub-surface">
                    <div
                      className={`h-full rounded-full ${
                        tier === "primary" ? "bg-hub-verified" : tier === "official" ? "bg-hub-info" : "bg-hub-caution"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <p className="font-mono text-2xs uppercase tracking-wider text-hub-subtle">Severity</p>
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
        </div>
      </Panel>
    </div>
  );

  return (
    <div className="space-y-6">
      <TrustDisclaimer text={disclaimer} />

      <HeadlineStrip headline={headline} dateFilterActive={date_filter?.active} />

      <SituationOverviewPanel
        metrics={officialMetrics}
        countries={import_watch_countries}
        totalSignals={headline.import_signals}
        importAlerts={import_signals}
        onSelectLocation={setSelectedLocation}
      />

      <section className="grid gap-4 xl:grid-cols-5 xl:items-start">
        <div className="xl:col-span-3">
          <RegionMap
            points={map_points}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>
        <div className="xl:col-span-2">
          {selectedLocation ? (
            <RegionDrilldown
              location={selectedLocation}
              dateParams={dateParams}
              importLocationSet={importLocationSet}
              onClose={() => setSelectedLocation(null)}
            />
          ) : (
            mapSidebar
          )}
        </div>
      </section>

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
              {categoryLabel(cat)}
              {cat !== "all" && stats.categories[cat] != null && (
                <span className="ml-1 opacity-50">({stats.categories[cat]})</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <ScrollSection
        defaultHeight={SECTION_HEIGHT.timeline}
        header={<SectionHeader eyebrow="Chronology" title="Event timeline" className="mb-0" />}
      >
        <Timeline buckets={timeline} />
      </ScrollSection>

      <SignalFeedsSection verified={filteredVerified} media={filteredMedia} />

      <ScrollSection
        defaultHeight={SECTION_HEIGHT.priority}
        header={<SectionHeader eyebrow="Priority queue" title="Top verified signals" className="mb-0" />}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredVerified.slice(0, 8).map(({ article }) => (
            <ArticleCard key={article.id} article={article} importLocationSet={importLocationSet} />
          ))}
          {filteredVerified.length === 0 && (
            <Panel>
              <p className="text-sm text-hub-muted">No primary-source articles for this filter.</p>
            </Panel>
          )}
        </div>
      </ScrollSection>
    </div>
  );
}
