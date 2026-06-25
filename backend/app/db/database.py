from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    settings = get_settings()
    kwargs: dict = {"echo": False}
    connect_args = settings.database_connect_args
    if connect_args:
        kwargs["connect_args"] = connect_args
    if settings.uses_turso:
        kwargs["pool_pre_ping"] = True
    return create_engine(settings.resolved_database_url, **kwargs)


settings = get_settings()
engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_connection, _connection_record) -> None:
    if settings.uses_turso:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import article, briefing, source  # noqa: F401

    with engine.begin() as conn:
        Base.metadata.create_all(conn)
        _migrate_schema(conn)


def _migrate_schema(connection) -> None:
    """Add columns to existing SQLite databases without Alembic."""
    import sqlalchemy as sa

    inspector = sa.inspect(connection)
    if "articles" in inspector.get_table_names():
        article_cols = {col["name"] for col in inspector.get_columns("articles")}
        if "severity" not in article_cols:
            connection.execute(sa.text("ALTER TABLE articles ADD COLUMN severity VARCHAR(20) DEFAULT 'low'"))
        if "locations" not in article_cols:
            connection.execute(sa.text("ALTER TABLE articles ADD COLUMN locations TEXT"))
        if "source_tier" not in article_cols:
            connection.execute(sa.text("ALTER TABLE articles ADD COLUMN source_tier VARCHAR(20) DEFAULT 'aggregator'"))
        if "trust_score" not in article_cols:
            connection.execute(sa.text("ALTER TABLE articles ADD COLUMN trust_score FLOAT DEFAULT 0.45"))
        if "relevance_trace" not in article_cols:
            connection.execute(sa.text("ALTER TABLE articles ADD COLUMN relevance_trace TEXT"))

    if "briefings" in inspector.get_table_names():
        briefing_cols = {col["name"] for col in inspector.get_columns("briefings")}
        if "citations_json" not in briefing_cols:
            connection.execute(sa.text("ALTER TABLE briefings ADD COLUMN citations_json TEXT"))
