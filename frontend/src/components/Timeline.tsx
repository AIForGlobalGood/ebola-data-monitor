import { TimelineBucket } from "../api";
import { formatDate, severityStyles } from "../utils";

export function Timeline({ buckets }: { buckets: TimelineBucket[] }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-hub-muted">No timeline data yet.</p>;
  }

  return (
    <div className="space-y-4">
      {buckets.map((bucket) => (
        <div key={bucket.date} className="relative border-l-2 border-hub-teal/30 pl-4">
          <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-hub-teal" />
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              {new Date(bucket.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </h4>
            <span className="text-xs text-hub-muted">{bucket.count} signal{bucket.count === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-2">
            {bucket.articles.map((article) => {
              const sev = severityStyles(article.severity);
              return (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-hub-border bg-hub-bg/40 p-2.5 transition hover:border-hub-teal/40"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${sev.badge}`}>{sev.label}</span>
                    <span className="text-[10px] text-hub-muted">{formatDate(article.published_at)}</span>
                  </div>
                  <p className="text-sm text-hub-text">{article.title}</p>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
