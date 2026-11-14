import asyncio

from alembic import command
from sqlalchemy import text

from depazo.infrastructure.persistence.database import create_database_engine
from tests.integration.persistence.conftest import alembic_config_for


async def listing_tables_in(url: str) -> set[str]:
    engine = create_database_engine(url)
    async with engine.connect() as connection:
        result = await connection.execute(
            text("SELECT tablename FROM pg_tables WHERE tablename LIKE 'listing%'")
        )
        tables = set(result.scalars())
    await engine.dispose()
    return tables


def test_migrations_downgrade_and_upgrade_cleanly(database_url: str) -> None:
    config = alembic_config_for(database_url)

    command.downgrade(config, "base")
    tables_after_downgrade = asyncio.run(listing_tables_in(database_url))
    command.upgrade(config, "head")
    tables_after_upgrade = asyncio.run(listing_tables_in(database_url))

    assert tables_after_downgrade == set()
    assert tables_after_upgrade == {"listings", "listing_price_history"}
