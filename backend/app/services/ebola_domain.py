"""Ebola virus disease (EVD) domain model — strains, geography, relevance, and response taxonomy."""

import json
import re

# --- Geographic focus: endemic belt, active outbreak zones, spillover watch ---

LOCATION_CATALOG: dict[str, dict[str, object]] = {
    # Active / historical EVD countries (Africa)
    "Democratic Republic of the Congo": {
        "lat": -4.03,
        "lng": 21.75,
        "aliases": ["democratic republic of the congo", "drc", "dr congo", "congo-kinshasa", "democratic republic of congo"],
        "zone": "endemic",
    },
    "Ituri Province": {
        "lat": 1.56,
        "lng": 30.25,
        "aliases": ["ituri", "ituri province", "bunia", "mongbwalu", "rwanpara"],
        "zone": "hotspot",
        "parent": "Democratic Republic of the Congo",
    },
    "North Kivu": {
        "lat": -1.48,
        "lng": 29.18,
        "aliases": ["north kivu", "beni", "butembo", "rutshuru"],
        "zone": "hotspot",
        "parent": "Democratic Republic of the Congo",
    },
    "Equateur Province": {
        "lat": 0.05,
        "lng": 18.26,
        "aliases": ["equateur", "equateur province", "mbandaka", "bikoro", "wangata"],
        "zone": "hotspot",
        "parent": "Democratic Republic of the Congo",
    },
    "Uganda": {
        "lat": 1.37,
        "lng": 32.29,
        "aliases": ["uganda"],
        "zone": "endemic",
    },
    "Guinea": {
        "lat": 9.95,
        "lng": -9.7,
        "aliases": ["guinea", "guinea-conakry"],
        "zone": "endemic",
    },
    "Sierra Leone": {"lat": 8.46, "lng": -11.78, "aliases": ["sierra leone"], "zone": "endemic"},
    "Liberia": {"lat": 6.43, "lng": -9.43, "aliases": ["liberia"], "zone": "endemic"},
    "Nigeria": {"lat": 9.08, "lng": 8.68, "aliases": ["nigeria"], "zone": "watch"},
    "Sudan": {"lat": 15.5, "lng": 32.56, "aliases": ["sudan"], "zone": "watch"},
    "South Sudan": {"lat": 6.88, "lng": 31.31, "aliases": ["south sudan"], "zone": "watch"},
    "Rwanda": {"lat": -1.94, "lng": 29.87, "aliases": ["rwanda"], "zone": "watch"},
    "Burundi": {"lat": -3.37, "lng": 29.92, "aliases": ["burundi"], "zone": "watch"},
    "Central African Republic": {
        "lat": 6.61,
        "lng": 20.94,
        "aliases": ["central african republic", "car"],
        "zone": "watch",
    },
    "Republic of the Congo": {
        "lat": -0.23,
        "lng": 15.83,
        "aliases": ["republic of the congo", "congo-brazzaville", "congo brazzaville"],
        "zone": "watch",
    },
    "Gabon": {"lat": -0.8, "lng": 11.61, "aliases": ["gabon"], "zone": "watch"},
    "Ivory Coast": {
        "lat": 7.54,
        "lng": -5.55,
        "aliases": ["ivory coast", "côte d'ivoire", "cote d'ivoire"],
        "zone": "watch",
    },
    "Kenya": {"lat": -1.29, "lng": 36.82, "aliases": ["kenya"], "zone": "watch"},
    "Tanzania": {"lat": -6.37, "lng": 34.89, "aliases": ["tanzania"], "zone": "watch"},
    # Import / HQ monitoring (lower map priority)
    "United States": {
        "lat": 38.91,
        "lng": -77.04,
        "aliases": ["united states", "u.s.", "usa", "america"],
        "zone": "import",
    },
    "Switzerland": {
        "lat": 46.95,
        "lng": 7.45,
        "aliases": ["switzerland", "geneva"],
        "zone": "import",
    },
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}

# Minimum relevance to appear in tower / feed (filters generic health noise)
MIN_EVD_RELEVANCE = 0.25

EVD_CORE_PATTERN = re.compile(
    r"\b("
    r"ebola|evd|ebolavirus|ebola.?virus|"
    r"zaire.?ebolavirus|sudan.?ebolavirus|bundibugyo|"
    r"filovirus|marburg|hemorrhagic.?fever|haemorrhagic.?fever"
    r")\b",
    re.IGNORECASE,
)

EVD_STRAIN_PATTERN = re.compile(
    r"\b(bundibugyo|zaire|sudan|reston|tai.?forest|ERVEBO|Ervebo|rVSV.?ZEBOV)\b",
    re.IGNORECASE,
)

EVD_RESPONSE_PATTERN = re.compile(
    r"\b("
    r"ring.?vaccin|contact.?trac|safe.?burial|"
    r"case.?fatality|health.?zone|treatment.?cent|"
    r"isolation.?unit|PHEIC|public.?health.?emergency|"
    r"IPC|infection.?prevention|surveillance.?team|"
    r"epidemiolog|outbreak.?response|deployment.?of.?experts|"
    r"specimen.?transport|lab.?confirm"
    r")\b",
    re.IGNORECASE,
)

