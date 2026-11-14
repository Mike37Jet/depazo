from collections.abc import Sequence
from datetime import datetime
from typing import Protocol
from uuid import UUID

from depazo.domain.push_subscription import PushSubscription


class PushSubscriptionRepository(Protocol):
    async def save_for_user(
        self, user_id: UUID, subscription: PushSubscription, saved_at: datetime
    ) -> None: ...

    async def remove_for_user(self, user_id: UUID, endpoint: str) -> None: ...

    async def list_for_user(self, user_id: UUID) -> Sequence[PushSubscription]: ...

    async def remove(self, endpoint: str) -> None: ...
