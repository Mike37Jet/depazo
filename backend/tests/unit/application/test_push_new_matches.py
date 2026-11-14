from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from depazo.application.use_cases.manage_push_subscription import (
    SubscribeToPush,
    UnsubscribeFromPush,
)
from depazo.application.use_cases.push_new_matches import PushNewMatches
from depazo.application.use_cases.record_listings import RecordingSummary
from depazo.domain.listing import Listing
from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.domain.push_subscription import PushSubscription
from tests.builders import a_listing, a_profile
from tests.fakes import InMemoryUnitOfWork, RecordingPushSender

NOW = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
KEYS = {"p256dh": "B" + "x" * 86, "auth": "aGVsbG8tYXV0aC1zZWNyZXQ"}
CHEAP = a_listing(external_id="cheap", monthly_rent_usd=Decimal(600), condo_fee_usd=Decimal(50))
PRICEY = a_listing(external_id="pricey", monthly_rent_usd=Decimal(5000))


def a_subscription(name: str) -> PushSubscription:
    return PushSubscription(endpoint=f"https://fcm.googleapis.com/fcm/send/{name}", **KEYS)


def a_summary(*new_listings: Listing, repriced: tuple[Listing, ...] = ()) -> RecordingSummary:
    return RecordingSummary(
        new_listings=new_listings, repriced_listings=repriced, unchanged_count=0
    )


async def a_subscribed_user(
    unit_of_work: InMemoryUnitOfWork, name: str, min_score: int = 0
) -> UUID:
    user_id = uuid4()
    await unit_of_work.search_profiles.save_for_user(user_id, a_profile(min_score=min_score), NOW)
    await SubscribeToPush(lambda: unit_of_work, lambda: NOW).execute(user_id, a_subscription(name))
    return user_id


async def test_tells_each_subscribed_user_about_their_new_matches() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await a_subscribed_user(unit_of_work, "phone")
    sender = RecordingPushSender()

    report = await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(CHEAP))

    assert report.notified_users == 1
    assert report.delivered_count == 1
    _, message = sender.sent[0]
    assert message.title == "Nuevo departamento para ti"
    assert message.body.startswith("La Carolina · $650/mes · ")
    assert message.body.endswith(" puntos")
    assert message.url == "/"


async def test_summarizes_several_matches_with_the_best_one() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await a_subscribed_user(unit_of_work, "phone")
    sender = RecordingPushSender()
    other = a_listing(external_id="other", neighborhood="Cumbayá", monthly_rent_usd=Decimal(850))

    await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(other, CHEAP))

    _, message = sender.sent[0]
    assert message.title == "2 departamentos nuevos para ti"
    assert message.body.startswith("El mejor: La Carolina · $650/mes")


async def test_skips_listings_that_miss_the_users_filters_or_minimum() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await a_subscribed_user(unit_of_work, "strict", min_score=100)
    sender = RecordingPushSender()

    report = await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(PRICEY, CHEAP))

    assert report.notified_users == 0
    assert sender.sent == []


async def test_skips_listings_the_user_discarded() -> None:
    unit_of_work = InMemoryUnitOfWork()
    user_id = await a_subscribed_user(unit_of_work, "phone")
    await unit_of_work.listings.save(CHEAP, NOW)
    await unit_of_work.listing_reactions.react(
        user_id, ListingKey.of(CHEAP), Reaction.DISCARDED, NOW
    )
    sender = RecordingPushSender()

    await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(CHEAP))

    assert sender.sent == []


async def test_names_a_new_price_when_only_the_price_changed() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await a_subscribed_user(unit_of_work, "phone")
    sender = RecordingPushSender()

    await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(repriced=(CHEAP,)))

    assert sender.sent[0][1].title == "Cambió el precio de un departamento"


async def test_ignores_users_without_devices() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await unit_of_work.search_profiles.save_for_user(uuid4(), a_profile(min_score=0), NOW)
    sender = RecordingPushSender()

    report = await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(CHEAP))

    assert report.notified_users == 0


async def test_forgets_devices_the_push_service_no_longer_knows() -> None:
    unit_of_work = InMemoryUnitOfWork()
    user_id = await a_subscribed_user(unit_of_work, "old-phone")
    sender = RecordingPushSender(gone_endpoints=frozenset({a_subscription("old-phone").endpoint}))

    report = await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary(CHEAP))

    assert report.removed_count == 1
    assert await unit_of_work.push_subscriptions.list_for_user(user_id) == []


async def test_does_nothing_when_no_listing_is_new() -> None:
    unit_of_work = InMemoryUnitOfWork()
    await a_subscribed_user(unit_of_work, "phone")
    sender = RecordingPushSender()

    report = await PushNewMatches(lambda: unit_of_work, sender).execute(a_summary())

    assert report.notified_users == 0


async def test_a_user_can_only_unsubscribe_their_own_device() -> None:
    unit_of_work = InMemoryUnitOfWork()
    owner = await a_subscribed_user(unit_of_work, "phone")

    await UnsubscribeFromPush(lambda: unit_of_work).execute(
        uuid4(), a_subscription("phone").endpoint
    )

    assert len(await unit_of_work.push_subscriptions.list_for_user(owner)) == 1
