import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from docker.errors import DockerException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testcontainers.community.postgres import PostgresContainer

from depazo.infrastructure.persistence.database import create_database_engine

POSTGIS_IMAGE = os.environ.get("DEPAZO_TEST_POSTGIS_IMAGE", "postgis/postgis:17-3.5")
ALEMBIC_CONFIG_PATH = Path(__file__).parents[2] / "alembic.ini"


def alembic_config_for(url: str) -> Config:
    config = Config(str(ALEMBIC_CONFIG_PATH))
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return config


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    try:
        container = PostgresContainer(POSTGIS_IMAGE, driver="asyncpg")
        container.start()
    except DockerException as error:
        pytest.skip(f"Docker is not available: {error}")
    try:
        url = container.get_connection_url()
        command.upgrade(alembic_config_for(url), "head")
        yield url
    finally:
        container.stop()


@pytest.fixture
async def session_factory(database_url: str) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_database_engine(database_url)
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "TRUNCATE listings, listing_price_history, search_profiles RESTART IDENTITY CASCADE"
            )
        )
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()
