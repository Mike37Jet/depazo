from collections.abc import Callable, Iterable
from dataclasses import dataclass

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.listing import Listing
from depazo.domain.scoring import ScoreResult, score_listing
from depazo.domain.search_profile import SearchProfile


@dataclass(frozen=True, slots=True)
class RankedListing:
    listing: Listing
    result: ScoreResult


@dataclass(frozen=True, slots=True)
class RankingReport:
    matches: tuple[RankedListing, ...]
    evaluated_count: int
    rejected_count: int


def rank_listings(listings: Iterable[Listing], profile: SearchProfile) -> RankingReport:
    ranked = [RankedListing(listing, score_listing(listing, profile)) for listing in listings]
    rejected = [candidate for candidate in ranked if not candidate.result.passed_hard_filters]
    matches = sorted(
        (
            candidate
            for candidate in ranked
            if candidate.result.passed_hard_filters and candidate.result.total >= profile.min_score
        ),
        key=lambda candidate: candidate.result.total,
        reverse=True,
    )
    return RankingReport(
        matches=tuple(matches), evaluated_count=len(ranked), rejected_count=len(rejected)
    )


class RankListings:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, profile: SearchProfile) -> RankingReport:
        async with self._open_unit_of_work() as unit_of_work:
            listings = await unit_of_work.listings.list_active()
        return rank_listings(listings, profile)
