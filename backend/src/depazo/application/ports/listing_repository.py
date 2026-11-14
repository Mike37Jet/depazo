from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from depazo.domain.listing import Listing


class ListingRepository(Protocol):
    async def find(self, source: str, external_id: str) -> Listing | None: ...

    async def save(self, listing: Listing, seen_at: datetime) -> None: ...

    async def record_price(self, listing: Listing, observed_at: datetime) -> None: ...

    async def list_active(self) -> Sequence[Listing]: ...
