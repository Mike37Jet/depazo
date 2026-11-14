from datetime import UTC, datetime
from decimal import Decimal

from depazo.application.use_cases.rank_listings import RankListings
from tests.builders import a_listing, a_profile
from tests.fakes import InMemoryListingRepository, InMemoryUnitOfWork

SEEN_AT = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)


async def ranking_of(*listings_by_rent: tuple[str, int], min_score: int = 0) -> list[str]:
    repository = InMemoryListingRepository()
    for external_id, rent in listings_by_rent:
        await repository.save(
            a_listing(external_id=external_id, monthly_rent_usd=Decimal(rent), condo_fee_usd=None),
            SEEN_AT,
        )
    use_case = RankListings(lambda: InMemoryUnitOfWork(repository))
    profile = a_profile(max_monthly_cost_usd=Decimal(1000), min_score=min_score)

    report = await use_case.execute(profile)

    return [match.listing.external_id for match in report.matches]


async def test_orders_matches_from_best_to_worst_score() -> None:
    assert await ranking_of(("pricey", 950), ("cheap", 650), ("middle", 800)) == [
        "cheap",
        "middle",
        "pricey",
    ]


async def test_leaves_out_listings_below_the_minimum_score() -> None:
    assert await ranking_of(("cheap", 650), ("pricey", 950), min_score=50) == ["cheap"]


async def test_counts_listings_that_failed_the_hard_filters() -> None:
    repository = InMemoryListingRepository()
    await repository.save(a_listing(external_id="over", monthly_rent_usd=Decimal(2000)), SEEN_AT)
    await repository.save(a_listing(external_id="fits", monthly_rent_usd=Decimal(700)), SEEN_AT)

    report = await RankListings(lambda: InMemoryUnitOfWork(repository)).execute(
        a_profile(min_score=0)
    )

    assert report.evaluated_count == 2
    assert report.rejected_count == 1
    assert [match.listing.external_id for match in report.matches] == ["fits"]
