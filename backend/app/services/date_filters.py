from datetime import UTC, datetime

from dateutil import parser as date_parser
from sqlalchemy import Select

from app.models import Article


def parse_date_param(value: str | None, *, end_of_day: bool = False) -> datetime | None:
    """Parse YYYY-MM-DD or ISO datetime to UTC."""
    if not value or not value.strip():
        return None
    raw = value.strip()
    dt = date_parser.parse(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)

    is_date_only = "T" not in raw and len(raw) <= 10
    if is_date_only and end_of_day:
        return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    if is_date_only:
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return dt


def apply_date_filters(
    stmt: Select,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> Select:
    col = Article.fetched_at if date_field == "fetched" else Article.published_at

    if date_field == "published" and (date_from or date_to):
        stmt = stmt.where(col.is_not(None))
    if date_from:
        stmt = stmt.where(col >= date_from)
    if date_to:
        stmt = stmt.where(col <= date_to)
    return stmt


def date_filter_active(date_from: datetime | None, date_to: datetime | None) -> bool:
    return date_from is not None or date_to is not None
