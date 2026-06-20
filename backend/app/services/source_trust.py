"""Source trust tiers and conservative classification rules."""

from urllib.parse import urlparse

# primary = multilateral health agencies & official humanitarian reporting
PRIMARY_DOMAINS = (
    "who.int",
    "afro.who.int",
    "cdc.gov",
    "reliefweb.int",
    "emergency.cdc.gov",
    "tools.cdc.gov",
)
OFFICIAL_DOMAINS = (
    "un.org",
    "unicef.org",
    "gavi.org",
    "ecdc.europa.eu",
    "hhs.gov",
    "africa-cdc.int",
    "msf.org",
    "international-rescue.org",
)

TIER_SCORES = {"primary": 1.0, "official": 0.85, "aggregator": 0.45}
TIER_LABELS = {
    "primary": "Primary source",
    "official": "Official source",
    "aggregator": "Media aggregator — unverified",
}


def infer_source_tier(source_url: str, source_name: str = "") -> str:
    host = urlparse(source_url).netloc.lower().replace("www.", "")
    name_lower = source_name.lower()

    if any(domain in host for domain in PRIMARY_DOMAINS):
        return "primary"
    if any(domain in host for domain in OFFICIAL_DOMAINS):
        return "official"
    if "news.google.com" in host or "google.com" in host:
        return "aggregator"
    if any(k in name_lower for k in ("google news", "news —", "news -")):
        return "aggregator"
    # Default unknown RSS to aggregator — conservative
    return "aggregator"


def trust_score_for_tier(tier: str) -> float:
    return TIER_SCORES.get(tier, 0.45)


def cap_severity_for_tier(severity: str, tier: str) -> str:
    """Prevent aggregators from ever surfacing as critical."""
    order = ["low", "medium", "high", "critical"]
    cap = {"primary": "critical", "official": "critical", "aggregator": "medium"}.get(tier, "medium")
    if order.index(severity) > order.index(cap):
        return cap
    return severity


def confidence_for_articles(tier: str) -> str:
    if tier == "primary":
        return "confirmed"
    if tier == "official":
        return "likely"
    return "unverified"


def aggregate_confidence(tiers: list[str]) -> str:
    if not tiers:
        return "unverified"
    if all(t == "primary" for t in tiers):
        return "confirmed"
    if all(t in {"primary", "official"} for t in tiers):
        return "likely"
    if any(t == "primary" for t in tiers):
        return "likely"
    return "unverified"
