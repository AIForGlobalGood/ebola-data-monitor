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
    # Import / spillover watch — EU, Americas, Asia-Pacific hubs
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
    "United Kingdom": {
        "lat": 51.51,
        "lng": -0.13,
        "aliases": ["united kingdom", "u.k.", "uk", "britain", "great britain", "england", "scotland", "wales", "london"],
        "zone": "import",
    },
    "France": {"lat": 48.86, "lng": 2.35, "aliases": ["france", "paris"], "zone": "import"},
    "Germany": {"lat": 52.52, "lng": 13.41, "aliases": ["germany", "berlin"], "zone": "import"},
    "Italy": {"lat": 41.90, "lng": 12.50, "aliases": ["italy", "rome", "milan"], "zone": "import"},
    "Spain": {"lat": 40.42, "lng": -3.70, "aliases": ["spain", "madrid", "barcelona"], "zone": "import"},
    "Netherlands": {
        "lat": 52.37,
        "lng": 4.90,
        "aliases": ["netherlands", "holland", "amsterdam"],
        "zone": "import",
    },
    "Belgium": {"lat": 50.85, "lng": 4.35, "aliases": ["belgium", "brussels"], "zone": "import"},
    "Poland": {"lat": 52.23, "lng": 21.01, "aliases": ["poland", "warsaw"], "zone": "import"},
    "Sweden": {"lat": 59.33, "lng": 18.07, "aliases": ["sweden", "stockholm"], "zone": "import"},
    "Austria": {"lat": 48.21, "lng": 16.37, "aliases": ["austria", "vienna"], "zone": "import"},
    "Portugal": {"lat": 38.72, "lng": -9.14, "aliases": ["portugal", "lisbon"], "zone": "import"},
    "Greece": {"lat": 37.98, "lng": 23.73, "aliases": ["greece", "athens"], "zone": "import"},
    "Czech Republic": {
        "lat": 50.08,
        "lng": 14.44,
        "aliases": ["czech republic", "czechia", "prague"],
        "zone": "import",
    },
    "Romania": {"lat": 44.43, "lng": 26.10, "aliases": ["romania", "bucharest"], "zone": "import"},
    "Hungary": {"lat": 47.50, "lng": 19.04, "aliases": ["hungary", "budapest"], "zone": "import"},
    "Ireland": {"lat": 53.35, "lng": -6.26, "aliases": ["ireland", "dublin"], "zone": "import"},
    "Denmark": {"lat": 55.68, "lng": 12.57, "aliases": ["denmark", "copenhagen"], "zone": "import"},
    "Finland": {"lat": 60.17, "lng": 24.94, "aliases": ["finland", "helsinki"], "zone": "import"},
    "Slovakia": {"lat": 48.15, "lng": 17.11, "aliases": ["slovakia", "bratislava"], "zone": "import"},
    "Bulgaria": {"lat": 42.70, "lng": 23.32, "aliases": ["bulgaria", "sofia"], "zone": "import"},
    "Croatia": {"lat": 45.81, "lng": 15.98, "aliases": ["croatia", "zagreb"], "zone": "import"},
    "Lithuania": {"lat": 54.69, "lng": 25.28, "aliases": ["lithuania", "vilnius"], "zone": "import"},
    "Latvia": {"lat": 56.95, "lng": 24.11, "aliases": ["latvia", "riga"], "zone": "import"},
    "Estonia": {"lat": 59.44, "lng": 24.75, "aliases": ["estonia", "tallinn"], "zone": "import"},
    "Slovenia": {"lat": 46.06, "lng": 14.51, "aliases": ["slovenia", "ljubljana"], "zone": "import"},
    "Luxembourg": {"lat": 49.61, "lng": 6.13, "aliases": ["luxembourg"], "zone": "import"},
    "Malta": {"lat": 35.90, "lng": 14.51, "aliases": ["malta", "valletta"], "zone": "import"},
    "Cyprus": {"lat": 35.17, "lng": 33.36, "aliases": ["cyprus", "nicosia"], "zone": "import"},
    "Brazil": {"lat": -15.79, "lng": -47.88, "aliases": ["brazil", "brasilia", "são paulo", "sao paulo"], "zone": "import"},
    "Argentina": {"lat": -34.60, "lng": -58.38, "aliases": ["argentina", "buenos aires"], "zone": "import"},
    "Colombia": {"lat": 4.71, "lng": -74.07, "aliases": ["colombia", "bogota", "bogotá"], "zone": "import"},
    "Chile": {"lat": -33.45, "lng": -70.67, "aliases": ["chile", "santiago"], "zone": "import"},
    "Peru": {"lat": -12.05, "lng": -77.04, "aliases": ["peru", "lima"], "zone": "import"},
    "Venezuela": {"lat": 10.49, "lng": -66.88, "aliases": ["venezuela", "caracas"], "zone": "import"},
    "Ecuador": {"lat": -0.18, "lng": -78.47, "aliases": ["ecuador", "quito"], "zone": "import"},
    "Bolivia": {"lat": -16.49, "lng": -68.12, "aliases": ["bolivia", "la paz"], "zone": "import"},
    "Paraguay": {"lat": -25.26, "lng": -57.58, "aliases": ["paraguay", "asuncion", "asunción"], "zone": "import"},
    "Uruguay": {"lat": -34.90, "lng": -56.19, "aliases": ["uruguay", "montevideo"], "zone": "import"},
    "China": {"lat": 39.90, "lng": 116.41, "aliases": ["china", "beijing", "shanghai"], "zone": "import"},
    "India": {"lat": 28.61, "lng": 77.21, "aliases": ["india", "new delhi", "delhi", "mumbai"], "zone": "import"},
    "Japan": {"lat": 35.68, "lng": 139.65, "aliases": ["japan", "tokyo"], "zone": "import"},
    "South Korea": {
        "lat": 37.57,
        "lng": 126.98,
        "aliases": ["south korea", "republic of korea", "korea", "seoul"],
        "zone": "import",
    },
    "Indonesia": {"lat": -6.21, "lng": 106.85, "aliases": ["indonesia", "jakarta"], "zone": "import"},
    "Thailand": {"lat": 13.76, "lng": 100.50, "aliases": ["thailand", "bangkok"], "zone": "import"},
    "Vietnam": {"lat": 21.03, "lng": 105.85, "aliases": ["vietnam", "viet nam", "hanoi"], "zone": "import"},
    "Philippines": {"lat": 14.60, "lng": 120.98, "aliases": ["philippines", "manila"], "zone": "import"},
    "Malaysia": {"lat": 3.14, "lng": 101.69, "aliases": ["malaysia", "kuala lumpur"], "zone": "import"},
    "Singapore": {"lat": 1.35, "lng": 103.82, "aliases": ["singapore"], "zone": "import"},
    "Pakistan": {"lat": 33.69, "lng": 73.04, "aliases": ["pakistan", "islamabad"], "zone": "import"},
    "Bangladesh": {"lat": 23.81, "lng": 90.41, "aliases": ["bangladesh", "dhaka"], "zone": "import"},
    "Saudi Arabia": {"lat": 24.71, "lng": 46.67, "aliases": ["saudi arabia", "riyadh"], "zone": "import"},
    "United Arab Emirates": {
        "lat": 24.45,
        "lng": 54.37,
        "aliases": ["united arab emirates", "uae", "emirates", "dubai", "abu dhabi"],
        "zone": "import",
    },
    "Israel": {"lat": 31.77, "lng": 35.22, "aliases": ["israel", "tel aviv", "jerusalem"], "zone": "import"},
    "Turkey": {"lat": 39.93, "lng": 32.85, "aliases": ["turkey", "türkiye", "turkiye", "ankara", "istanbul"], "zone": "import"},
    "Iran": {"lat": 35.69, "lng": 51.42, "aliases": ["iran", "tehran"], "zone": "import"},
}

