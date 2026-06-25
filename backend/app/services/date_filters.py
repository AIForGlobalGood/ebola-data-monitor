from datetime import UTC, datetime
from functools import lru_cache

from dateutil import parser as date_parser
from sqlalchemy import Select, and_, or_

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


@lru_cache
def get_min_data_date() -> datetime:
    from app.config import get_settings

    settings = get_settings()
    parsed = parse_date_param(settings.min_published_date, end_of_day=False)
    return parsed or datetime(2026, 1, 1, tzinfo=UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def article_meets_retention(published_at: datetime | None, fetched_at: datetime | None) -> bool:
    cutoff = get_min_data_date()
    if published_at is not None:
        return _as_utc(published_at) >= cutoff
    if fetched_at is not None:
        return _as_utc(fetched_at) >= cutoff
    return False


def retention_predicate():
    cutoff = get_min_data_date()
    return or_(
        Article.published_at >= cutoff,
        and_(Article.published_at.is_(None), Article.fetched_at >= cutoff),
    )


def stale_article_predicate():
    cutoff = get_min_data_date()
    return or_(
        Article.published_at < cutoff,
        and_(Article.published_at.is_(None), Article.fetched_at < cutoff),
    )


def apply_date_filters(
    stmt: Select,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    date_field: str = "published",
) -> Select:
    cutoff = get_min_data_date()
    if date_from is None or date_from < cutoff:
        date_from = cutoff

    stmt = stmt.where(retention_predicate())

    if date_field == "fetched":
        if date_from:
            stmt = stmt.where(Article.fetched_at >= date_from)
        if date_to:
            stmt = stmt.where(Article.fetched_at <= date_to)
        return stmt

    if date_from:
        stmt = stmt.where(
            or_(
                Article.published_at >= date_from,
                and_(Article.published_at.is_(None), Article.fetched_at >= date_from),
            )
        )
    if date_to:
        stmt = stmt.where(
            or_(
                Article.published_at <= date_to,
                and_(Article.published_at.is_(None), Article.fetched_at <= date_to),
            )
        )
    return stmt


def date_filter_active(date_from: datetime | None, date_to: datetime | None) -> bool:
    return date_from is not None or date_to is not None
