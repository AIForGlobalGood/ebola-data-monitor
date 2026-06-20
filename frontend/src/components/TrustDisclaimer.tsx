import { AlertTriangle, Info } from "lucide-react";

export function TrustDisclaimer({ text, compact = false }: { text?: string; compact?: boolean }) {
  const message =
    text ??
    "Automated classification only — not verified by epidemiologists. Primary sources (WHO, CDC, ReliefWeb) are separated from unverified media aggregators.";

  if (compact) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        {message}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/8 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-100">Unverified — automated classification</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{message}</p>
        </div>
      </div>
    </div>
  );
}
