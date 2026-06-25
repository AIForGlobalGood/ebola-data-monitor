import { MapPin } from "lucide-react";
import { GeographyStats } from "../api";
import { locationZoneStyles } from "../utils";
import { Panel, PanelHeader } from "./ui/Panel";

export function GeographyPanel({
  geography,
  onSelectLocation,
}: {
  geography: GeographyStats;
  onSelectLocation?: (location: string) => void;
}) {
  const importEntries = Object.entries(geography.import_by_location).sort(([, a], [, b]) => b - a).slice(0, 8);
  const corridorEntries = Object.entries(geography.by_location)
    .filter(([name]) => !(name in geography.import_by_location))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <Panel noPadding>
      <PanelHeader
        eyebrow="Geography"
        title="Regional coverage"
        description={`${geography.corridor_regions} corridor · ${geography.import_watch_regions} import watch · ${geography.import_signals} import-tagged signals`}
      />
      <div className="space-y-4 px-5 pb-5">
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Import watch</p>
          {importEntries.length === 0 ? (
            <p className="text-sm text-hub-muted">No import-watch locations tagged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {importEntries.map(([name, count]) => {
                const zone = locationZoneStyles("import");
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSelectLocation?.(name)}
                    className={`chip border ${zone.badge} ${onSelectLocation ? "hover:brightness-110" : ""}`}
                  >
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {name}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-hub-subtle">Corridor &amp; regional watch</p>
          {corridorEntries.length === 0 ? (
            <p className="text-sm text-hub-muted">No corridor locations tagged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {corridorEntries.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectLocation?.(name)}
                  className={`chip border border-hub-border bg-hub-surface text-hub-muted ${onSelectLocation ? "hover:text-hub-text" : ""}`}
                >
                  {name}
                  <span className="ml-1 opacity-70">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-2xs leading-relaxed text-hub-subtle">
          Import-watch tags reflect geography mentioned in indexed signals — not verified import confirmations.
          Official case counts remain in the situation panel above.
        </p>
      </div>
    </Panel>
  );
}
