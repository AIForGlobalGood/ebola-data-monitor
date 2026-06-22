"""Fetch and parse official outbreak situation counts.

This layer is intentionally separate from RSS/news ingestion: confirmed case
and death counts should come from official situation reports, not headlines.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
from bs4 import BeautifulSoup


@dataclass(frozen=True)
class OfficialSource:
    name: str
    url: str
    source_type: str


@dataclass
class OfficialMetric:
    country: str
    confirmed_cases: int | None = None
    deaths: int | None = None
    probable_deaths: int | None = None
    recoveries: int | None = None
    admissions: int | None = None
    imported_cases: int | None = None
    local_cases: int | None = None
    contacts_active: int | None = None
    source_name: str = ""
    source_url: str = ""
    source_type: str = ""
    as_of: str | None = None
    fetched_at: datetime | None = None
    notes: str | None = None
    status: str = "ok"


OFFICIAL_SOURCES = (
    OfficialSource(
        name="Uganda Ministry of Health — EVD Daily",
        url="https://evd-daily.health.go.ug/",
        source_type="national_ministry",
    ),
    OfficialSource(
        name="WHO Disease Outbreak News — DON608",
        url="https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON608",
        source_type="who_don",
    ),
    OfficialSource(
        name="ECDC Communicable Disease Threats — DRC/Uganda EVD",
        url="https://www.ecdc.europa.eu/en/ebola-outbreak-democratic-republic-congo-and-uganda",
        source_type="ecdc",
    ),
)


def _clean_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True))


def _int(match: re.Match[str] | None, group: int = 1) -> int | None:
    if not match:
        return None
    return int(match.group(group).replace(",", ""))


def _number_token(value: str | None) -> int | None:
    if not value:
        return None
    lowered = value.lower()
    words = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
    if lowered in words:
        return words[lowered]
    return int(value.replace(",", ""))


def _as_of(text: str) -> str | None:
    patterns = (
        r"As of ([A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+ \d{4})",
        r"As of (\d{1,2} [A-Z][a-z]+ \d{4})",
        r"data as of (\d{1,2} [A-Z][a-z]+ \d{4})",
    )
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _base_metric(source: OfficialSource, country: str, text: str) -> OfficialMetric:
    return OfficialMetric(
        country=country,
        source_name=source.name,
        source_url=source.url,
        source_type=source.source_type,
        as_of=_as_of(text),
        fetched_at=datetime.now(UTC),
    )


def _parse_uganda_moh(source: OfficialSource, text: str) -> list[OfficialMetric]:
    metric = _base_metric(source, "Uganda", text)
    metric.confirmed_cases = _int(re.search(r"(\d[\d,]*)\s+Cumulative confirmed cases", text, re.I))
    metric.imported_cases = _int(re.search(r"(\d[\d,]*)\s+Imported Cases", text, re.I))
    metric.local_cases = _int(re.search(r"(\d[\d,]*)\s+Local cases", text, re.I))
    metric.admissions = _int(re.search(r"(\d[\d,]*)\s+Current admissions", text, re.I))
    metric.recoveries = _int(re.search(r"(\d[\d,]*)\s+Recoveries", text, re.I))
    metric.deaths = _int(re.search(r"(\d[\d,]*)\s+Cumulative deaths", text, re.I))
    metric.contacts_active = _int(re.search(r"(\d[\d,]*)\s+Active contacts", text, re.I))
    metric.notes = "Daily national dashboard counters from Uganda Ministry of Health."
    return [metric]


def _parse_who_don(source: OfficialSource, text: str) -> list[OfficialMetric]:
    drc = _base_metric(source, "Democratic Republic of the Congo", text)
    uganda = _base_metric(source, "Uganda", text)

    drc_match = re.search(
        r"Democratic Republic of the Congo.*?cumulative of\s+(\d[\d,]*)\s+confirmed cases,\s+including\s+(\d[\d,]*)\s+deaths",
        text,
        re.I,
    )
    if not drc_match:
        drc_match = re.search(
            r"cumulative of\s+(\d[\d,]*)\s+confirmed cases,\s+including\s+(\d[\d,]*)\s+deaths.*?Democratic Republic of the Congo",
            text,
            re.I,
        )
    drc.confirmed_cases = _int(drc_match, 1)
    drc.deaths = _int(drc_match, 2)
    drc.notes = "WHO Disease Outbreak News cumulative confirmed cases and deaths."

    uganda_match = re.search(
        r"Uganda has reported\s+(\d[\d,]*)\s+confirmed cases including\s+(\w+|\d[\d,]*)\s+deaths",
        text,
        re.I,
    )
    uganda.confirmed_cases = _int(uganda_match, 1)
    if uganda_match:
        uganda.deaths = _number_token(uganda_match.group(2))
    uganda.probable_deaths = 1 if re.search(r"one probable case who has died", text, re.I) else None
    uganda.imported_cases = _int(re.search(r"(\d[\d,]*)\s+cases are imported", text, re.I))
    uganda.local_cases = _int(re.search(r"and\s+(\d[\d,]*)\s+are secondary transmission", text, re.I))
    uganda.recoveries = _int(re.search(r"(\d[\d,]*)\s+recoveries have been reported", text, re.I))
    uganda.notes = "WHO Disease Outbreak News; Uganda figures are epidemiologically linked to DRC transmission."

    return [m for m in (drc, uganda) if m.confirmed_cases is not None or m.deaths is not None]


def _parse_ecdc(source: OfficialSource, text: str) -> list[OfficialMetric]:
    metrics: list[OfficialMetric] = []

    drc_match = re.search(
        r"DRC Ministry of Health reported a total of\s+(\d[\d,]*)\s+confirmed cases,\s+including\s+(\d[\d,]*)\s+confirmed related deaths",
        text,
        re.I,
    )
    if drc_match:
        drc = _base_metric(source, "Democratic Republic of the Congo", text)
        drc.confirmed_cases = _int(drc_match, 1)
        drc.deaths = _int(drc_match, 2)
        drc.notes = "ECDC summary citing DRC Ministry of Health."
        metrics.append(drc)

    uganda_match = re.search(
        r"Uganda had reported a total of\s+(\d[\d,]*)\s+confirmed cases,\s+including\s+(\w+|\d[\d,]*)\s+deaths",
        text,
        re.I,
    )
    if uganda_match:
        uganda = _base_metric(source, "Uganda", text)
        uganda.confirmed_cases = _int(uganda_match, 1)
        uganda.deaths = _number_token(uganda_match.group(2))
        uganda.imported_cases = _int(re.search(r"(\d[\d,]*)\s+were imported", text, re.I))
        uganda.local_cases = _int(re.search(r"(\d[\d,]*)\s+were associated with local transmission", text, re.I))
        uganda.notes = "ECDC summary of national and WHO outbreak information."
        metrics.append(uganda)

    return metrics


def _parse_source(source: OfficialSource, html: str) -> list[OfficialMetric]:
    text = _clean_text(html)
    if source.source_type == "national_ministry":
        return _parse_uganda_moh(source, text)
    if source.source_type == "who_don":
        return _parse_who_don(source, text)
    if source.source_type == "ecdc":
        return _parse_ecdc(source, text)
    return []


async def fetch_official_situation() -> list[OfficialMetric]:
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        async def fetch_one(source: OfficialSource) -> list[OfficialMetric]:
            try:
                response = await client.get(
                    source.url,
                    headers={"User-Agent": "EbolaCrisisHub/1.0 (official-statistics-monitoring)"},
                )
                response.raise_for_status()
                return _parse_source(source, response.text)
            except Exception as exc:  # noqa: BLE001
                return [
                    OfficialMetric(
                        country="Unknown",
                        source_name=source.name,
                        source_url=source.url,
                        source_type=source.source_type,
                        fetched_at=datetime.now(UTC),
                        notes=str(exc),
                        status="error",
                    )
                ]

        results = await asyncio.gather(*(fetch_one(source) for source in OFFICIAL_SOURCES))

    return [metric for result in results for metric in result]
