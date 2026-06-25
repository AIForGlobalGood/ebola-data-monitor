import { GeographyStats } from "../api";
import { Panel, PanelHeader } from "./ui/Panel";

export function GeographyPanel({
  geography,
  onSelectLocation,
}: {
  geography: GeographyStats;
  onSelectLocation?: (location: string) => void;
}) {
  const corridorEntries = Object.entries(geography.by_location)
    .filter(([name]) => !(name in geography.import_by_location))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <Panel noPadding>
      <PanelHeader
        eyebrow="Map"
        title="Corridor geography"
        description={`${geography.corridor_regions} DRC/Uganda & spillover zones · import watch in situation panel`}
      />
      <div className="px-5 pb-5">
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
    </Panel>
  );
}
