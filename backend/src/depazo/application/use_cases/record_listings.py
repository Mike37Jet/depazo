from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.listing import Listing
from depazo.domain.sighting import SightingOutcome, classify_sighting


@dataclass(frozen=True, slots=True)
class RecordingSummary:
    new_listings: tuple[Listing, ...]
    repriced_listings: tuple[Listing, ...]
    unchanged_count: int


class RecordListings:
    def __init__(
        self, open_unit_of_work: Callable[[], UnitOfWork], clock: Callable[[], datetime]
    ) -> None:
        self._open_unit_of_work = open_unit_of_work
        self._clock = clock

    async def execute(self, listings: Sequence[Listing]) -> RecordingSummary:
        seen_at = self._clock()
        outcomes: dict[SightingOutcome, list[Listing]] = {
            outcome: [] for outcome in SightingOutcome
        }
        async with self._open_unit_of_work() as unit_of_work:
            for listing in listings:
                previous = await unit_of_work.listings.find(listing.source, listing.external_id)
                outcome = classify_sighting(previous, listing)
                await unit_of_work.listings.save(listing, seen_at)
                if outcome is not SightingOutcome.UNCHANGED:
                    await unit_of_work.listings.record_price(listing, seen_at)
                outcomes[outcome].append(listing)
            await unit_of_work.commit()
        return RecordingSummary(
            new_listings=tuple(outcomes[SightingOutcome.NEW]),
            repriced_listings=tuple(outcomes[SightingOutcome.PRICE_CHANGED]),
            unchanged_count=len(outcomes[SightingOutcome.UNCHANGED]),
        )
