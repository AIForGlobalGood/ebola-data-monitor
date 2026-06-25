import { Article } from "../api";
import { formatDate, categoryLabel, severityStyles, tierStyles, locationZoneStyles } from "../utils";

function traceChips(article: Article): string[] {
  const trace = article.relevance_trace;
  if (!trace?.signals?.length) return [];
  return [...trace.signals]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((s) => s.label);
}

export function ArticleCard({
  article,
  compact = false,
  importLocationSet,
}: {
  article: Article;
  compact?: boolean;
  importLocationSet?: Set<string>;
}) {
  const sev = severityStyles(article.severity);
  const tier = tierStyles(article.source_tier ?? "aggregator");
  const chips = traceChips(article);

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
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {chips.map((label) => (
            <span
              key={label}
              className="rounded-md border border-hub-info/25 bg-hub-info-soft px-2 py-0.5 text-2xs text-hub-info"
              title="Why this article was indexed"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 font-mono text-2xs text-hub-subtle">
        <span className="rounded-md bg-hub-surface px-2 py-1">{article.source_name ?? "Unknown"}</span>
        <span className="rounded-md bg-hub-surface px-2 py-1 capitalize">{categoryLabel(article.category)}</span>
        {article.locations?.slice(0, 3).map((loc) => {
          const isImport = importLocationSet?.has(loc);
          const zone = isImport ? locationZoneStyles("import") : null;
          return (
            <span
              key={loc}
              className={`rounded-md px-2 py-1 ${zone ? `border ${zone.badge}` : "bg-hub-surface"}`}
            >
              {loc}
            </span>
          );
        })}
        <span className="ml-auto">{formatDate(article.published_at)}</span>
        <span className="text-hub-info">{(article.relevance_score * 100).toFixed(0)}%</span>
      </div>
    </article>
  );
}
