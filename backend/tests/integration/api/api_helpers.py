from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from tests.builders import a_listing
from tests.integration.auth_tokens import issue_token

NOW = datetime(2026, 11, 14, 12, tzinfo=UTC)
REQUESTS_PER_WINDOW = 10


def authorized(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_token(user_id)}"}


async def save_listings(
    session_factory: async_sessionmaker[AsyncSession], *overrides: dict[str, Any]
) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        for override in overrides:
            await unit_of_work.listings.save(a_listing(**override), NOW)
        await unit_of_work.commit()
