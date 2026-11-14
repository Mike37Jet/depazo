from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from tests.builders import a_listing

NOW = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
LATER = datetime(2026, 11, 14, 7, 0, tzinfo=UTC)
KEY = ListingKey("test-source", "listing-1")

SessionFactory = async_sessionmaker[AsyncSession]


async def save_default_listing(session_factory: SessionFactory) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listings.save(a_listing(), NOW)
        await unit_of_work.commit()


async def test_replaces_the_previous_reaction(session_factory: SessionFactory) -> None:
    await save_default_listing(session_factory)
    owner = uuid4()

    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listing_reactions.react(owner, KEY, Reaction.SAVED, NOW)
        await unit_of_work.listing_reactions.react(owner, KEY, Reaction.DISCARDED, LATER)
        await unit_of_work.commit()
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        reactions = await unit_of_work.listing_reactions.reactions_for_user(owner)

    assert reactions == {KEY: Reaction.DISCARDED}


async def test_keeps_each_users_reactions_apart(session_factory: SessionFactory) -> None:
    await save_default_listing(session_factory)
    owner, other = uuid4(), uuid4()

    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listing_reactions.react(owner, KEY, Reaction.SAVED, NOW)
        await unit_of_work.listing_reactions.clear(other, KEY)
        await unit_of_work.commit()
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        owner_reactions = await unit_of_work.listing_reactions.reactions_for_user(owner)
        other_reactions = await unit_of_work.listing_reactions.reactions_for_user(other)

    assert owner_reactions == {KEY: Reaction.SAVED}
    assert other_reactions == {}


async def test_clears_a_reaction(session_factory: SessionFactory) -> None:
    await save_default_listing(session_factory)
    owner = uuid4()

    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listing_reactions.react(owner, KEY, Reaction.SAVED, NOW)
        await unit_of_work.listing_reactions.clear(owner, KEY)
        await unit_of_work.commit()
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        reactions = await unit_of_work.listing_reactions.reactions_for_user(owner)

    assert reactions == {}


async def test_reports_unknown_listings(session_factory: SessionFactory) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        was_recorded = await unit_of_work.listing_reactions.react(
            uuid4(), ListingKey("test-source", "missing"), Reaction.SAVED, NOW
        )

    assert not was_recorded
