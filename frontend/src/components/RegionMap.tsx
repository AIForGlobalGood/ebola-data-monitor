import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { MapPoint } from "../api";
import { severityStyles } from "../utils";
import { PanelHeader } from "./ui/Panel";
import "./map.css";

const AFRICA_CENTER: L.LatLngExpression = [0.5, 22];
const DEFAULT_ZOOM = 3;

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#ef5a5a";
    case "high":
      return "#fb923c";
    case "medium":
      return "#f5b942";
    default:
      return "#5c708a";
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
    <div className="panel overflow-hidden">
      <PanelHeader
        eyebrow="Geospatial"
        title="Signal map"
        description="Interactive · severity from primary sources only"
      />
      <div className="crisis-map relative h-[460px] w-full">
        <MapContainer center={AFRICA_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; OSM &copy; CARTO'
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
                  fillOpacity: point.primary_count > 0 ? 0.8 : 0.35,
                  weight: point.primary_count > 0 ? 2 : 1,
                  opacity: 0.95,
                }}
              >
                <Popup className="crisis-popup">
                  <div className="min-w-[220px] space-y-2.5 p-1">
                    <p className="font-display text-sm font-semibold text-slate-900">{point.location}</p>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-2xs capitalize ${sev.badge}`}>
                      {point.severity}
                    </span>
                    <dl className="space-y-1 font-mono text-2xs text-slate-600">
                      <div className="flex justify-between">
                        <dt>Primary / official</dt>
                        <dd className="font-medium text-emerald-700">{point.primary_count}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Media (unverified)</dt>
                        <dd className="font-medium text-amber-700">{point.media_count}</dd>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1">
                        <dt>Total mentions</dt>
                        <dd>{point.count}</dd>
                      </div>
                    </dl>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        {sorted.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-hub-bg/40">
            <p className="panel px-4 py-2 text-sm text-hub-muted">No geotagged locations yet</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-hub-border px-5 py-3 font-mono text-2xs text-hub-subtle">
        <span>Marker size ∝ volume</span>
        {["critical", "high", "medium", "low"].map((level) => {
          const sev = severityStyles(level);
          return (
            <span key={level} className="inline-flex items-center gap-1.5 capitalize">
              <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
              {level}
            </span>
          );
        })}
      </div>
    </div>
  );
}
