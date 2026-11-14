from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.listing_reaction import ListingKey, Reaction


class ListingNotFoundError(LookupError):
    pass


class ReactToListing:
    def __init__(
        self, open_unit_of_work: Callable[[], UnitOfWork], clock: Callable[[], datetime]
    ) -> None:
        self._open_unit_of_work = open_unit_of_work
        self._clock = clock

    async def execute(self, user_id: UUID, key: ListingKey, reaction: Reaction) -> None:
        async with self._open_unit_of_work() as unit_of_work:
            was_recorded = await unit_of_work.listing_reactions.react(
                user_id, key, reaction, self._clock()
            )
            if not was_recorded:
                raise ListingNotFoundError(f"{key.source}/{key.external_id} is not a listing")
            await unit_of_work.commit()


class ClearListingReaction:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID, key: ListingKey) -> None:
        async with self._open_unit_of_work() as unit_of_work:
            await unit_of_work.listing_reactions.clear(user_id, key)
            await unit_of_work.commit()
