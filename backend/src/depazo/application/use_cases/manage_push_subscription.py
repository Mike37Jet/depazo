from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.push_subscription import PushSubscription


class SubscribeToPush:
    def __init__(
        self, open_unit_of_work: Callable[[], UnitOfWork], clock: Callable[[], datetime]
    ) -> None:
        self._open_unit_of_work = open_unit_of_work
        self._clock = clock

    async def execute(self, user_id: UUID, subscription: PushSubscription) -> None:
        async with self._open_unit_of_work() as unit_of_work:
            await unit_of_work.push_subscriptions.save_for_user(
                user_id, subscription, self._clock()
            )
            await unit_of_work.commit()


class UnsubscribeFromPush:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID, endpoint: str) -> None:
        async with self._open_unit_of_work() as unit_of_work:
            await unit_of_work.push_subscriptions.remove_for_user(user_id, endpoint)
            await unit_of_work.commit()
