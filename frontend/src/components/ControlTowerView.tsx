import { Activity, Globe2, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { ControlTowerData } from "../api";
import { CATEGORIES, severityStyles, tierStyles } from "../utils";
import { AlertPanel } from "./BriefingPanel";
import { RegionMap } from "./RegionMap";
import { Timeline } from "./Timeline";
import { ArticleCard } from "./ArticleCard";
import { TrustDisclaimer } from "./TrustDisclaimer";

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

export function ControlTowerView({
  data,
  category,
  onCategoryChange,
}: {
  data: ControlTowerData;
  category: string;
  onCategoryChange: (category: string) => void;
}) {
  const { stats, verified_alerts, media_signals, timeline, map_points, disclaimer } = data;

  const filterAlerts = (list: typeof verified_alerts) =>
    category === "all" ? list : list.filter((a) => a.article.category === category);

  const filteredVerified = filterAlerts(verified_alerts);
  const filteredMedia = filterAlerts(media_signals);

  return (
    <div className="space-y-6">
      <TrustDisclaimer text={disclaimer} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Primary source signals (24h)"
          value={stats.primary_signals_24h ?? 0}
          hint={`${stats.trust_by_tier?.primary ?? 0} from WHO/CDC/ReliefWeb`}
          icon={ShieldCheck}
          accent="text-emerald-400"
        />
        <StatCard label="Articles indexed" value={stats.total_articles} hint={`${stats.articles_24h} in 24h`} icon={Radio} accent="text-red-400" />
        <StatCard
          label="Unverified media (24h)"
          value={stats.trust_by_tier?.aggregator ?? 0}
          hint="Google News aggregators — confirm independently"
          icon={Globe2}
          accent="text-amber-400"
        />
        <StatCard label="Briefings" value={stats.total_briefings} hint="Source-tier tagged citations" icon={Sparkles} accent="text-amber-400" />
      </section>

      <section className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
              category === cat
                ? "border-hub-teal bg-hub-teal/15 text-hub-teal"
                : "border-hub-border text-hub-muted hover:text-white"
            }`}
          >
            {cat}
            {cat !== "all" && stats.categories[cat] != null && (
              <span className="ml-1 opacity-60">({stats.categories[cat]})</span>
            )}
          </button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RegionMap points={map_points} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-4">
            <h3 className="mb-3 text-sm font-semibold">Source trust (24h)</h3>
            <div className="space-y-2">
              {["primary", "official", "aggregator"].map((tier) => {
                const style = tierStyles(tier);
                return (
                  <div key={tier} className="flex items-center justify-between text-sm">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${style.badge}`}>{style.label}</span>
                    <span className="font-mono">{stats.trust_by_tier?.[tier] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-4">
            <h3 className="mb-3 text-sm font-semibold">Severity (24h, tier-adjusted)</h3>
            <div className="space-y-2">
              {["critical", "high", "medium", "low"].map((level) => {
                const sev = severityStyles(level);
                return (
                  <div key={level} className="flex items-center justify-between text-sm">
                    <span className={`inline-flex items-center gap-2 capitalize ${sev.badge} rounded-full border px-2 py-0.5 text-xs`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                      {level}
                    </span>
                    <span className="font-mono">{stats.severity_24h?.[level] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold text-emerald-300">Verified signals</h2>
          <p className="mb-3 text-xs text-hub-muted">WHO, CDC, ReliefWeb — highest trust tier</p>
          <AlertPanel
            alerts={filteredVerified}
            emptyMessage="No primary-source alerts right now. Media signals may still appear below."
          />
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-amber-300">Media mentions (unverified)</h2>
          <p className="mb-3 text-xs text-hub-muted">Aggregated headlines — confirm against official reports</p>
          <AlertPanel alerts={filteredMedia} emptyMessage="No unverified media signals match the current filter." />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Event timeline</h2>
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-hub-border bg-hub-panel/60 p-4">
            <Timeline buckets={timeline} />
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Top primary-source signals</h2>
          <div className="grid gap-3">
            {filteredVerified.slice(0, 4).map(({ article }) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {filteredVerified.length === 0 && (
              <p className="text-sm text-hub-muted">No primary-source articles match this filter.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
