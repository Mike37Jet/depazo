from typing import Self

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.infrastructure.persistence.listing_reaction_repository import (
    SqlAlchemyListingReactionRepository,
)
from depazo.infrastructure.persistence.listing_repository import SqlAlchemyListingRepository
from depazo.infrastructure.persistence.push_subscription_repository import (
    SqlAlchemyPushSubscriptionRepository,
)
from depazo.infrastructure.persistence.search_profile_repository import (
    SqlAlchemySearchProfileRepository,
)


class SqlAlchemyUnitOfWork:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory
        self._session: AsyncSession | None = None

    @property
    def listings(self) -> SqlAlchemyListingRepository:
        return SqlAlchemyListingRepository(self._active_session())

    @property
    def listing_reactions(self) -> SqlAlchemyListingReactionRepository:
        return SqlAlchemyListingReactionRepository(self._active_session())

    @property
    def push_subscriptions(self) -> SqlAlchemyPushSubscriptionRepository:
        return SqlAlchemyPushSubscriptionRepository(self._active_session())

    @property
    def search_profiles(self) -> SqlAlchemySearchProfileRepository:
        return SqlAlchemySearchProfileRepository(self._active_session())

    async def __aenter__(self) -> Self:
        self._session = self._session_factory()
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        session = self._active_session()
        await session.rollback()
        await session.close()
        self._session = None

    async def commit(self) -> None:
        await self._active_session().commit()

    def _active_session(self) -> AsyncSession:
        if self._session is None:
            raise RuntimeError("unit of work used outside its context")
        return self._session
