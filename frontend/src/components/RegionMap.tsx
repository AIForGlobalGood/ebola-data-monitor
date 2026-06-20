import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { MapPoint } from "../api";
import { severityStyles } from "../utils";
import "./map.css";

const AFRICA_CENTER: L.LatLngExpression = [0.5, 22];
const DEFAULT_ZOOM = 3;

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f97316";
    case "medium":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

function markerRadius(point: MapPoint): number {
  const weight = point.primary_count * 3 + point.media_count;
  return Math.min(28, Math.max(10, 8 + weight * 1.5));
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView(AFRICA_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 5);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngExpression));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 });
  }, [map, points]);

  return null;
}

export function RegionMap({ points }: { points: MapPoint[] }) {
  const sorted = [...points].sort((a, b) => b.primary_count - a.primary_count);

  return (
    <div className="overflow-hidden rounded-xl border border-hub-border bg-[#0a1628]">
      <div className="border-b border-hub-border px-4 py-3">
        <h3 className="text-sm font-semibold">Geographic signal map</h3>
        <p className="text-xs text-hub-muted">Interactive map — pan and zoom to explore detected locations</p>
        <p className="text-[10px] text-amber-400/80">Marker severity reflects primary/official sources only</p>
      </div>

      <div className="crisis-map relative h-[440px] w-full">
        <MapContainer
          center={AFRICA_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={sorted} />
          {sorted.map((point) => {
            const color = severityColor(point.severity);
            const radius = markerRadius(point);
            const sev = severityStyles(point.severity);
            return (
              <CircleMarker
                key={point.location}
                center={[point.lat, point.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: point.primary_count > 0 ? 0.75 : 0.35,
                  weight: point.primary_count > 0 ? 2 : 1,
                  opacity: 0.9,
                }}
              >
                <Popup className="crisis-popup">
                  <div className="min-w-[200px] space-y-2 text-sm">
                    <p className="font-semibold text-slate-900">{point.location}</p>
                    <p className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${sev.badge}`}>
                      {point.severity} (primary-source view)
                    </p>
                    <ul className="space-y-1 text-xs text-slate-700">
                      <li>
                        <span className="font-medium text-emerald-700">{point.primary_count}</span> primary / official
                        signals
                      </li>
                      <li>
                        <span className="font-medium text-amber-700">{point.media_count}</span> unverified media mentions
                      </li>
                      <li>{point.count} total indexed articles mentioning this location</li>
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {sorted.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-hub-bg/30">
            <p className="rounded-lg border border-hub-border bg-hub-panel/90 px-4 py-2 text-sm text-hub-muted">
              No geotagged locations yet — fetch sources to populate the map
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-hub-border px-4 py-2 text-xs text-hub-muted">
        <span className="text-hub-muted">Marker size ∝ signal volume</span>
        {["critical", "high", "medium", "low"].map((level) => {
          const sev = severityStyles(level);
          return (
            <span key={level} className="inline-flex items-center gap-1.5 capitalize">
              <span className={`h-2.5 w-2.5 rounded-full ${sev.dot}`} />
              {level}
            </span>
          );
        })}
      </div>
    </div>
  );
}
