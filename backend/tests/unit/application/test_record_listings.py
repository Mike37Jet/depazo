from datetime import UTC, datetime
from decimal import Decimal

from depazo.application.use_cases.record_listings import RecordListings
from tests.builders import a_listing
from tests.fakes import InMemoryListingRepository, InMemoryUnitOfWork

FIRST_RUN_AT = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
SECOND_RUN_AT = datetime(2026, 11, 14, 7, 0, tzinfo=UTC)


def a_use_case(
    repository: InMemoryListingRepository, now: datetime = FIRST_RUN_AT
) -> tuple[RecordListings, InMemoryUnitOfWork]:
    unit_of_work = InMemoryUnitOfWork(repository)
    return RecordListings(lambda: unit_of_work, lambda: now), unit_of_work


async def test_reports_listings_seen_for_the_first_time_as_new() -> None:
    repository = InMemoryListingRepository()
    use_case, unit_of_work = a_use_case(repository)

    summary = await use_case.execute([a_listing(external_id="a"), a_listing(external_id="b")])

    assert [listing.external_id for listing in summary.new_listings] == ["a", "b"]
    assert unit_of_work.committed


async def test_stores_the_first_price_of_a_new_listing() -> None:
    repository = InMemoryListingRepository()
    use_case, _ = a_use_case(repository)

    await use_case.execute([a_listing(monthly_rent_usd=Decimal(800))])

    assert [(listing.monthly_rent_usd, at) for listing, at in repository.price_history] == [
        (Decimal(800), FIRST_RUN_AT)
    ]


async def test_reports_a_listing_whose_rent_changed() -> None:
    repository = InMemoryListingRepository()
    await a_use_case(repository)[0].execute([a_listing(monthly_rent_usd=Decimal(800))])
    use_case, _ = a_use_case(repository, SECOND_RUN_AT)

    summary = await use_case.execute([a_listing(monthly_rent_usd=Decimal(750))])

    assert [listing.monthly_rent_usd for listing in summary.repriced_listings] == [Decimal(750)]
    assert len(repository.price_history) == 2


async def test_only_refreshes_last_seen_for_unchanged_listings() -> None:
    repository = InMemoryListingRepository()
    await a_use_case(repository)[0].execute([a_listing()])
    use_case, _ = a_use_case(repository, SECOND_RUN_AT)

    summary = await use_case.execute([a_listing()])

    assert summary.unchanged_count == 1
    assert summary.new_listings == ()
    assert len(repository.price_history) == 1
    assert repository.saved[("test-source", "listing-1")][1] == SECOND_RUN_AT
