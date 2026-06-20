import { Info } from "lucide-react";
import { useState } from "react";

const SUMMARY =
  "OSINT situational awareness — not epidemiological confirmation. Verify case counts via official situation reports.";

const COMPACT_SUMMARY =
  "EVD OSINT only — verify against WHO / ReliefWeb before operational use.";

export function TrustDisclaimer({ text, compact = false }: { text?: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const summary = compact ? COMPACT_SUMMARY : SUMMARY;
  const detail = text?.trim();
  const hasDetail = Boolean(detail && detail.length > summary.length + 20);

  return (
    <div className="rounded-lg border border-hub-border/50 bg-hub-surface/25 px-3 py-2 text-xs leading-relaxed text-hub-subtle">
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-hub-caution/60" aria-hidden />
        <span className="text-hub-muted">
          {summary}
          {hasDetail && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-hub-info/80 hover:text-hub-info hover:underline"
              >
                {expanded ? "Hide" : "Details"}
              </button>
            </>
          )}
        </span>
      </p>
      {expanded && hasDetail && detail && (
        <p className="mt-2 border-t border-hub-border/40 pt-2 pl-5 text-hub-subtle">{detail}</p>
      )}
    </div>
  );
}
