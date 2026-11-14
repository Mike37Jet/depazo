from collections.abc import Callable
from dataclasses import dataclass
from uuid import UUID

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.application.use_cases.rank_listings import (
    RankedListing,
    RankingReport,
    rank_listings,
)
from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.domain.scoring import score_listing


class SearchProfileNotFoundError(LookupError):
    pass


@dataclass(frozen=True, slots=True)
class UserMatchesReport:
    ranking: RankingReport
    discarded_count: int
    saved_keys: frozenset[ListingKey]


class RankUserMatches:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID) -> UserMatchesReport:
        async with self._open_unit_of_work() as unit_of_work:
            profile = await unit_of_work.search_profiles.find_for_user(user_id)
            if profile is None:
                raise SearchProfileNotFoundError("the user has no search profile yet")
            listings = await unit_of_work.listings.list_active()
            reactions = await unit_of_work.listing_reactions.reactions_for_user(user_id)
        visible = [
            listing
            for listing in listings
            if reactions.get(ListingKey.of(listing)) is not Reaction.DISCARDED
        ]
        return UserMatchesReport(
            ranking=rank_listings(visible, profile),
            discarded_count=len(listings) - len(visible),
            saved_keys=frozenset(
                key for key, reaction in reactions.items() if reaction is Reaction.SAVED
            ),
        )


class ListSavedListings:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID) -> tuple[RankedListing, ...]:
        async with self._open_unit_of_work() as unit_of_work:
            profile = await unit_of_work.search_profiles.find_for_user(user_id)
            if profile is None:
                raise SearchProfileNotFoundError("the user has no search profile yet")
            listings = await unit_of_work.listings.list_active()
            reactions = await unit_of_work.listing_reactions.reactions_for_user(user_id)
        saved = (
            RankedListing(listing, score_listing(listing, profile))
            for listing in listings
            if reactions.get(ListingKey.of(listing)) is Reaction.SAVED
        )
        return tuple(sorted(saved, key=lambda candidate: candidate.result.total, reverse=True))
