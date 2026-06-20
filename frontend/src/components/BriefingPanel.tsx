import { ExternalLink } from "lucide-react";
import { Article, Briefing } from "../api";
import { confidenceStyles, formatDate, severityStyles } from "../utils";

function articleLookup(articles: Article[]) {
  return new Map(articles.map((a) => [a.id, a]));
}

export function BriefingPanel({ briefing }: { briefing: Briefing }) {
  const lookup = articleLookup(briefing.source_articles);

  return (
    <div className="space-y-5 rounded-xl border border-hub-border bg-hub-panel/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{briefing.title}</h3>
        <span className="rounded-full border border-hub-border px-2 py-1 text-xs uppercase tracking-wide text-hub-muted">
          {briefing.provider}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-hub-text">{briefing.summary}</p>

      {briefing.findings.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-hub-teal">Key findings (with sources)</h4>
          <ul className="space-y-3">
            {briefing.findings.map((finding, idx) => (
              <li key={idx} className="rounded-lg border border-hub-border bg-hub-bg/50 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${confidenceStyles(finding.confidence)}`}>
                    {finding.confidence}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-hub-muted">{finding.text}</p>
                {finding.article_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {finding.article_ids.map((id) => {
                      const article = lookup.get(id);
                      if (!article) return null;
                      return (
                        <a
                          key={id}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 rounded-md border border-hub-border bg-hub-panel px-2 py-1 text-xs text-hub-teal hover:border-hub-teal/50"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{article.title}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {briefing.recommendations && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-hub-amber">Recommendations</h4>
          <pre className="whitespace-pre-wrap font-sans text-sm text-hub-muted">{briefing.recommendations}</pre>
        </div>
      )}

      <p className="text-xs text-hub-muted">Generated {formatDate(briefing.created_at)}</p>
    </div>
  );
}

export function AlertPanel({ alerts }: { alerts: { article: Article; severity: string }[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-hub-border bg-hub-panel/60 p-5 text-sm text-hub-muted">
        No active alerts. Fetch sources or lower the severity threshold by ingesting more feeds.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(({ article, severity }) => {
        const sev = severityStyles(severity);
        return (
          <div
            key={article.id}
            className="flex gap-3 rounded-xl border border-hub-border bg-hub-panel/80 p-3 transition hover:border-red-500/30"
          >
            <div className="pt-1.5">
              <span className={`block h-2.5 w-2.5 rounded-full ${sev.dot}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sev.badge}`}>
                  {sev.label}
                </span>
                <span className="text-xs capitalize text-hub-muted">{article.category}</span>
              </div>
              <a href={article.url} target="_blank" rel="noreferrer" className="block text-sm font-medium text-white hover:text-hub-teal">
                {article.title}
              </a>
              {article.summary && <p className="mt-1 line-clamp-2 text-xs text-hub-muted">{article.summary}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
