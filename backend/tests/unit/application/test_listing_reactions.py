from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

from depazo.application.use_cases.rank_user_matches import (
    ListSavedListings,
    RankUserMatches,
    SearchProfileNotFoundError,
)
from depazo.application.use_cases.react_to_listing import (
    ClearListingReaction,
    ListingNotFoundError,
    ReactToListing,
)
from depazo.domain.listing_reaction import ListingKey, Reaction
from tests.builders import a_listing, a_profile
from tests.fakes import InMemoryUnitOfWork

NOW = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
CHEAP = ListingKey("test-source", "cheap")
PRICEY = ListingKey("test-source", "pricey")


async def a_unit_of_work_with_listings() -> InMemoryUnitOfWork:
    unit_of_work = InMemoryUnitOfWork()
    await unit_of_work.listings.save(
        a_listing(external_id="cheap", monthly_rent_usd=Decimal(600)), NOW
    )
    await unit_of_work.listings.save(
        a_listing(external_id="pricey", monthly_rent_usd=Decimal(5000)), NOW
    )
    return unit_of_work


async def test_discarded_listings_leave_the_users_matches() -> None:
    unit_of_work = await a_unit_of_work_with_listings()
    owner = uuid4()
    await unit_of_work.search_profiles.save_for_user(owner, a_profile(min_score=0), NOW)

    await ReactToListing(lambda: unit_of_work, lambda: NOW).execute(
        owner, CHEAP, Reaction.DISCARDED
    )
    report = await RankUserMatches(lambda: unit_of_work).execute(owner)

    assert report.ranking.matches == ()
    assert report.discarded_count == 1
    assert report.ranking.evaluated_count == 1
    assert unit_of_work.committed


async def test_one_users_discards_never_hide_listings_from_another_user() -> None:
    unit_of_work = await a_unit_of_work_with_listings()
    owner, other = uuid4(), uuid4()
    await unit_of_work.search_profiles.save_for_user(other, a_profile(min_score=0), NOW)

    await ReactToListing(lambda: unit_of_work, lambda: NOW).execute(
        owner, CHEAP, Reaction.DISCARDED
    )
    report = await RankUserMatches(lambda: unit_of_work).execute(other)

    assert report.discarded_count == 0
    assert len(report.ranking.matches) == 1


async def test_marks_the_matches_the_user_saved() -> None:
    unit_of_work = await a_unit_of_work_with_listings()
    owner = uuid4()
    await unit_of_work.search_profiles.save_for_user(owner, a_profile(min_score=0), NOW)

    await ReactToListing(lambda: unit_of_work, lambda: NOW).execute(owner, CHEAP, Reaction.SAVED)
    report = await RankUserMatches(lambda: unit_of_work).execute(owner)

    assert report.saved_keys == frozenset({CHEAP})


async def test_lists_saved_listings_even_when_they_fail_the_filters() -> None:
    unit_of_work = await a_unit_of_work_with_listings()
    owner = uuid4()
    await unit_of_work.search_profiles.save_for_user(owner, a_profile(), NOW)
    react = ReactToListing(lambda: unit_of_work, lambda: NOW)

    await react.execute(owner, PRICEY, Reaction.SAVED)
    await react.execute(owner, CHEAP, Reaction.SAVED)
    saved = await ListSavedListings(lambda: unit_of_work).execute(owner)

    assert [candidate.listing.external_id for candidate in saved] == ["cheap", "pricey"]
    assert not saved[1].result.passed_hard_filters


async def test_clearing_a_reaction_brings_the_listing_back() -> None:
    unit_of_work = await a_unit_of_work_with_listings()
    owner = uuid4()
    await unit_of_work.search_profiles.save_for_user(owner, a_profile(min_score=0), NOW)
    await ReactToListing(lambda: unit_of_work, lambda: NOW).execute(
        owner, CHEAP, Reaction.DISCARDED
    )

    await ClearListingReaction(lambda: unit_of_work).execute(owner, CHEAP)
    report = await RankUserMatches(lambda: unit_of_work).execute(owner)

    assert report.discarded_count == 0
    assert len(report.ranking.matches) == 1


async def test_refuses_reactions_to_unknown_listings() -> None:
    unit_of_work = await a_unit_of_work_with_listings()

    with pytest.raises(ListingNotFoundError):
        await ReactToListing(lambda: unit_of_work, lambda: NOW).execute(
            uuid4(), ListingKey("test-source", "missing"), Reaction.SAVED
        )

    assert not unit_of_work.committed


async def test_asks_for_a_profile_before_listing_saved_listings() -> None:
    with pytest.raises(SearchProfileNotFoundError):
        await ListSavedListings(InMemoryUnitOfWork).execute(uuid4())
