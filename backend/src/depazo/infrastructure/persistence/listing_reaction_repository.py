from collections.abc import Mapping
from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.infrastructure.persistence.models import ListingReactionRecord, ListingRecord


class SqlAlchemyListingReactionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def reactions_for_user(self, user_id: UUID) -> Mapping[ListingKey, Reaction]:
        statement = (
            select(ListingRecord.source, ListingRecord.external_id, ListingReactionRecord.reaction)
            .join(ListingRecord, ListingRecord.id == ListingReactionRecord.listing_id)
            .where(ListingReactionRecord.user_id == user_id)
        )
        rows = await self._session.execute(statement)
        return {
            ListingKey(source, external_id): Reaction(reaction)
            for source, external_id, reaction in rows
        }

    async def react(
        self, user_id: UUID, key: ListingKey, reaction: Reaction, reacted_at: datetime
    ) -> bool:
        listing_id = await self._listing_id(key)
        if listing_id is None:
            return False
        statement = insert(ListingReactionRecord).values(
            user_id=user_id,
            listing_id=listing_id,
            reaction=reaction.value,
            reacted_at=reacted_at,
        )
        await self._session.execute(
            statement.on_conflict_do_update(
                index_elements=[ListingReactionRecord.user_id, ListingReactionRecord.listing_id],
                set_={"reaction": statement.excluded.reaction, "reacted_at": reacted_at},
            )
        )
        return True

    async def clear(self, user_id: UUID, key: ListingKey) -> None:
        listing_id = await self._listing_id(key)
        if listing_id is None:
            return
        await self._session.execute(
            delete(ListingReactionRecord).where(
                ListingReactionRecord.user_id == user_id,
                ListingReactionRecord.listing_id == listing_id,
            )
        )

    async def _listing_id(self, key: ListingKey) -> int | None:
        statement = select(ListingRecord.id).where(
            ListingRecord.source == key.source, ListingRecord.external_id == key.external_id
        )
        return await self._session.scalar(statement)
