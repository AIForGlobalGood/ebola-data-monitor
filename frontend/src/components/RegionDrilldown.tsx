import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, RegionDetail } from "../api";
import type { DateFilterParams } from "../dateFilters";
import { SECTION_HEIGHT } from "./layout/constants";
import { severityStyles, tierStyles } from "../utils";
import { ArticleCard } from "./ArticleCard";
import { Timeline } from "./Timeline";
import { PanelHeader, ScrollPanel } from "./ui/Panel";

export function RegionDrilldown({
  location,
  dateParams,
  onClose,
}: {
  location: string;
  dateParams?: DateFilterParams;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .regionDetail(location, dateParams)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load region");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location, dateParams]);

  const point = detail?.map_point;
  const sev = point ? severityStyles(point.severity) : null;

  return (
    <ScrollPanel
      defaultHeight={SECTION_HEIGHT.sidebar}
      minHeight={SECTION_HEIGHT.sidebarMin}
      header={
        <PanelHeader
          eyebrow="Region drill-down"
          title={location}
          description={
            point
              ? `${point.primary_count} verified · ${point.media_count} media · ${point.count} total`
              : "Loading region signals…"
          }
          action={
            <button type="button" onClick={onClose} className="btn-ghost px-2 py-1.5" aria-label="Close region panel">
              <X className="h-4 w-4" />
            </button>
          }
        />
      }
    >
      <div className="px-4 py-4">
        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-hub-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading signals…
          </div>
        )}

        {error && <p className="py-4 text-sm text-hub-crisis">{error}</p>}

        {detail && !loading && (
          <div className="space-y-5">
            {point && sev && (
              <div className="flex flex-wrap gap-2">
                <span className={`chip border capitalize ${sev.badge}`}>{point.severity} severity</span>
                {point.primary_count > 0 && (
                  <span className={`chip border ${tierStyles("primary").badge}`}>Has primary sources</span>
                )}
                {point.primary_count === 0 && point.media_count > 0 && (
                  <span className={`chip border ${tierStyles("aggregator").badge}`}>Media only — verify</span>
                )}
              </div>
            )}

            <div>
              <h4 className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Timeline</h4>
              <Timeline buckets={detail.timeline} />
            </div>

            <div>
              <h4 className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">
                Top signals ({detail.articles.length})
              </h4>
              <div className="space-y-2">
                {detail.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} compact />
                ))}
                {detail.articles.length === 0 && (
                  <p className="text-sm text-hub-muted">No articles geotagged to this region in the current filter.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollPanel>
  );
}
