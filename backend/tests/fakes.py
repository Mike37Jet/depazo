from collections.abc import Sequence
from datetime import datetime
from typing import Self
from uuid import UUID

from depazo.application.dto.listing_alert import ListingAlert
from depazo.domain.listing import Listing
from depazo.domain.search_profile import SearchProfile

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


class InMemorySearchProfileRepository:
    def __init__(self) -> None:
        self.saved: dict[UUID, SearchProfile] = {}

    async def find_for_user(self, user_id: UUID) -> SearchProfile | None:
        return self.saved.get(user_id)

    async def save_for_user(
        self, user_id: UUID, profile: SearchProfile, saved_at: datetime
    ) -> None:
        self.saved[user_id] = profile


class InMemoryUnitOfWork:
    def __init__(
        self,
        repository: InMemoryListingRepository | None = None,
        search_profiles: InMemorySearchProfileRepository | None = None,
    ) -> None:
        self._repository = repository or InMemoryListingRepository()
        self._search_profiles = search_profiles or InMemorySearchProfileRepository()
        self.committed = False

    @property
    def listings(self) -> InMemoryListingRepository:
        return self._repository

    @property
    def search_profiles(self) -> InMemorySearchProfileRepository:
        return self._search_profiles

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None

    async def commit(self) -> None:
        self.committed = True


class RecordingNotifier:
    def __init__(self) -> None:
        self.batches: list[list[ListingAlert]] = []

    async def send_alerts(self, alerts: Sequence[ListingAlert]) -> None:
        self.batches.append(list(alerts))
