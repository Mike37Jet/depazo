import json
import struct
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

import pytest
from typer.testing import CliRunner

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.infrastructure.sources.capture.capture_file import (
    MAX_CAPTURE_MESSAGE_BYTES,
    MAX_CAPTURE_MESSAGE_LISTINGS,
)
from depazo.presentation.cli.main import app
from tests.builders import a_capture, a_captured_listing, a_native_message
from tests.fakes import InMemoryUnitOfWork

runner = CliRunner()
INVALID_CAPTURE = {"ok": False, "error": "invalid_capture"}
UNAVAILABLE = {"ok": False, "error": "unavailable"}
DATABASE_PASSWORD = "database-password-that-must-not-leak"  # noqa: S105
UNREACHABLE_DATABASE_URL = f"postgresql://depazo:{DATABASE_PASSWORD}@127.0.0.1:1/depazo"


def the_only_reply(stdout: bytes) -> dict[str, object]:
    (declared_length,) = struct.unpack("=I", stdout[:4])
    assert declared_length == len(stdout) - 4
    reply = json.loads(stdout[4:].decode("utf-8"))
    assert isinstance(reply, dict)
    return reply


@pytest.fixture
def storage(monkeypatch: pytest.MonkeyPatch) -> InMemoryUnitOfWork:
    unit_of_work = InMemoryUnitOfWork()

    @asynccontextmanager
    async def open_in_memory_factory() -> AsyncIterator[Callable[[], UnitOfWork]]:
        yield lambda: unit_of_work

    monkeypatch.setattr(
        "depazo.presentation.cli.main.open_unit_of_work_factory", open_in_memory_factory
    )
    return unit_of_work


def test_saves_the_capture_and_replies_with_the_counts(storage: InMemoryUnitOfWork) -> None:
    message = a_native_message(
        a_capture(a_captured_listing(externalId="1"), a_captured_listing(externalId="2"))
    )

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert result.exit_code == 0
    assert the_only_reply(result.stdout_bytes) == {
        "ok": True,
        "new": 2,
        "repriced": 0,
        "unchanged": 0,
    }
    assert set(storage.listings.saved) == {("plusvalia", "1"), ("plusvalia", "2")}
    assert storage.committed


def test_replies_with_repriced_and_unchanged_counts_on_the_next_capture(
    storage: InMemoryUnitOfWork,
) -> None:
    first = a_capture(a_captured_listing(externalId="1"), a_captured_listing(externalId="2"))
    second = a_capture(
        a_captured_listing(externalId="1", monthlyRentUsd=950), a_captured_listing(externalId="2")
    )
    runner.invoke(app, ["receive-capture"], input=a_native_message(first))

    result = runner.invoke(app, ["receive-capture"], input=a_native_message(second))

    assert the_only_reply(result.stdout_bytes) == {
        "ok": True,
        "new": 0,
        "repriced": 1,
        "unchanged": 1,
    }


def test_accepts_a_capture_without_listings(storage: InMemoryUnitOfWork) -> None:
    result = runner.invoke(app, ["receive-capture"], input=a_native_message(a_capture()))

    assert the_only_reply(result.stdout_bytes) == {
        "ok": True,
        "new": 0,
        "repriced": 0,
        "unchanged": 0,
    }


def test_writes_diagnostics_only_to_stderr(storage: InMemoryUnitOfWork) -> None:
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(result.stdout_bytes)["ok"] is True
    assert "saved: 1 new" in result.stderr


def test_ignores_what_follows_the_first_message(storage: InMemoryUnitOfWork) -> None:
    message = a_native_message(a_capture(a_captured_listing())) + b"trailing bytes"

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(result.stdout_bytes)["ok"] is True


