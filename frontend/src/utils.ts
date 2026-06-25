export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a YYYY-MM-DD bucket key as a calendar date (no UTC midnight shift). */
export function formatBucketDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Local calendar day key (YYYY-MM-DD) for grouping timeline entries. */
export function localDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function locationZoneLabel(zone: string): string {
  switch (zone) {
    case "import":
      return "Import watch";
    case "hotspot":
      return "Hotspot";
    case "endemic":
      return "Endemic";
    case "watch":
      return "Regional watch";
    default:
      return zone;
  }
}

export function locationZoneStyles(zone: string) {
  switch (zone) {
    case "import":
      return {
        badge: "text-hub-info bg-hub-info-soft border-hub-info/35",
        dot: "bg-hub-info",
      };
    case "hotspot":
      return {
        badge: "text-hub-crisis bg-hub-crisis-soft border-hub-crisis/35",
        dot: "bg-hub-crisis",
      };
    case "endemic":
      return {
        badge: "text-hub-verified bg-hub-verified-soft border-hub-verified/35",
        dot: "bg-hub-verified",
      };
    default:
      return {
        badge: "text-hub-caution bg-hub-caution-soft border-hub-caution/35",
        dot: "bg-hub-caution",
      };
  }
}

export function locationZoneForName(name: string, mapPoints: { location: string; zone?: string }[]): string {
  return mapPoints.find((point) => point.location === name)?.zone ?? "watch";
}

export function severityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return {
        badge: "text-hub-crisis bg-hub-crisis-soft border-hub-crisis/35",
        dot: "bg-hub-crisis shadow-[0_0_10px_rgba(239,90,90,0.75)]",
        label: "Critical",
      };
    case "high":
      return {
        badge: "text-hub-high bg-hub-high-soft border-hub-high/35",
        dot: "bg-hub-high shadow-[0_0_8px_var(--hub-high-soft)]",
        label: "High",
      };
    case "medium":
      return {
        badge: "text-hub-caution bg-hub-caution-soft border-hub-caution/35",
        dot: "bg-hub-caution",
        label: "Medium",
      };
    default:
      return {
        badge: "text-hub-muted bg-hub-surface border-hub-border",
        dot: "bg-hub-subtle",
        label: "Low",
      };
  }
}

export function confidenceStyles(confidence: string) {
  switch (confidence) {
    case "confirmed":
      return "text-hub-verified bg-hub-verified-soft border-hub-verified/35";
    case "likely":
      return "text-hub-info bg-hub-info-soft border-hub-info/35";
    case "unverified":
      return "text-hub-caution bg-hub-caution-soft border-hub-caution/35";
    default:
      return "text-hub-muted bg-hub-surface border-hub-border";
  }
}

export function tierStyles(tier: string) {
  switch (tier) {
    case "primary":
      return {
        badge: "text-hub-verified bg-hub-verified-soft border-hub-verified/35",
        label: "Primary source",
      };
    case "official":
      return {
        badge: "text-hub-info bg-hub-info-soft border-hub-info/35",
        label: "Official source",
      };
    default:
      return {
        badge: "text-hub-caution bg-hub-caution-soft border-hub-caution/35",
        label: "Media — unverified",
      };
  }
}

export const CATEGORIES = [
  "all",
  "outbreak",
  "surveillance",
  "contact_tracing",
  "response",
  "vaccine",
  "treatment",
  "alert",
  "humanitarian",
] as const;

export function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}
