from collections.abc import Callable
from uuid import UUID

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.application.use_cases.rank_listings import RankingReport, rank_listings


class SearchProfileNotFoundError(LookupError):
    pass


class RankUserMatches:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID) -> RankingReport:
        async with self._open_unit_of_work() as unit_of_work:
            profile = await unit_of_work.search_profiles.find_for_user(user_id)
            if profile is None:
                raise SearchProfileNotFoundError("the user has no search profile yet")
            listings = await unit_of_work.listings.list_active()
        return rank_listings(listings, profile)