EVD_OUTBREAK_PATTERN = re.compile(
    r"\b(outbreak|cluster|confirmed.?case|probable.?case|suspected.?case|epidemic|transmission.?chain)\b",
    re.IGNORECASE,
)

EVD_ALERT_PATTERN = re.compile(
    r"\b(death|fatal|casualt|emergency|alert|spread|cross.?border|exported.?case)\b",
    re.IGNORECASE,
)

# Dedicated feeds — lower bar for indexing (geography/context already constrained)
DEDICATED_SOURCE_HINTS = (
    "ebola",
    "reliefweb — drc",
    "reliefweb - drc",
    "reliefweb — ebola",
    "drc updates",
    "uganda ebola",
    "bundibugyo",
)

EVD_CATEGORIES = (
    "outbreak",
    "surveillance",
    "vaccine",
    "contact_tracing",
    "response",
    "treatment",
    "alert",
    "humanitarian",
)


def extract_locations(title: str, summary: str | None) -> list[str]:
    text = f"{title} {summary or ''}".lower()
    found: list[str] = []
    for name, meta in LOCATION_CATALOG.items():
        aliases = meta["aliases"]  # type: ignore[index]
        if any(re.search(rf"\b{re.escape(alias)}\b", text) for alias in aliases):
            found.append(name)
    return found


def is_dedicated_evd_source(source_name: str, source_url: str = "") -> bool:
    blob = f"{source_name} {source_url}".lower()
    return any(hint in blob for hint in DEDICATED_SOURCE_HINTS)


def score_evd_relevance(
    title: str,
    summary: str | None,
    *,
    source_name: str = "",
    source_url: str = "",
    source_region: str | None = None,
) -> float:
    from app.services.relevance_trace import assess_relevance

    return assess_relevance(
        title,
        summary,
        source_name=source_name,
        source_url=source_url,
        source_region=source_region,
    ).score


def assess_article_relevance(
    title: str,
    summary: str | None,
    *,
    source_name: str = "",
    source_url: str = "",
    source_region: str | None = None,
):
    from app.services.relevance_trace import RelevanceAssessment, assess_relevance

    return assess_relevance(
        title,
        summary,
        source_name=source_name,
        source_url=source_url,
        source_region=source_region,
    )


def is_evd_relevant(
    title: str,
    summary: str | None,
    *,
    source_name: str = "",
    source_url: str = "",
    source_region: str | None = None,
) -> bool:
    from app.services.relevance_trace import should_index

    assessment = assess_article_relevance(
        title,
        summary,
        source_name=source_name,
        source_url=source_url,
        source_region=source_region,
    )
    return should_index(assessment)


def infer_evd_category(title: str, summary: str | None, default: str) -> str:
    text = f"{title} {summary or ''}".lower()
    if any(k in text for k in ("contact tracing", "contact-tracing", "contact trace")):
        return "contact_tracing"
    if any(k in text for k in ("ring vaccin", "ervebo", "rVSV", "vaccine", "vaccination", "immunization", "gavi")):
        return "vaccine"
    if EVD_RESPONSE_PATTERN.search(text) or any(k in text for k in ("response team", "deployment", "humanitarian")):
        if any(k in text for k in ("humanitarian", "relief", "irc", "msf", "concern worldwide")):
            return "humanitarian"
        return "response"
    if any(k in text for k in ("surveillance", "screening", "monitoring", "case investigation")):
        return "surveillance"
    if EVD_OUTBREAK_PATTERN.search(text) or "outbreak" in text:
        return "outbreak"
    if any(k in text for k in ("trial", "treatment", "therapeutic", "drug", "monoclonal")):
        return "treatment"
    if any(k in text for k in ("alert", "emergency", "han", "pheic")):
        return "alert"
    return default


def compute_severity(
    title: str,
    summary: str | None,
    category: str,
    relevance: float,
    source_tier: str = "aggregator",
) -> str:
    text = f"{title} {summary or ''}".lower()
    has_evd = EVD_CORE_PATTERN.search(text) is not None
    has_outbreak = EVD_OUTBREAK_PATTERN.search(text) is not None
    has_alert = EVD_ALERT_PATTERN.search(text) is not None
    has_strain = EVD_STRAIN_PATTERN.search(text) is not None
    in_hotspot = any(
        LOCATION_CATALOG.get(loc, {}).get("zone") == "hotspot"  # type: ignore[union-attr]
        for loc in extract_locations(title, summary)
    )

    raw = "low"
    if has_evd and has_outbreak and (has_alert or has_strain or in_hotspot):
        raw = "critical"
    elif has_evd and (has_outbreak or category in {"outbreak", "alert", "contact_tracing"}) and relevance >= 0.45:
        raw = "high"
    elif has_evd and relevance >= 0.35:
        raw = "medium"
    elif relevance >= 0.55 and category in {"outbreak", "alert", "response"}:
        raw = "medium"

    from app.services.source_trust import cap_severity_for_tier

    return cap_severity_for_tier(raw, source_tier)


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


def africa_map_center() -> tuple[float, float]:
    """Default view: DRC–Uganda–Ituri outbreak corridor."""
    return (-0.5, 28.5)
