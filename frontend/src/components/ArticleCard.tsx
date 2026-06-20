import { Article } from "../api";
import { formatDate, severityStyles, tierStyles } from "../utils";

export function ArticleCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  const sev = severityStyles(article.severity);
  const tier = tierStyles(article.source_tier ?? "aggregator");

  return (
    <article className="panel group p-4 transition hover:border-hub-border-strong">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className={`font-medium leading-snug text-hub-text group-hover:text-hub-info ${compact ? "text-sm" : "text-base"}`}
        >
          {article.title}
        </a>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <span className={`chip border ${tier.badge}`}>{tier.label}</span>
          <span className={`chip border ${sev.badge}`}>{sev.label}</span>
        </div>
      </div>
      {!compact && article.summary && (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-hub-muted">{article.summary}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 font-mono text-2xs text-hub-subtle">
        <span className="rounded-md bg-hub-surface px-2 py-1">{article.source_name ?? "Unknown"}</span>
        <span className="rounded-md bg-hub-surface px-2 py-1 capitalize">{article.category}</span>
        {article.locations?.slice(0, 2).map((loc) => (
          <span key={loc} className="rounded-md bg-hub-surface px-2 py-1">
            {loc}
          </span>
        ))}
        <span className="ml-auto">{formatDate(article.published_at)}</span>
        <span className="text-hub-info">{(article.relevance_score * 100).toFixed(0)}%</span>
      </div>
    </article>
  );
}
