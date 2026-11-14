from collections.abc import Mapping
from datetime import datetime
from typing import Protocol
from uuid import UUID

from depazo.domain.listing_reaction import ListingKey, Reaction


class ListingReactionRepository(Protocol):
    async def reactions_for_user(self, user_id: UUID) -> Mapping[ListingKey, Reaction]: ...

    async def react(
        self, user_id: UUID, key: ListingKey, reaction: Reaction, reacted_at: datetime
    ) -> bool: ...

    async def clear(self, user_id: UUID, key: ListingKey) -> None: ...
