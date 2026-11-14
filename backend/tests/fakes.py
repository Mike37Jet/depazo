from collections.abc import Sequence
from datetime import datetime
from typing import Self

from depazo.domain.listing import Listing

ListingKey = tuple[str, str]


class InMemoryListingRepository:
    def __init__(self) -> None:
        self.saved: dict[ListingKey, tuple[Listing, datetime]] = {}
        self.price_history: list[tuple[Listing, datetime]] = []

    async def find(self, source: str, external_id: str) -> Listing | None:
        stored = self.saved.get((source, external_id))
        return stored[0] if stored is not None else None

    async def save(self, listing: Listing, seen_at: datetime) -> None:
        self.saved[(listing.source, listing.external_id)] = (listing, seen_at)

    async def record_price(self, listing: Listing, observed_at: datetime) -> None:
        self.price_history.append((listing, observed_at))

    async def list_active(self) -> Sequence[Listing]:
        return [listing for listing, _ in self.saved.values()]


class InMemoryUnitOfWork:
    def __init__(self, repository: InMemoryListingRepository) -> None:
        self._repository = repository
        self.committed = False

    @property
    def listings(self) -> InMemoryListingRepository:
        return self._repository

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None

    async def commit(self) -> None:
        self.committed = True
