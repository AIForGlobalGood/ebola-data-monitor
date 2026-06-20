import json
import re

LOCATION_CATALOG: dict[str, dict[str, object]] = {
    "Democratic Republic of the Congo": {
        "lat": -4.03,
        "lng": 21.75,
        "aliases": ["democratic republic of the congo", "drc", "dr congo", "congo-kinshasa"],
    },
    "Uganda": {"lat": 1.37, "lng": 32.29, "aliases": ["uganda"]},
    "Guinea": {"lat": 9.95, "lng": -9.7, "aliases": ["guinea"]},
    "Sierra Leone": {"lat": 8.46, "lng": -11.78, "aliases": ["sierra leone"]},
    "Liberia": {"lat": 6.43, "lng": -9.43, "aliases": ["liberia"]},
    "Nigeria": {"lat": 9.08, "lng": 8.68, "aliases": ["nigeria"]},
    "Sudan": {"lat": 15.5, "lng": 32.56, "aliases": ["sudan"]},
    "South Sudan": {"lat": 6.88, "lng": 31.31, "aliases": ["south sudan"]},
    "Rwanda": {"lat": -1.94, "lng": 29.87, "aliases": ["rwanda"]},
    "Burundi": {"lat": -3.37, "lng": 29.92, "aliases": ["burundi"]},
    "Gabon": {"lat": -0.8, "lng": 11.61, "aliases": ["gabon"]},
    "Ivory Coast": {"lat": 7.54, "lng": -5.55, "aliases": ["ivory coast", "côte d'ivoire", "cote d'ivoire"]},
    "United States": {"lat": 38.91, "lng": -77.04, "aliases": ["united states", "u.s.", "usa", "america"]},
    "United Kingdom": {"lat": 51.51, "lng": -0.13, "aliases": ["united kingdom", "uk", "britain"]},
    "Switzerland": {"lat": 46.95, "lng": 7.45, "aliases": ["switzerland", "geneva"]},
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def extract_locations(title: str, summary: str | None) -> list[str]:
    text = f"{title} {summary or ''}".lower()
    found: list[str] = []
    for name, meta in LOCATION_CATALOG.items():
        aliases = meta["aliases"]  # type: ignore[index]
        if any(re.search(rf"\b{re.escape(alias)}\b", text) for alias in aliases):
            found.append(name)
    return found


def compute_severity(title: str, summary: str | None, category: str, relevance: float) -> str:
    text = f"{title} {summary or ''}".lower()
    has_ebola = "ebola" in text or "filovirus" in text or "marburg" in text
    has_outbreak = any(k in text for k in ("outbreak", "cases", "confirmed", "epidemic", "cluster"))
    has_alert = any(k in text for k in ("emergency", "alert", "death", "fatal"))

    if has_ebola and has_outbreak and (has_alert or relevance >= 0.75):
        return "critical"
    if has_ebola and (has_outbreak or category == "outbreak") and relevance >= 0.5:
        return "high"
    if relevance >= 0.55 or category in {"outbreak", "alert"}:
        return "medium"
    return "low"


def locations_to_json(locations: list[str]) -> str | None:
    if not locations:
        return None
    return json.dumps(locations)


def locations_from_json(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return [str(item) for item in data] if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def map_points_from_locations(location_counts: dict[str, int], severities: dict[str, str]) -> list[dict]:
    points: list[dict] = []
    for name, count in location_counts.items():
        meta = LOCATION_CATALOG.get(name)
        if not meta:
            continue
        points.append(
            {
                "location": name,
                "lat": meta["lat"],
                "lng": meta["lng"],
                "count": count,
                "severity": severities.get(name, "low"),
            }
        )
    return sorted(points, key=lambda p: LOCATION_CATALOG.get(p["location"], {}).get("lat", 0))  # type: ignore[arg-type]


def max_severity(a: str, b: str) -> str:
    return a if SEVERITY_ORDER.get(a, 0) >= SEVERITY_ORDER.get(b, 0) else b
