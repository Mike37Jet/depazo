from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Self
from uuid import UUID

from depazo.application.dto.listing_alert import ListingAlert
from depazo.domain.listing import Listing
from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.domain.search_profile import SearchProfile

SourceAndId = tuple[str, str]


class InMemoryListingRepository:
    def __init__(self) -> None:
        self.saved: dict[SourceAndId, tuple[Listing, datetime]] = {}
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


class InMemoryListingReactionRepository:
    def __init__(self, listings: InMemoryListingRepository) -> None:
        self._listings = listings
        self.saved: dict[tuple[UUID, ListingKey], Reaction] = {}

    async def reactions_for_user(self, user_id: UUID) -> Mapping[ListingKey, Reaction]:
        return {key: reaction for (owner, key), reaction in self.saved.items() if owner == user_id}

    async def react(
        self, user_id: UUID, key: ListingKey, reaction: Reaction, reacted_at: datetime
    ) -> bool:
        if await self._listings.find(key.source, key.external_id) is None:
            return False
        self.saved[(user_id, key)] = reaction
        return True

    async def clear(self, user_id: UUID, key: ListingKey) -> None:
        self.saved.pop((user_id, key), None)


class InMemoryUnitOfWork:
    def __init__(
        self,
        repository: InMemoryListingRepository | None = None,
        search_profiles: InMemorySearchProfileRepository | None = None,
    ) -> None:
        self._repository = repository or InMemoryListingRepository()
        self._search_profiles = search_profiles or InMemorySearchProfileRepository()
        self._listing_reactions = InMemoryListingReactionRepository(self._repository)
        self.committed = False

    @property
    def listings(self) -> InMemoryListingRepository:
        return self._repository

    @property
    def listing_reactions(self) -> InMemoryListingReactionRepository:
        return self._listing_reactions

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
