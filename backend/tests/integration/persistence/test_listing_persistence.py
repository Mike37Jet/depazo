from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.application.use_cases.record_listings import RecordListings
from depazo.domain.listing import GeoPoint
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from tests.builders import a_listing

FIRST_SEEN_AT = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
LATER = datetime(2026, 11, 14, 7, 0, tzinfo=UTC)
LA_CAROLINA = GeoPoint(latitude=-0.1807, longitude=-78.4836)

SessionFactory = async_sessionmaker[AsyncSession]


async def scalar(session_factory: SessionFactory, sql: str) -> object:
    async with session_factory() as session:
        return await session.scalar(text(sql))


async def test_returns_the_saved_listing_unchanged(session_factory: SessionFactory) -> None:
    listing = a_listing(monthly_rent_usd=Decimal("725.50"), location=LA_CAROLINA)

    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listings.save(listing, FIRST_SEEN_AT)
        await unit_of_work.commit()
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        found = await unit_of_work.listings.find(listing.source, listing.external_id)

    assert found == listing


async def test_keeps_first_seen_and_refreshes_last_seen(session_factory: SessionFactory) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listings.save(a_listing(), FIRST_SEEN_AT)
        await unit_of_work.listings.save(a_listing(title="Depa renovado"), LATER)
        await unit_of_work.commit()

    async with session_factory() as session:
        row = (
            await session.execute(text("SELECT title, first_seen_at, last_seen_at FROM listings"))
        ).one()

    assert row == ("Depa renovado", FIRST_SEEN_AT, LATER)


async def test_discards_changes_that_were_not_committed(session_factory: SessionFactory) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listings.save(a_listing(), FIRST_SEEN_AT)

    assert await scalar(session_factory, "SELECT count(*) FROM listings") == 0


async def test_records_price_history_across_runs(session_factory: SessionFactory) -> None:
    def record_at(moment: datetime) -> RecordListings:
        return RecordListings(lambda: SqlAlchemyUnitOfWork(session_factory), lambda: moment)

    await record_at(FIRST_SEEN_AT).execute([a_listing(monthly_rent_usd=Decimal(800))])
    summary = await record_at(LATER).execute([a_listing(monthly_rent_usd=Decimal(750))])

    assert len(summary.repriced_listings) == 1
    assert (
        await scalar(
            session_factory,
            "SELECT string_agg(monthly_rent_usd::text, ',' ORDER BY observed_at) "
            "FROM listing_price_history",
        )
        == "800.00,750.00"
    )


async def test_derives_a_geographic_point_for_spatial_queries(
    session_factory: SessionFactory,
) -> None:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        await unit_of_work.listings.save(a_listing(location=LA_CAROLINA), FIRST_SEEN_AT)
        await unit_of_work.commit()

    within_one_kilometer = await scalar(
        session_factory,
        "SELECT ST_DWithin(location, ST_MakePoint(-78.4800, -0.1800)::geography, 1000) "
        "FROM listings",
    )

    assert within_one_kilometer is True


async def test_enables_row_level_security_on_every_table(
    session_factory: SessionFactory,
) -> None:
    tables_without_rls = await scalar(
        session_factory,
        "SELECT count(*) FROM pg_class WHERE relname IN ('listings', 'listing_price_history') "
        "AND NOT relrowsecurity",
    )

    assert tables_without_rls == 0
