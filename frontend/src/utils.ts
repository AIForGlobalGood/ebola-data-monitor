export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function severityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return {
        badge: "text-red-300 bg-red-500/15 border-red-500/40",
        dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]",
        label: "Critical",
      };
    case "high":
      return {
        badge: "text-orange-300 bg-orange-500/15 border-orange-500/40",
        dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]",
        label: "High",
      };
    case "medium":
      return {
        badge: "text-amber-300 bg-amber-500/15 border-amber-500/40",
        dot: "bg-amber-400",
        label: "Medium",
      };
    default:
      return {
        badge: "text-slate-300 bg-slate-500/15 border-slate-500/40",
        dot: "bg-slate-400",
        label: "Low",
      };
  }
}

export function confidenceStyles(confidence: string) {
  switch (confidence) {
    case "confirmed":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
    case "likely":
      return "text-sky-300 bg-sky-500/10 border-sky-500/30";
    case "unverified":
      return "text-amber-300 bg-amber-500/10 border-amber-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  }
}

export function tierStyles(tier: string) {
  switch (tier) {
    case "primary":
      return {
        badge: "text-emerald-300 bg-emerald-500/12 border-emerald-500/35",
        label: "Primary source",
      };
    case "official":
      return {
        badge: "text-sky-300 bg-sky-500/12 border-sky-500/35",
        label: "Official source",
      };
    default:
      return {
        badge: "text-amber-300 bg-amber-500/12 border-amber-500/35",
        label: "Media — unverified",
      };
  }
}

export const CATEGORIES = ["all", "outbreak", "vaccine", "treatment", "alert", "humanitarian", "health", "surveillance"] as const;
