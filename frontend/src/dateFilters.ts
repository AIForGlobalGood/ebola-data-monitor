export type DateField = "published" | "fetched";
export type DatePreset = "all" | "24h" | "7d" | "30d" | "custom";

export interface DateFilterState {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
  dateField: DateField;
}

export interface DateFilterParams {
  date_from?: string;
  date_to?: string;
  date_field?: DateField;
}

export const DEFAULT_DATE_FILTER: DateFilterState = {
  preset: "all",
  dateFrom: "",
  dateTo: "",
  dateField: "published",
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildDateFilterParams(state: DateFilterState): DateFilterParams {
  const params: DateFilterParams = {};

  if (state.dateField !== "published") {
    params.date_field = state.dateField;
  }

  if (state.preset === "custom") {
    if (state.dateFrom) params.date_from = state.dateFrom;
    if (state.dateTo) params.date_to = state.dateTo;
    return params;
  }

  if (state.preset === "all") {
    return params;
  }

  const now = new Date();
  if (state.preset === "24h") {
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    params.date_from = from.toISOString();
    params.date_to = now.toISOString();
    return params;
  }

  const days = state.preset === "7d" ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  params.date_from = toIsoDate(from);
  params.date_to = toIsoDate(now);
  return params;
}

export function isDateFilterActive(state: DateFilterState): boolean {
  if (state.preset !== "all" && state.preset !== "custom") return true;
  return Boolean(state.dateFrom || state.dateTo);
}

export function dateFilterLabel(state: DateFilterState): string {
  switch (state.preset) {
    case "24h":
      return "Last 24 hours";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "custom":
      if (state.dateFrom && state.dateTo) return `${state.dateFrom} → ${state.dateTo}`;
      if (state.dateFrom) return `From ${state.dateFrom}`;
      if (state.dateTo) return `Until ${state.dateTo}`;
      return "Custom range";
    default:
      return "All time";
  }
}

function appendParams(params: URLSearchParams, filters?: DateFilterParams) {
  if (!filters) return;
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.date_field) params.set("date_field", filters.date_field);
}

export function withDateParams(path: string, filters?: DateFilterParams): string {
  if (!filters) return path;
  const hasAny = filters.date_from || filters.date_to || filters.date_field;
  if (!hasAny) return path;
  const params = new URLSearchParams();
  appendParams(params, filters);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
