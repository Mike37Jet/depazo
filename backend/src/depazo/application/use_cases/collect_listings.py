from dataclasses import dataclass

from depazo.application.ports.listing_source import ListingSource, SourceBlockedError
from depazo.domain.listing import Listing


@dataclass(frozen=True, slots=True)
class CollectionReport:
    source: str
    listings: tuple[Listing, ...]
    was_blocked: bool


class CollectListings:
    def __init__(self, source: ListingSource) -> None:
        self._source = source

    async def execute(self, max_pages: int) -> CollectionReport:
        unique_listings: dict[str, Listing] = {}
        was_blocked = False
        try:
            async for listing in self._source.listings(max_pages):
                unique_listings.setdefault(listing.external_id, listing)
        except SourceBlockedError:
            was_blocked = True
        return CollectionReport(
            source=self._source.name,
            listings=tuple(unique_listings.values()),
            was_blocked=was_blocked,
        )
