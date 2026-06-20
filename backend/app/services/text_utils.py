import re
from html import unescape
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup

TRACKING_PARAMS = frozenset(
    {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"}
)


def clean_html(text: str | None, max_length: int = 2000) -> str | None:
    if not text:
        return None
    soup = BeautifulSoup(text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    cleaned = unescape(soup.get_text(separator=" ", strip=True))
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > max_length:
        return cleaned[: max_length - 1].rsplit(" ", 1)[0] + "…"
    return cleaned or None


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    query = parse_qs(parsed.query, keep_blank_values=False)
    filtered = {k: v for k, v in query.items() if k.lower() not in TRACKING_PARAMS}
    normalized_query = urlencode(filtered, doseq=True)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", normalized_query, ""))


def normalize_title(title: str) -> str:
    lowered = title.lower()
    lowered = re.sub(r"[^\w\s]", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def titles_are_duplicate(a: str, b: str) -> bool:
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    short, long = (na, nb) if len(na) <= len(nb) else (nb, na)
    return len(short) >= 30 and short in long
