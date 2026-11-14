from decimal import Decimal
from typing import Any
from uuid import uuid4

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.integration.api.api_helpers import REQUESTS_PER_WINDOW, authorized, save_listings

PROFILE = {
    "max_monthly_cost_usd": 900,
    "min_bedrooms": 2,
    "preferred_neighborhoods": ["La Carolina"],
    "min_score": 0,
}


async def test_health_needs_no_token(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer not-a-token"}, {"Authorization": "Basic dXNlcjpwYXNz"}],
    ids=["missing", "malformed", "wrong-scheme"],
)
async def test_rejects_requests_without_a_valid_token(
    client: httpx.AsyncClient, headers: dict[str, str]
) -> None:
    response = await client.get("/me/search-profile", headers=headers)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


async def test_reports_a_missing_profile(client: httpx.AsyncClient) -> None:
    response = await client.get("/me/search-profile", headers=authorized(uuid4()))

    assert response.status_code == 404


async def test_saves_and_reads_back_the_search_profile(client: httpx.AsyncClient) -> None:
    headers = authorized(uuid4())

    saved = await client.put("/me/search-profile", json=PROFILE, headers=headers)
    read = await client.get("/me/search-profile", headers=headers)

    assert saved.status_code == 200
    assert read.json() == saved.json()
    assert read.json()["max_monthly_cost_usd"] == 900
    assert read.json()["preferred_neighborhoods"] == ["La Carolina"]


async def test_one_user_cannot_read_or_overwrite_another_users_profile(
    client: httpx.AsyncClient,
) -> None:
    owner, intruder = authorized(uuid4()), authorized(uuid4())
    await client.put("/me/search-profile", json=PROFILE, headers=owner)

    intruder_read = await client.get("/me/search-profile", headers=intruder)
    intruder_matches = await client.get("/me/matches", headers=intruder)
    await client.put(
        "/me/search-profile", json={**PROFILE, "max_monthly_cost_usd": 5000}, headers=intruder
    )
    owner_read = await client.get("/me/search-profile", headers=owner)

    assert intruder_read.status_code == 404
    assert intruder_matches.status_code == 404
    assert owner_read.json()["max_monthly_cost_usd"] == 900


async def test_ranks_saved_listings_against_the_users_profile(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await save_listings(
        session_factory,
        {"external_id": "cheap", "monthly_rent_usd": Decimal(600), "condo_fee_usd": Decimal(50)},
        {"external_id": "pricey", "monthly_rent_usd": Decimal(820), "condo_fee_usd": Decimal(60)},
        {"external_id": "too-expensive", "monthly_rent_usd": Decimal(1500)},
    )
    headers = authorized(uuid4())
    await client.put("/me/search-profile", json=PROFILE, headers=headers)

    response = await client.get("/me/matches", params={"limit": 5}, headers=headers)

    body = response.json()
    assert response.status_code == 200
    assert [match["listing"]["external_id"] for match in body["matches"]] == ["cheap", "pricey"]
    assert body["match_count"] == 2
    assert body["evaluated_count"] == 3
    assert body["rejected_count"] == 1
    assert {item["criterion"] for item in body["matches"][0]["breakdown"]} >= {"price"}


async def test_limits_the_number_of_matches_returned(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await save_listings(session_factory, *({"external_id": f"listing-{n}"} for n in range(3)))
    headers = authorized(uuid4())
    await client.put("/me/search-profile", json=PROFILE, headers=headers)

    response = await client.get("/me/matches", params={"limit": 2}, headers=headers)

    assert len(response.json()["matches"]) == 2
    assert response.json()["match_count"] == 3


@pytest.mark.parametrize(
    "body",
    [
        {**PROFILE, "is_admin": True},
        {**PROFILE, "max_monthly_cost_usd": -1},
        {**PROFILE, "preferred_neighborhoods": ["x" * 121]},
        {**PROFILE, "min_monthly_cost_usd": 1000},
    ],
    ids=["extra-field", "negative-budget", "long-neighborhood", "min-above-max"],
)
async def test_rejects_invalid_profiles(client: httpx.AsyncClient, body: dict[str, Any]) -> None:
    response = await client.put("/me/search-profile", json=body, headers=authorized(uuid4()))

    assert response.status_code == 422


async def test_validation_errors_do_not_echo_the_submitted_input(
    client: httpx.AsyncClient,
) -> None:
    submitted_value = "<script>alert(1)</script>"

    response = await client.put(
        "/me/search-profile",
        json={**PROFILE, "max_monthly_cost_usd": submitted_value},
        headers=authorized(uuid4()),
    )

    assert response.status_code == 422
    assert submitted_value not in response.text


async def test_rejects_match_pages_above_the_maximum(client: httpx.AsyncClient) -> None:
    response = await client.get("/me/matches", params={"limit": 101}, headers=authorized(uuid4()))

    assert response.status_code == 422


async def test_throttles_each_user_separately(client: httpx.AsyncClient) -> None:
    busy, quiet = authorized(uuid4()), authorized(uuid4())
    for _ in range(REQUESTS_PER_WINDOW):
        await client.get("/me/search-profile", headers=busy)

    throttled = await client.get("/me/search-profile", headers=busy)
    other = await client.get("/me/search-profile", headers=quiet)

    assert throttled.status_code == 429
    assert throttled.headers["retry-after"] == "60"
    assert other.status_code == 404


async def test_rejects_bodies_larger_than_the_limit(client: httpx.AsyncClient) -> None:
    oversized = {**PROFILE, "excluded_neighborhoods": ["x" * 100] * 200}

    response = await client.put("/me/search-profile", json=oversized, headers=authorized(uuid4()))

    assert response.status_code == 413


async def test_hides_the_api_schema_unless_published(client: httpx.AsyncClient) -> None:
    schema = await client.get("/openapi.json")
    docs = await client.get("/docs")

    assert schema.status_code == 404
    assert docs.status_code == 404
