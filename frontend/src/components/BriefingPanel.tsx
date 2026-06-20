import { ExternalLink } from "lucide-react";
import { Article, Briefing } from "../api";
import { confidenceStyles, formatDate, severityStyles, tierStyles } from "../utils";
import { TrustDisclaimer } from "./TrustDisclaimer";
import { Panel, PanelHeader } from "./ui/Panel";

function articleLookup(articles: Article[]) {
  return new Map(articles.map((a) => [a.id, a]));
}

export function BriefingPanel({ briefing }: { briefing: Briefing }) {
  const lookup = articleLookup(briefing.source_articles);

  return (
    <Panel noPadding className="overflow-hidden">
      <PanelHeader
        eyebrow={`Synthesis · ${briefing.provider}`}
        title={briefing.title}
        description={`Generated ${formatDate(briefing.created_at)}`}
      />
      <div className="space-y-5 px-5 pb-5">
        <TrustDisclaimer compact />
        <p className="text-sm leading-relaxed text-hub-text/95">{briefing.summary}</p>

        {briefing.findings.length > 0 && (
          <div>
            <p className="eyebrow mb-3">Findings · with sources</p>
            <ul className="space-y-3">
              {briefing.findings.map((finding, idx) => (
                <li key={idx} className="rounded-xl border border-hub-border bg-hub-surface/80 p-4">
                  <span
                    className={`mb-2 inline-block rounded-full border px-2 py-0.5 text-2xs uppercase tracking-wide ${confidenceStyles(finding.confidence)}`}
                  >
                    {finding.confidence}
                  </span>
                  <p className="text-sm leading-relaxed text-hub-muted">{finding.text}</p>
                  {finding.article_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {finding.article_ids.map((id) => {
                        const article = lookup.get(id);
                        if (!article) return null;
                        const tier = tierStyles(article.source_tier ?? "aggregator");
                        return (
                          <a
                            key={id}
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-hub-border bg-hub-card px-2.5 py-1.5 text-xs text-hub-info transition hover:border-hub-info/40"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className={`rounded border px-1 text-2xs ${tier.badge}`}>P</span>
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
            <p className="eyebrow mb-2">Recommendations</p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-hub-muted">
              {briefing.recommendations}
            </pre>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function AlertPanel({
  alerts,
  emptyMessage,
  variant = "verified",
}: {
  alerts: { article: Article; severity: string }[];
  emptyMessage?: string;
  variant?: "verified" | "media";
}) {
  if (alerts.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-hub-muted">{emptyMessage ?? "No alerts."}</p>
      </Panel>
    );
  }

  const borderAccent = variant === "verified" ? "hover:border-hub-verified/30" : "hover:border-hub-caution/30";

  return (
    <div className="space-y-2">
      {alerts.map(({ article, severity }) => {
        const sev = severityStyles(severity);
        const tier = tierStyles(article.source_tier ?? "aggregator");
        return (
          <div
            key={article.id}
            className={`panel flex gap-3 p-4 transition ${borderAccent}`}
          >
            <div className="pt-1">
              <span className={`block h-2 w-2 rounded-full ${sev.dot}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className={`chip border ${tier.badge}`}>{tier.label}</span>
                <span className={`chip border ${sev.badge}`}>{sev.label}</span>
                <span className="chip-idle capitalize">{article.category}</span>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-medium leading-snug text-hub-text hover:text-hub-info"
              >
                {article.title}
              </a>
              {article.summary && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-hub-subtle">{article.summary}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
