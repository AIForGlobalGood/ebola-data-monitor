import { AlertTriangle, Info } from "lucide-react";
import { Panel } from "./ui/Panel";

export function TrustDisclaimer({ text, compact = false }: { text?: string; compact?: boolean }) {
  const message =
    text ??
    "Automated classification only — not verified by epidemiologists. Primary sources are separated from unverified media.";

  if (compact) {
    return (
      <p className="flex items-start gap-2.5 rounded-xl border border-hub-caution/25 bg-hub-caution-soft/50 px-3.5 py-2.5 text-xs leading-relaxed text-hub-caution/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {message}
      </p>
    );
  }

  return (
    <Panel className="border-hub-caution/25 bg-hub-caution-soft/30">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-hub-caution-soft p-2.5 text-hub-caution">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-hub-caution">Unverified — automated classification</p>
          <p className="mt-1.5 text-sm leading-relaxed text-hub-muted">{message}</p>
        </div>
      </div>
    </Panel>
  );
}
