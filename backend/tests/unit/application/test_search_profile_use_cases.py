from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

from depazo.application.use_cases.list_neighborhoods import ListNeighborhoods
from depazo.application.use_cases.manage_search_profile import GetSearchProfile, SaveSearchProfile
from depazo.application.use_cases.rank_user_matches import (
    RankUserMatches,
    SearchProfileNotFoundError,
)
from tests.builders import a_listing, a_profile
from tests.fakes import (
    InMemoryListingRepository,
    InMemorySearchProfileRepository,
    InMemoryUnitOfWork,
)

NOW = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)


def a_unit_of_work() -> InMemoryUnitOfWork:
    return InMemoryUnitOfWork(InMemoryListingRepository(), InMemorySearchProfileRepository())


async def test_returns_the_profile_saved_by_the_same_user() -> None:
    unit_of_work = a_unit_of_work()
    owner = uuid4()
    profile = a_profile(max_monthly_cost_usd=Decimal(850))

    await SaveSearchProfile(lambda: unit_of_work, lambda: NOW).execute(owner, profile)

    assert await GetSearchProfile(lambda: unit_of_work).execute(owner) == profile
    assert unit_of_work.committed


async def test_never_returns_another_users_profile() -> None:
    unit_of_work = a_unit_of_work()
    await SaveSearchProfile(lambda: unit_of_work, lambda: NOW).execute(uuid4(), a_profile())

    assert await GetSearchProfile(lambda: unit_of_work).execute(uuid4()) is None


async def test_ranks_listings_with_the_users_own_profile() -> None:
    unit_of_work = a_unit_of_work()
    owner = uuid4()
    await unit_of_work.listings.save(a_listing(monthly_rent_usd=Decimal(600)), NOW)
    await unit_of_work.search_profiles.save_for_user(owner, a_profile(min_score=0), NOW)

    report = await RankUserMatches(lambda: unit_of_work).execute(owner)

    assert len(report.matches) == 1


async def test_asks_for_a_profile_before_ranking() -> None:
    with pytest.raises(SearchProfileNotFoundError):
        await RankUserMatches(a_unit_of_work).execute(uuid4())


async def test_lists_neighborhoods_of_active_listings() -> None:
    unit_of_work = a_unit_of_work()
    await unit_of_work.listings.save(a_listing(neighborhood="Cumbayá"), NOW)

    summaries = await ListNeighborhoods(lambda: unit_of_work).execute()

    assert [summary.name for summary in summaries] == ["Cumbayá"]
