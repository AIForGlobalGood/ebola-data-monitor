import { Article } from "../api";
import { formatDate, severityStyles } from "../utils";

export function ArticleCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  const sev = severityStyles(article.severity);

  return (
    <article className="rounded-xl border border-hub-border bg-hub-panel/70 p-4 transition hover:border-hub-teal/40">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className={`font-medium leading-snug text-white hover:text-hub-teal ${compact ? "text-sm" : ""}`}
        >
          {article.title}
        </a>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sev.badge}`}>{sev.label}</span>
          <span className="rounded-full border border-hub-border px-2 py-0.5 text-xs text-hub-muted">
            {(article.relevance_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      {!compact && article.summary && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-hub-muted">{article.summary}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-hub-muted">
        <span className="rounded bg-hub-bg px-2 py-1">{article.source_name ?? "Unknown"}</span>
        <span className="rounded bg-hub-bg px-2 py-1 capitalize">{article.category}</span>
        {article.locations?.slice(0, 2).map((loc) => (
          <span key={loc} className="rounded bg-hub-bg px-2 py-1">
            {loc}
          </span>
        ))}
        <span>{formatDate(article.published_at)}</span>
      </div>
    </article>
  );
}
