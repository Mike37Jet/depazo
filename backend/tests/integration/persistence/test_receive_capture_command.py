import asyncio

import httpx
import pytest
import respx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typer.testing import CliRunner

from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from depazo.presentation.cli.main import app
from tests.builders import a_capture, a_captured_listing, a_native_message
from tests.integration.cli.test_receive_capture_command import the_only_reply
from tests.integration.persistence.test_push_command import (
    ENDPOINT,
    a_vapid_private_key,
    subscribe_a_user,
)

runner = CliRunner()


def test_replies_with_new_then_unchanged_counts_when_receiving_twice(
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    message = a_native_message(
        a_capture(a_captured_listing(externalId="1"), a_captured_listing(externalId="2"))
    )

    first_run = runner.invoke(app, ["receive-capture"], input=message)
    second_run = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(first_run.stdout_bytes) == {
        "ok": True,
        "new": 2,
        "repriced": 0,
        "unchanged": 0,
    }
    assert the_only_reply(second_run.stdout_bytes) == {
        "ok": True,
        "new": 0,
        "repriced": 0,
        "unchanged": 2,
    }


async def test_stores_captured_listings_without_phone_numbers(
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    record = a_captured_listing(title="Suite amoblada 0989028226")

    await asyncio.to_thread(
        runner.invoke, app, ["receive-capture"], input=a_native_message(a_capture(record))
    )

    async with SqlAlchemyUnitOfWork(session_factory) as unit_of_work:
        stored = await unit_of_work.listings.find("plusvalia", "151448881")
    assert stored is not None
    assert stored.title == "Suite amoblada"


@respx.mock
def test_pushes_new_matches_once_and_not_on_the_next_delivery(
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    monkeypatch.setenv("DEPAZO_VAPID_PRIVATE_KEY", a_vapid_private_key())
    asyncio.run(subscribe_a_user(database_url))
    push_service = respx.post(ENDPOINT).mock(return_value=httpx.Response(201))
    message = a_native_message(a_capture(a_captured_listing()))
    command = ["receive-capture", "--notify-users"]

    first_run = runner.invoke(app, command, input=message)
    second_run = runner.invoke(app, command, input=message)

    assert the_only_reply(first_run.stdout_bytes)["new"] == 1
    assert the_only_reply(second_run.stdout_bytes)["unchanged"] == 1
    assert "pushed: 1 users, 1 devices" in first_run.stderr
    assert push_service.call_count == 1