@pytest.mark.parametrize(
    "message",
    [
        b"",
        b"\x02\x00",
        a_native_message(b"")[:4],
        a_native_message(a_capture(a_captured_listing()))[:-5],
        a_native_message(b"\xff\xfe\xfd"),
        a_native_message(b"not json"),
        a_native_message(b'{"hello": "world"}'),
        a_native_message(a_capture(a_captured_listing(advertiserPhone="0999999999"))),
    ],
)
def test_replies_with_a_generic_code_for_an_invalid_message(
    message: bytes, storage: InMemoryUnitOfWork
) -> None:
    result = runner.invoke(app, ["receive-capture"], input=message)

    assert result.exit_code == 0
    assert the_only_reply(result.stdout_bytes) == INVALID_CAPTURE
    assert storage.listings.saved == {}


def test_rejects_an_oversized_message_by_its_declared_length(storage: InMemoryUnitOfWork) -> None:
    message = struct.pack("=I", MAX_CAPTURE_MESSAGE_BYTES + 1)

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(result.stdout_bytes) == INVALID_CAPTURE


def test_rejects_listings_from_other_sources(storage: InMemoryUnitOfWork) -> None:
    marketplace = a_captured_listing(
        source="marketplace", url="https://www.facebook.com/marketplace/item/1/", imageUrl=None
    )
    message = a_native_message(a_capture(a_captured_listing(), marketplace))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(result.stdout_bytes) == INVALID_CAPTURE
    assert storage.listings.saved == {}


def test_rejects_more_listings_than_one_message_may_carry(storage: InMemoryUnitOfWork) -> None:
    records = [
        a_captured_listing(externalId=str(number))
        for number in range(MAX_CAPTURE_MESSAGE_LISTINGS + 1)
    ]

    result = runner.invoke(app, ["receive-capture"], input=a_native_message(a_capture(*records)))

    assert the_only_reply(result.stdout_bytes) == INVALID_CAPTURE
    assert storage.listings.saved == {}


def test_replies_unavailable_when_the_database_is_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("DEPAZO_DATABASE_URL", raising=False)
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert result.exit_code == 0
    assert the_only_reply(result.stdout_bytes) == UNAVAILABLE


def test_replies_unavailable_without_details_when_the_database_is_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", UNREACHABLE_DATABASE_URL)
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert result.exit_code == 0
    assert the_only_reply(result.stdout_bytes) == UNAVAILABLE
    assert "127.0.0.1" not in result.stderr
    assert DATABASE_PASSWORD not in result.stderr


def test_replies_unavailable_without_details_when_saving_fails_unexpectedly(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "DEPAZO_DATABASE_URL", f"postgresql://depazo:{DATABASE_PASSWORD}@127.0.0.1:notaport/depazo"
    )
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert result.exit_code == 0
    assert the_only_reply(result.stdout_bytes) == UNAVAILABLE
    assert "capture not saved" in result.stderr
    assert DATABASE_PASSWORD not in result.stderr


def test_saves_a_listing_whose_title_carries_a_null_character(
    storage: InMemoryUnitOfWork,
) -> None:
    message = a_native_message(a_capture(a_captured_listing(title="Depto\u0000amoblado")))

    result = runner.invoke(app, ["receive-capture"], input=message)

    assert the_only_reply(result.stdout_bytes)["ok"] is True
    saved_listing, _ = storage.listings.saved["plusvalia", "151448881"]
    assert saved_listing.title == "Depto amoblado"


def test_replies_unavailable_when_push_is_requested_but_not_configured(
    storage: InMemoryUnitOfWork, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("DEPAZO_VAPID_PRIVATE_KEY", raising=False)
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(app, ["receive-capture", "--notify-users"], input=message)

    assert the_only_reply(result.stdout_bytes) == UNAVAILABLE
    assert storage.listings.saved == {}


def test_rejects_the_extension_origin_as_an_argument_without_replying() -> None:
    message = a_native_message(a_capture(a_captured_listing()))

    result = runner.invoke(
        app,
        ["receive-capture", "chrome-extension://fabgniffhpmdifgbdlgjchjchgfjcldm/"],
        input=message,
    )

    assert result.exit_code == 2
    assert result.stdout_bytes == b""
