import { Clock, Globe2, ShieldCheck, Zap } from "lucide-react";
import { TowerHeadline } from "../api";
import { formatDate } from "../utils";

export function HeadlineStrip({ headline, dateFilterActive }: { headline: TowerHeadline; dateFilterActive?: boolean }) {
  const metrics = [
    {
      label: "Official EVD alerts",
      value: headline.verified_alerts,
      sub: "WHO · CDC · ReliefWeb situation signals",
      icon: ShieldCheck,
      tone: "text-hub-verified",
    },
    {
      label: "Affected health zones",
      value: headline.affected_regions,
      sub: "DRC provinces · Uganda · spillover watch",
      icon: Globe2,
      tone: "text-hub-info",
    },
    {
      label: "Critical / high EVD",
      value: headline.critical_high,
      sub: "Automated outbreak severity",
      icon: Zap,
      tone: "text-hub-crisis",
    },
    {
      label: dateFilterActive ? "EVD signals (filtered)" : "EVD articles indexed",
      value: headline.matched_signals,
      sub: dateFilterActive ? "Matching current date range" : "Ebola-relevant corpus only",
      icon: Clock,
      tone: "text-hub-caution",
    },
  ];

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-hub-border bg-gradient-to-r from-hub-surface/80 via-hub-card/40 to-hub-surface/80 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1 text-hub-crisis/90">EVD situation snapshot</p>
            <p className="font-mono text-2xs text-hub-subtle">
              As of {formatDate(headline.as_of)}
              {headline.last_official_update && (
                <> · Last official EVD report {formatDate(headline.last_official_update)}</>
              )}
              {headline.last_ingest_at && <> · Last ingest {formatDate(headline.last_ingest_at)}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="font-mono text-2xs uppercase tracking-wider text-hub-verified">
              EVD monitoring · DRC/Uganda corridor
            </span>
          </div>
        </div>
      </div>
      <div className="grid divide-y divide-hub-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {metrics.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className="px-5 py-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-hub-muted">{label}</p>
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className="font-mono text-4xl font-semibold tracking-tight text-hub-text">{value}</p>
            <p className="mt-1.5 text-2xs leading-relaxed text-hub-subtle">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
