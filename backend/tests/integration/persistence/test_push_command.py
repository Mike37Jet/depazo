import asyncio
import base64
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typer.testing import CliRunner

from depazo.domain.push_subscription import PushSubscription
from depazo.infrastructure.persistence.database import create_database_engine
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from depazo.presentation.cli.main import app
from tests.builders import a_profile

runner = CliRunner()
NOW = datetime(2026, 11, 14, 6, 0, tzinfo=UTC)
ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1"


def encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def a_vapid_private_key() -> str:
    key = ec.generate_private_key(ec.SECP256R1())
    return encode(key.private_numbers().private_value.to_bytes(32, "big"))


def a_subscription() -> PushSubscription:
    public_key = ec.generate_private_key(ec.SECP256R1()).public_key()
    p256dh = public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return PushSubscription(endpoint=ENDPOINT, p256dh=encode(p256dh), auth=encode(b"0" * 16))


async def subscribe_a_user(database_url: str) -> None:
    engine = create_database_engine(database_url)
    user_id = uuid4()
    async with SqlAlchemyUnitOfWork(async_sessionmaker(engine)) as unit_of_work:
        profile = a_profile(max_monthly_cost_usd=Decimal(5000), min_score=0)
        await unit_of_work.search_profiles.save_for_user(user_id, profile, NOW)
        await unit_of_work.push_subscriptions.save_for_user(user_id, a_subscription(), NOW)
        await unit_of_work.commit()
    await engine.dispose()


@respx.mock
def test_pushes_new_matches_once_and_not_on_the_next_run(
    browser_capture_path: Path,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    monkeypatch.setenv("DEPAZO_VAPID_PRIVATE_KEY", a_vapid_private_key())
    asyncio.run(subscribe_a_user(database_url))
    push_service = respx.post(ENDPOINT).mock(return_value=httpx.Response(201))
    command = ["import", str(browser_capture_path), "--save", "--notify-users"]

    first_run = runner.invoke(app, command)
    second_run = runner.invoke(app, command)

    assert "pushed: 1 users, 1 devices" in first_run.stderr
    assert "pushed: 0 users" in second_run.stderr
    assert push_service.call_count == 1


def test_notifying_users_needs_save(browser_capture_path: Path) -> None:
    result = runner.invoke(app, ["import", str(browser_capture_path), "--notify-users"])

    assert result.exit_code == 1
    assert "--notify-users needs --save" in result.stderr
