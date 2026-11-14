from uuid import uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.integration.api.api_helpers import authorized, save_listings


async def test_neighborhoods_need_a_token(client: httpx.AsyncClient) -> None:
    response = await client.get("/neighborhoods")

    assert response.status_code == 401


async def test_lists_known_neighborhoods_most_common_first(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await save_listings(
        session_factory,
        {"external_id": "a", "neighborhood": "Cumbayá"},
        {"external_id": "b", "neighborhood": "La Carolina"},
        {"external_id": "c", "neighborhood": "la carolina"},
        {"external_id": "d", "neighborhood": None},
    )

    response = await client.get("/neighborhoods", headers=authorized(uuid4()))

    assert response.status_code == 200
    assert response.json() == {
        "neighborhoods": [
            {"name": "La Carolina", "listing_count": 2},
            {"name": "Cumbayá", "listing_count": 1},
        ]
    }
