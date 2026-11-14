from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from depazo.domain.push_subscription import PushSubscription
from depazo.infrastructure.persistence.models import PushSubscriptionRecord


class SqlAlchemyPushSubscriptionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_for_user(
        self, user_id: UUID, subscription: PushSubscription, saved_at: datetime
    ) -> None:
        statement = insert(PushSubscriptionRecord).values(
            user_id=user_id,
            endpoint=subscription.endpoint,
            p256dh=subscription.p256dh,
            auth=subscription.auth,
            created_at=saved_at,
        )
        await self._session.execute(
            statement.on_conflict_do_update(
                index_elements=[PushSubscriptionRecord.endpoint],
                set_={
                    "user_id": user_id,
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                    "created_at": saved_at,
                },
            )
        )

    async def remove_for_user(self, user_id: UUID, endpoint: str) -> None:
        await self._session.execute(
            delete(PushSubscriptionRecord).where(
                PushSubscriptionRecord.user_id == user_id,
                PushSubscriptionRecord.endpoint == endpoint,
            )
        )

    async def list_for_user(self, user_id: UUID) -> Sequence[PushSubscription]:
        records = await self._session.scalars(
            select(PushSubscriptionRecord).where(PushSubscriptionRecord.user_id == user_id)
        )
        return [
            PushSubscription(endpoint=record.endpoint, p256dh=record.p256dh, auth=record.auth)
            for record in records
        ]

    async def remove(self, endpoint: str) -> None:
        await self._session.execute(
            delete(PushSubscriptionRecord).where(PushSubscriptionRecord.endpoint == endpoint)
        )
