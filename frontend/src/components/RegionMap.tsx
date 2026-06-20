import { MapPoint } from "../api";
import { latLngToXY, severityStyles } from "../utils";

const MAP_W = 720;
const MAP_H = 360;

export function RegionMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-hub-border bg-[#0a1628]">
      <div className="border-b border-hub-border px-4 py-3">
        <h3 className="text-sm font-semibold">Geographic signal map</h3>
        <p className="text-xs text-hub-muted">Detected locations from ingested public reporting</p>
      </div>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full" aria-label="World map with crisis signals">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />
        {/* Simplified continental outlines */}
        <path
          d="M120,120 C150,80 220,70 280,95 C300,130 260,170 210,175 C160,180 110,160 120,120 Z
             M300,95 C360,75 430,90 470,120 C490,150 450,180 400,185 C350,188 310,160 300,95 Z
             M470,120 C540,100 610,115 650,150 C670,190 620,220 560,215 C500,210 460,170 470,120 Z
             M180,200 C230,185 280,195 310,230 C300,280 240,300 190,285 C140,270 130,230 180,200 Z
             M310,230 C380,210 450,225 500,260 C520,300 470,330 410,325 C350,320 300,280 310,230 Z
             M500,260 C560,245 620,255 660,285 C675,315 630,340 580,335 C530,330 490,295 500,260 Z"
          fill="#132033"
          stroke="#334155"
          strokeWidth="1.5"
        />
        {points.map((point) => {
          const { x, y } = latLngToXY(point.lat, point.lng, MAP_W, MAP_H);
          const radius = Math.min(18, 6 + point.count * 2);
          const color =
            point.severity === "critical"
              ? "#ef4444"
              : point.severity === "high"
                ? "#f97316"
                : point.severity === "medium"
                  ? "#f59e0b"
                  : "#64748b";
          return (
            <g key={point.location}>
              <circle cx={x} cy={y} r={radius + 4} fill={color} opacity="0.15" />
              <circle cx={x} cy={y} r={radius} fill={color} opacity="0.85" />
              <text x={x} y={y - radius - 6} textAnchor="middle" fill="#cbd5e1" fontSize="10">
                {point.location} ({point.count})
              </text>
            </g>
          );
        })}
      </svg>
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-hub-bg/40 text-sm text-hub-muted">
          No geotagged locations yet
        </div>
      )}
      <div className="flex flex-wrap gap-3 border-t border-hub-border px-4 py-2 text-xs text-hub-muted">
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
