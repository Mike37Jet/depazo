from decimal import Decimal

from depazo.application.dto.listing_alert import AlertKind
from depazo.application.use_cases.alert_matching_listings import AlertMatchingListings
from depazo.application.use_cases.record_listings import RecordingSummary
from depazo.domain.listing import Listing
from tests.builders import a_listing, a_profile
from tests.fakes import RecordingNotifier

PROFILE = a_profile(max_monthly_cost_usd=Decimal(1000), min_score=50)


def a_rental(external_id: str, rent: int) -> Listing:
    return a_listing(external_id=external_id, monthly_rent_usd=Decimal(rent), condo_fee_usd=None)


def a_summary(*, new: int = 0, repriced: int = 0, new_rent: int = 650) -> RecordingSummary:
    return RecordingSummary(
        new_listings=tuple(a_rental(f"new-{n}", new_rent) for n in range(new)),
        repriced_listings=tuple(a_rental(f"repriced-{n}", 600) for n in range(repriced)),
        unchanged_count=0,
    )


async def test_sends_one_digest_with_new_and_repriced_matches_best_first() -> None:
    notifier = RecordingNotifier()

    alerts = await AlertMatchingListings(notifier).execute(a_summary(new=1, repriced=1), PROFILE)

    assert len(notifier.batches) == 1
    assert [alert.kind for alert in alerts] == [AlertKind.NEW_PRICE, AlertKind.NEW]
    assert alerts[0].result.total > alerts[1].result.total


async def test_skips_listings_below_the_minimum_score() -> None:
    notifier = RecordingNotifier()

    alerts = await AlertMatchingListings(notifier).execute(a_summary(new=2, new_rent=950), PROFILE)

    assert alerts == ()
    assert notifier.batches == []


async def test_sends_nothing_when_nothing_is_new() -> None:
    notifier = RecordingNotifier()

    await AlertMatchingListings(notifier).execute(a_summary(), PROFILE)

    assert notifier.batches == []
