import asyncio

from alembic import context
from sqlalchemy import Connection

from depazo.infrastructure.persistence.database import (
    create_database_engine,
    database_url_from_environment,
)
from depazo.infrastructure.persistence.models import Base


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = context.config.get_main_option("sqlalchemy.url") or database_url_from_environment()
    engine = create_database_engine(url)
    async with engine.connect() as connection:
        await connection.run_sync(run_migrations)
    await engine.dispose()


asyncio.run(run_migrations_online())
