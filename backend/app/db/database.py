from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    from app.models import article, briefing, source  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_schema)


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

    if "briefings" in inspector.get_table_names():
        briefing_cols = {col["name"] for col in inspector.get_columns("briefings")}
        if "citations_json" not in briefing_cols:
            connection.execute(sa.text("ALTER TABLE briefings ADD COLUMN citations_json TEXT"))
