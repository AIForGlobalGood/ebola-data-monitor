import { CalendarRange, X } from "lucide-react";
import {
  DateFilterState,
  DatePreset,
  dateFilterLabel,
  isDateFilterActive,
} from "../dateFilters";

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "custom", label: "Custom" },
];

export function DateFilterBar({
  value,
  onChange,
  matchedCount,
  compact = false,
}: {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
  matchedCount?: number;
  compact?: boolean;
}) {
  const active = isDateFilterActive(value);

  function setPreset(preset: DatePreset) {
    onChange({ ...value, preset });
  }

  function clear() {
    onChange({ preset: "all", dateFrom: "", dateTo: "", dateField: "published" });
  }

  return (
    <div className={`panel flex flex-wrap items-center gap-3 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
      <div className="flex items-center gap-2 text-hub-muted">
        <CalendarRange className="h-4 w-4 shrink-0 text-hub-info" />
        <span className="font-mono text-2xs uppercase tracking-wider">Date filter</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={value.preset === id ? "chip-active" : "chip-idle"}
          >
            {label}
          </button>
        ))}
      </div>

      {value.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={value.dateFrom}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            className="input-field w-auto py-2 font-mono text-xs"
            aria-label="From date"
          />
          <span className="text-hub-subtle">→</span>
          <input
            type="date"
            value={value.dateTo}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            className="input-field w-auto py-2 font-mono text-xs"
            aria-label="To date"
          />
        </div>
      )}

      <div className="flex items-center gap-2 border-l border-hub-border pl-3">
        <span className="font-mono text-2xs text-hub-subtle">By</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, dateField: "published" })}
          className={value.dateField === "published" ? "chip-active text-2xs" : "chip-idle text-2xs"}
        >
          Published
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, dateField: "fetched" })}
          className={value.dateField === "fetched" ? "chip-active text-2xs" : "chip-idle text-2xs"}
        >
          Ingested
        </button>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-hub-muted">
          <span>
            {dateFilterLabel(value)}
            {matchedCount !== undefined && (
              <span className="ml-1 font-mono text-hub-info">· {matchedCount} matched</span>
            )}
          </span>
          <button type="button" onClick={clear} className="btn-ghost px-2 py-1 text-2xs">
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
