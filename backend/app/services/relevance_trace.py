"""Goal-oriented relevance tracing for DRC/Uganda EVD corridor monitoring.

Scores articles across explainable pillars, applies negative filters for off-topic
health noise, and adapts ingest thresholds by source context.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from app.services.ebola_domain import (
    EVD_ALERT_PATTERN,
    EVD_CORE_PATTERN,
    EVD_OUTBREAK_PATTERN,
    EVD_RESPONSE_PATTERN,
    EVD_STRAIN_PATTERN,
    LOCATION_CATALOG,
    extract_locations,
    is_dedicated_evd_source,
)

GOAL_ID = "drc_uganda_evd_corridor"
MIN_INDEX_SCORE = 0.25
MIN_DEDICATED_SCORE = 0.12

CORRIDOR_LOCATIONS = frozenset(
    {
        "Democratic Republic of the Congo",
        "Ituri Province",
        "North Kivu",
        "Equateur Province",
        "Uganda",
        "Rwanda",
        "Burundi",
        "South Sudan",
    }
)

HOTSPOT_LOCATIONS = frozenset(
    loc for loc, meta in LOCATION_CATALOG.items() if meta.get("zone") == "hotspot"
)

CROSS_BORDER_PATTERN = re.compile(
    r"\b(cross.?border|spillover|imported?.?case|exported?.?case|transmission.?chain|"
    r"point.?of.?entry|screening|bundibugyo|aru\b|kisoro|kasese)\b",
    re.IGNORECASE,
)

NEGATIVE_NOISE_PATTERN = re.compile(
    r"\b("
    r"covid|coronavirus|sars-cov|mpox|monkeypox|influenza|measles|cholera|"
    r"malaria|dengue|polio|hiv/aids|tuberculosis|meningitis"
    r")\b",
    re.IGNORECASE,
)

HISTORICAL_ONLY_PATTERN = re.compile(
    r"\b(2014.{0,20}west africa|west africa.{0,20}2014|2018.{0,20}equateur|"
    r"history of ebola|past outbreak|previous epidemic)\b",
    re.IGNORECASE,
)


@dataclass
class TraceSignal:
    pillar: str
    label: str
    weight: float

    def as_dict(self) -> dict[str, Any]:
        return {"pillar": self.pillar, "label": self.label, "weight": round(self.weight, 3)}


@dataclass
class RelevanceAssessment:
    score: float
    verdict: str  # index | watch | skip
    signals: list[TraceSignal] = field(default_factory=list)
    negatives: list[str] = field(default_factory=list)
    source_context: str = "general"
    goal: str = GOAL_ID

    def as_dict(self) -> dict[str, Any]:
        return {
            "goal": self.goal,
            "score": round(self.score, 3),
            "verdict": self.verdict,
            "source_context": self.source_context,
            "signals": [s.as_dict() for s in self.signals],
            "negatives": self.negatives,
        }

    def to_json(self) -> str:
        return json.dumps(self.as_dict())


def _source_context(source_name: str, source_url: str, source_region: str | None) -> str:
    if is_dedicated_evd_source(source_name, source_url):
        return "dedicated_feed"
    name = source_name.lower()
    if any(k in name for k in ("who", "cdc", "reliefweb")):
        return "agency_feed"
    if "google news" in name:
        return "aggregator"
    if source_region in {"drc", "uganda", "africa"}:
        return "regional_feed"
    return "general"


def _corridor_locations(locations: list[str]) -> list[str]:
    return [loc for loc in locations if loc in CORRIDOR_LOCATIONS]


def assess_relevance(
    title: str,
    summary: str | None,
    *,
    source_name: str = "",
    source_url: str = "",
    source_region: str | None = None,
) -> RelevanceAssessment:
    text = f"{title} {summary or ''}"
    text_lower = text.lower()
    signals: list[TraceSignal] = []
    negatives: list[str] = []
    score = 0.0

    context = _source_context(source_name, source_url, source_region)
    locations = extract_locations(title, summary)
    corridor = _corridor_locations(locations)
    hotspots = [loc for loc in locations if loc in HOTSPOT_LOCATIONS]

    has_evd = EVD_CORE_PATTERN.search(text) is not None
    if has_evd:
        hits = len(EVD_CORE_PATTERN.findall(text))
        boost = min(0.38, 0.28 + hits * 0.04)
        signals.append(TraceSignal("evd_core", "Ebola / filovirus topic", boost))
        score += boost

    if EVD_STRAIN_PATTERN.search(text):
        signals.append(TraceSignal("strain", "EVD strain or vaccine (e.g. Bundibugyo, Ervebo)", 0.08))
        score += 0.08

    outbreak_hits = len(EVD_OUTBREAK_PATTERN.findall(text))
    if outbreak_hits:
        boost = min(0.14, 0.06 + outbreak_hits * 0.03)
        signals.append(TraceSignal("outbreak", "Outbreak / case reporting language", boost))
        score += boost

    response_hits = len(EVD_RESPONSE_PATTERN.findall(text))
    if response_hits:
        boost = min(0.12, 0.05 + response_hits * 0.025)
        signals.append(TraceSignal("response", "EVD response operations (IPC, tracing, burial)", boost))
        score += boost

    if EVD_ALERT_PATTERN.search(text):
        signals.append(TraceSignal("alert", "Alert / mortality / spread signal", 0.06))
        score += 0.06

    if CROSS_BORDER_PATTERN.search(text):
        signals.append(TraceSignal("cross_border", "Cross-border / screening / corridor signal", 0.1))
        score += 0.1

    if hotspots:
        signals.append(
            TraceSignal("geography", f"Active hotspot: {', '.join(hotspots[:2])}", 0.14)
        )
        score += 0.14
    elif corridor:
        signals.append(
            TraceSignal("geography", f"DRC/Uganda corridor: {', '.join(corridor[:2])}", 0.1)
        )
        score += 0.1
    elif locations:
        signals.append(
            TraceSignal("geography", f"Geography tagged: {', '.join(locations[:2])}", 0.04)
        )
        score += 0.04

    if context == "dedicated_feed" and not has_evd and (corridor or response_hits):
        signals.append(TraceSignal("source", "Dedicated EVD/DRC feed with corridor context", 0.08))
        score += 0.08
    elif context == "agency_feed" and has_evd:
        signals.append(TraceSignal("source", "Agency source on EVD topic", 0.06))
        score += 0.06

    # --- negative filters ---
    if NEGATIVE_NOISE_PATTERN.search(text) and not has_evd:
        negatives.append("Off-topic disease without EVD mention")
        score -= 0.22

    if HISTORICAL_ONLY_PATTERN.search(text_lower) and not corridor and not hotspots:
        negatives.append("Historical outbreak reference without active corridor geography")
        score -= 0.12

    if not has_evd and not corridor and not (outbreak_hits and response_hits):
        if not (context == "dedicated_feed" and source_region in {"drc", "uganda", "africa"}):
            negatives.append("No EVD topic or corridor geography")
            score -= 0.08

    score = max(0.0, min(1.0, score))
    verdict = _verdict(score, text, context, has_evd, corridor, outbreak_hits, response_hits)

    return RelevanceAssessment(
        score=score,
        verdict=verdict,
        signals=signals,
        negatives=negatives,
        source_context=context,
    )


def _verdict(
    score: float,
    text: str,
    context: str,
    has_evd: bool,
    corridor: list[str],
    outbreak_hits: int,
    response_hits: int,
) -> str:
    if context == "dedicated_feed":
        if score >= MIN_DEDICATED_SCORE and (
            has_evd or corridor or outbreak_hits or response_hits
        ):
            return "index"
        if has_evd or EVD_CORE_PATTERN.search(text):
            return "index"
        return "skip"

    if score >= MIN_INDEX_SCORE:
        return "index"
    if score >= 0.15 or (has_evd and score >= 0.1):
        return "watch"
    return "skip"


def should_index(assessment: RelevanceAssessment) -> bool:
    return assessment.verdict == "index"


def trace_from_json(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def top_signal_labels(assessment: RelevanceAssessment, limit: int = 3) -> list[str]:
    ranked = sorted(assessment.signals, key=lambda s: s.weight, reverse=True)
    return [s.label for s in ranked[:limit]]
