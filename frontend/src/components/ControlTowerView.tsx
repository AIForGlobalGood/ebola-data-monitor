import { Activity, Globe2, Radio, Sparkles } from "lucide-react";
import { ControlTowerData } from "../api";
import { CATEGORIES, severityStyles } from "../utils";
import { AlertPanel } from "./BriefingPanel";
import { RegionMap } from "./RegionMap";
import { Timeline } from "./Timeline";
import { ArticleCard } from "./ArticleCard";

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
  const { stats, alerts, timeline, map_points } = data;
  const filteredAlerts =
    category === "all" ? alerts : alerts.filter((a) => a.article.category === category);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active sources" value={stats.active_sources} hint={`${stats.total_sources} configured`} icon={Globe2} />
        <StatCard label="Articles indexed" value={stats.total_articles} hint={`${stats.articles_24h} in 24h`} icon={Radio} accent="text-red-400" />
        <StatCard
          label="Critical + high (24h)"
          value={(stats.severity_24h?.critical ?? 0) + (stats.severity_24h?.high ?? 0)}
          hint={`${stats.severity_24h?.critical ?? 0} critical`}
          icon={Activity}
          accent="text-orange-400"
        />
        <StatCard label="Briefings" value={stats.total_briefings} hint="Source-cited synthesis" icon={Sparkles} accent="text-amber-400" />
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
        <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">Severity breakdown (24h)</h3>
          <div className="space-y-2">
            {["critical", "high", "medium", "low"].map((level) => {
              const sev = severityStyles(level);
              const count = stats.severity_24h?.[level] ?? 0;
              return (
                <div key={level} className="flex items-center justify-between text-sm">
                  <span className={`inline-flex items-center gap-2 capitalize ${sev.badge} rounded-full border px-2 py-0.5 text-xs`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                    {level}
                  </span>
                  <span className="font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Active alerts</h2>
          <AlertPanel alerts={filteredAlerts} />
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Event timeline</h2>
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-hub-border bg-hub-panel/60 p-4">
            <Timeline buckets={timeline} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Top signals</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredAlerts.slice(0, 4).map(({ article }) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
