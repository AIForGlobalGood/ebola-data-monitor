"""ReliefWeb API v2 adapter (legacy RSS returns HTTP 202 empty as of 2025+)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx

from app.config import get_settings


class ReliefWebConfigError(ValueError):
    pass


def is_reliefweb_api_url(url: str) -> bool:
    return "api.reliefweb.int" in url


def is_legacy_reliefweb_rss(url: str) -> bool:
    return "reliefweb.int" in url and not is_reliefweb_api_url(url)


def parse_reliefweb_api_query(source_url: str) -> str:
    """Extract search query from ReliefWeb API source URL."""
    parsed = urlparse(source_url)
    params = parse_qs(parsed.query)
    values = params.get("query[value]", params.get("query", []))
    if values:
        return values[0]
    if "country/cod" in source_url or "cod" in source_url.lower():
        return "ebola Democratic Republic of the Congo"
    return "ebola"


async def fetch_reliefweb_entries(
    client: httpx.AsyncClient,
    *,
    source_url: str,
    limit: int,
) -> list[dict[str, Any]]:
    settings = get_settings()
    appname = settings.reliefweb_appname
    if not appname:
        raise ReliefWebConfigError(
            "RELIEFWEB_APPNAME is not set. Request an appname at "
            "https://apidoc.reliefweb.int/parameters#appname"
        )

    query = parse_reliefweb_api_query(source_url)
    response = await client.get(
        "https://api.reliefweb.int/v2/reports",
        params={
            "appname": appname,
            "limit": limit,
            "preset": "latest",
            "query[value]": query,
        },
        headers={"User-Agent": "EbolaSituationView/1.0 (public-health monitoring)"},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") and payload.get("status") != 200:
        message = payload.get("error", {}).get("message", "ReliefWeb API error")
        raise ValueError(message)

    entries: list[dict[str, Any]] = []
    for item in payload.get("data", []):
        fields = item.get("fields", {})
        title = fields.get("title") or "Untitled"
        url = fields.get("url") or fields.get("origin_url") or ""
        if not url:
            continue
        body = fields.get("body") or fields.get("body-html") or ""
        if isinstance(body, list):
            body = " ".join(str(part) for part in body)
        date_raw = fields.get("date", {}).get("created") or fields.get("date", {}).get("original")
        entries.append(
            {
                "title": title,
                "link": url,
                "summary": str(body)[:4000] if body else None,
                "published": date_raw,
                "updated": date_raw,
            }
        )
    return entries


def reliefweb_api_source_url(query: str) -> str:
    from urllib.parse import quote

    return f"https://api.reliefweb.int/v2/reports?query[value]={quote(query)}"


RELIEFWEB_SOURCE_MIGRATIONS: dict[str, str] = {
    "ReliefWeb — DRC Updates": reliefweb_api_source_url("ebola Democratic Republic of the Congo"),
    "ReliefWeb — Ebola": reliefweb_api_source_url("ebola"),
}
