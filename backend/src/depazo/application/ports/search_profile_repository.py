from collections.abc import Sequence
from datetime import datetime
from typing import Protocol
from uuid import UUID

from depazo.domain.search_profile import SearchProfile


class SearchProfileRepository(Protocol):
    async def find_for_user(self, user_id: UUID) -> SearchProfile | None: ...

    async def list_all(self) -> Sequence[tuple[UUID, SearchProfile]]: ...

    async def save_for_user(
        self, user_id: UUID, profile: SearchProfile, saved_at: datetime
    ) -> None: ...
