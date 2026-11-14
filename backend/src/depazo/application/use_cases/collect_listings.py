from dataclasses import dataclass

from depazo.application.ports.listing_source import ListingSource, SourceBlockedError
from depazo.domain.listing import Listing


@dataclass(frozen=True, slots=True)
class CollectionReport:
    source: str
    listings: tuple[Listing, ...]
    discarded_count: int
    was_blocked: bool


class CollectListings:
    def __init__(self, source: ListingSource) -> None:
        self._source = source

    async def execute(self, max_pages: int) -> CollectionReport:
        unique_listings: dict[tuple[str, str], Listing] = {}
        discarded_count = 0
        was_blocked = False
        try:
            async for listing in self._source.listings(max_pages):
                if not listing.has_plausible_rent:
                    discarded_count += 1
                    continue
                unique_listings.setdefault((listing.source, listing.external_id), listing)
        except SourceBlockedError:
            was_blocked = True
        return CollectionReport(
            source=self._source.name,
            listings=tuple(unique_listings.values()),
            discarded_count=discarded_count,
            was_blocked=was_blocked,
        )
