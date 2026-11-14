from typing import Any
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from tests.integration.api.api_helpers import authorized

ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1"
SUBSCRIPTION = {"endpoint": ENDPOINT, "keys": {"p256dh": "B" + "x" * 86, "auth": "a" * 22}}


async def endpoints_of(
    session_factory: async_sessionmaker[AsyncSession], user_id: UUID
) -> list[str]:
    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        subscriptions = await unit_of_work.push_subscriptions.list_for_user(user_id)
    return [subscription.endpoint for subscription in subscriptions]


async def test_subscribes_and_unsubscribes_a_device(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    user_id = uuid4()

    subscribed = await client.put(
        "/me/push-subscription", json=SUBSCRIPTION, headers=authorized(user_id)
    )
    after_subscribe = await endpoints_of(session_factory, user_id)
    unsubscribed = await client.request(
        "DELETE", "/me/push-subscription", json={"endpoint": ENDPOINT}, headers=authorized(user_id)
    )

    assert subscribed.status_code == unsubscribed.status_code == 204
    assert after_subscribe == [ENDPOINT]
    assert await endpoints_of(session_factory, user_id) == []


async def test_one_user_cannot_unsubscribe_another_users_device(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    owner = uuid4()
    await client.put("/me/push-subscription", json=SUBSCRIPTION, headers=authorized(owner))

    await client.request(
        "DELETE", "/me/push-subscription", json={"endpoint": ENDPOINT}, headers=authorized(uuid4())
    )

    assert await endpoints_of(session_factory, owner) == [ENDPOINT]


@pytest.mark.parametrize(
    "body",
    [
        {**SUBSCRIPTION, "endpoint": "https://169.254.169.254/latest/meta-data"},
        {**SUBSCRIPTION, "endpoint": "http://fcm.googleapis.com/fcm/send/x"},
        {**SUBSCRIPTION, "keys": {"p256dh": "short", "auth": "a" * 22}},
        {**SUBSCRIPTION, "expirationTime": None},
    ],
    ids=["internal-host", "plain-http", "bad-key", "extra-field"],
)
async def test_rejects_subscriptions_outside_the_push_services(
    client: httpx.AsyncClient, body: dict[str, Any]
) -> None:
    response = await client.put("/me/push-subscription", json=body, headers=authorized(uuid4()))

    assert response.status_code == 422
    assert "169.254" not in response.text


async def test_subscribing_needs_a_token(client: httpx.AsyncClient) -> None:
    response = await client.put("/me/push-subscription", json=SUBSCRIPTION)

    assert response.status_code == 401
