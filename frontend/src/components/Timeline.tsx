import { useMemo } from "react";
import { Article, TimelineBucket } from "../api";
import { formatBucketDate, formatDate, localDateKey, severityStyles, tierStyles } from "../utils";

function regroupTimelineByLocalDate(buckets: TimelineBucket[]): TimelineBucket[] {
  const byDay = new Map<string, Article[]>();
  const seen = new Set<number>();

  for (const bucket of buckets) {
    for (const article of bucket.articles) {
      if (!article.published_at || seen.has(article.id)) continue;
      seen.add(article.id);
      const day = localDateKey(article.published_at);
      const list = byDay.get(day) ?? [];
      list.push(article);
      byDay.set(day, list);
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, articles]) => ({
      date,
      count: articles.length,
      articles: articles.sort(
        (a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime(),
      ),
    }));
}

export function Timeline({ buckets }: { buckets: TimelineBucket[] }) {
  const localBuckets = useMemo(() => regroupTimelineByLocalDate(buckets), [buckets]);

  if (localBuckets.length === 0) {
    return <p className="text-sm text-hub-muted">No timeline data yet.</p>;
  }

  return (
    <div className="relative space-y-6 pl-1">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-hub-info/40 via-hub-border to-transparent" />
      {localBuckets.map((bucket) => (
        <div key={bucket.date} className="relative pl-6">
          <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-hub-info/50 bg-hub-bg ring-4 ring-hub-info/10" />
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h4 className="font-mono text-xs font-medium uppercase tracking-wide text-hub-text">
              {formatBucketDate(bucket.date)}
            </h4>
            <span className="font-mono text-2xs text-hub-subtle">
              {bucket.count} signal{bucket.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-2">
            {bucket.articles.map((article) => {
              const sev = severityStyles(article.severity);
              const tier = tierStyles(article.source_tier ?? "aggregator");
              return (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-hub-border bg-hub-surface/60 p-3 transition hover:border-hub-info/30 hover:bg-hub-card"
                >
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <span className={`chip border ${tier.badge}`}>{tier.label.split(" ")[0]}</span>
                    <span className={`chip border ${sev.badge}`}>{sev.label}</span>
                    <span className="font-mono text-2xs text-hub-subtle">{formatDate(article.published_at)}</span>
                  </div>
                  <p className="text-sm leading-snug text-hub-text">{article.title}</p>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
