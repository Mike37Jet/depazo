from collections.abc import AsyncIterator, Sequence
from decimal import Decimal

from depazo.application.ports.listing_source import SourceBlockedError
from depazo.application.use_cases.collect_listings import CollectListings
from depazo.domain.listing import Listing
from tests.builders import a_listing


class FakeListingSource:
    def __init__(self, listings: Sequence[Listing], blocks_after: int | None = None) -> None:
        self._listings = listings
        self._blocks_after = blocks_after

    @property
    def name(self) -> str:
        return "fake"

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        for position, listing in enumerate(self._listings):
            if self._blocks_after is not None and position >= self._blocks_after:
                raise SourceBlockedError("blocked")
            yield listing


async def test_removes_duplicated_listings_by_external_id() -> None:
    source = FakeListingSource(
        [a_listing(external_id="a"), a_listing(external_id="a"), a_listing(external_id="b")]
    )

    report = await CollectListings(source).execute(max_pages=1)

    assert [listing.external_id for listing in report.listings] == ["a", "b"]


async def test_keeps_collected_listings_when_source_blocks() -> None:
    source = FakeListingSource(
        [a_listing(external_id="a"), a_listing(external_id="b")], blocks_after=1
    )

    report = await CollectListings(source).execute(max_pages=1)

    assert report.was_blocked
    assert [listing.external_id for listing in report.listings] == ["a"]


async def test_reports_source_name() -> None:
    report = await CollectListings(FakeListingSource([])).execute(max_pages=1)

    assert report.source == "fake"
    assert not report.was_blocked


async def test_keeps_listings_with_the_same_id_from_different_sources() -> None:
    source = FakeListingSource(
        [
            a_listing(source="plusvalia", external_id="1"),
            a_listing(source="marketplace", external_id="1"),
        ]
    )

    report = await CollectListings(source).execute(max_pages=1)

    assert len(report.listings) == 2


async def test_discards_listings_with_implausible_rent() -> None:
    source = FakeListingSource(
        [
            a_listing(external_id="sale", monthly_rent_usd=Decimal(220_000)),
            a_listing(external_id="junk", monthly_rent_usd=Decimal(10)),
            a_listing(external_id="rental", monthly_rent_usd=Decimal(900)),
            a_listing(external_id="no-price", monthly_rent_usd=None),
        ]
    )

    report = await CollectListings(source).execute(max_pages=1)

    assert [listing.external_id for listing in report.listings] == ["rental", "no-price"]
    assert report.discarded_count == 2