CORRIDOR_LOCATION_ZONES = frozenset({"endemic", "hotspot", "watch"})
IMPORT_LOCATIONS = frozenset(
    name for name, meta in LOCATION_CATALOG.items() if meta.get("zone") == "import"
)

IMPORT_CASE_PATTERN = re.compile(
    r"\b("
    r"confirmed case|confirmed cases|first case|imported case|imported cases|"
    r"case confirmed|cases confirmed|spillover|exported case"
    r")\b",
    re.IGNORECASE,
)

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


def location_zone(name: str) -> str:
    meta = LOCATION_CATALOG.get(name)
    if not meta:
        return "unknown"
    return str(meta.get("zone", "unknown"))


def is_import_location(name: str) -> bool:
    return location_zone(name) == "import"


def is_corridor_location(name: str) -> bool:
    return location_zone(name) in CORRIDOR_LOCATION_ZONES


def article_has_import_location(locations: list[str]) -> bool:
    return any(is_import_location(loc) for loc in locations)


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
    import_locs = [loc for loc in extract_locations(title, summary) if is_import_location(loc)]

    raw = "low"
    if has_evd and has_outbreak and (has_alert or has_strain or in_hotspot):
        raw = "critical"
    elif has_evd and import_locs and (has_outbreak or IMPORT_CASE_PATTERN.search(text)):
        raw = "high"
    elif has_evd and (has_outbreak or category in {"outbreak", "alert", "contact_tracing"}) and relevance >= 0.45:
        raw = "high"
    elif has_evd and import_locs and relevance >= 0.3:
        raw = "medium"
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
