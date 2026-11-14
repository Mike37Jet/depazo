import base64

import httpx
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from depazo.application.ports.push_sender import PushDelivery, PushMessage
from depazo.domain.push_subscription import PushSubscription
from depazo.infrastructure.notifications.web_push_sender import (
    PushNotConfiguredError,
    WebPushSender,
    WebPushSettings,
    web_push_settings_from_environment,
)

ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1"
MESSAGE = PushMessage(title="Nuevo departamento para ti", body="La Carolina", url="/")


def encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def a_vapid_private_key() -> str:
    key = ec.generate_private_key(ec.SECP256R1())
    return encode(key.private_numbers().private_value.to_bytes(32, "big"))


def a_subscription() -> PushSubscription:
    browser_key = ec.generate_private_key(ec.SECP256R1()).public_key()
    p256dh = browser_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return PushSubscription(endpoint=ENDPOINT, p256dh=encode(p256dh), auth=encode(b"0" * 16))


def settings() -> WebPushSettings:
    return WebPushSettings.model_validate({"DEPAZO_VAPID_PRIVATE_KEY": a_vapid_private_key()})


@respx.mock
async def test_posts_an_encrypted_message_signed_with_vapid() -> None:
    route = respx.post(ENDPOINT).mock(return_value=httpx.Response(201))

    async with WebPushSender(settings()) as sender:
        delivery = await sender.send(a_subscription(), MESSAGE)

    request = route.calls.last.request
    assert delivery is PushDelivery.DELIVERED
    assert request.headers["Content-Encoding"] == "aes128gcm"
    assert request.headers["Authorization"].startswith("vapid t=")
    assert b"La Carolina" not in request.content


@pytest.mark.parametrize("status", [404, 410])
@respx.mock
async def test_reports_devices_the_push_service_forgot(status: int) -> None:
    respx.post(ENDPOINT).mock(return_value=httpx.Response(status))

    async with WebPushSender(settings()) as sender:
        delivery = await sender.send(a_subscription(), MESSAGE)

    assert delivery is PushDelivery.GONE


@respx.mock
async def test_reports_failures_without_raising() -> None:
    respx.post(ENDPOINT).mock(side_effect=httpx.ConnectError("offline"))

    async with WebPushSender(settings()) as sender:
        delivery = await sender.send(a_subscription(), MESSAGE)

    assert delivery is PushDelivery.FAILED


def test_explains_how_to_configure_push(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEPAZO_VAPID_PRIVATE_KEY", raising=False)

    with pytest.raises(PushNotConfiguredError):
        web_push_settings_from_environment()
