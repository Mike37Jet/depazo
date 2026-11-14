import json
import time
from typing import Self
from urllib.parse import urlsplit

import httpx
from py_vapid import Vapid02
from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from pywebpush import WebPusher

from depazo.application.ports.push_sender import PushDelivery, PushMessage
from depazo.domain.push_subscription import PushSubscription, is_push_service_endpoint

DEFAULT_VAPID_SUBJECT = "https://depazo.vercel.app"
MESSAGE_TIME_TO_LIVE_SECONDS = 24 * 60 * 60
VAPID_TOKEN_LIFETIME_SECONDS = 12 * 60 * 60
GONE_STATUSES = frozenset({404, 410})
SUCCESS_STATUSES = range(200, 300)


class PushNotConfiguredError(ValueError):
    pass


class WebPushSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    vapid_private_key: SecretStr = Field(
        validation_alias="DEPAZO_VAPID_PRIVATE_KEY", min_length=40, max_length=100
    )
    vapid_subject: str = Field(
        default=DEFAULT_VAPID_SUBJECT,
        validation_alias="DEPAZO_VAPID_SUBJECT",
        pattern=r"^(https://|mailto:)\S{3,200}$",
    )


def web_push_settings_from_environment() -> WebPushSettings:
    try:
        return WebPushSettings()  # type: ignore[call-arg]
    except ValidationError as error:
        raise PushNotConfiguredError(
            "set DEPAZO_VAPID_PRIVATE_KEY to send push notifications"
        ) from error


class WebPushSender:
    def __init__(self, settings: WebPushSettings, timeout_seconds: float = 10.0) -> None:
        self._vapid = Vapid02.from_raw(settings.vapid_private_key.get_secret_value().encode())
        self._subject = settings.vapid_subject
        self._client = httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=False)

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self._client.aclose()

    async def send(self, subscription: PushSubscription, message: PushMessage) -> PushDelivery:
        if not is_push_service_endpoint(subscription.endpoint):
            return PushDelivery.GONE
        payload = json.dumps(
            {"title": message.title, "body": message.body, "url": message.url}
        ).encode()
        encrypted = WebPusher(
            {
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            }
        ).encode(payload)
        try:
            response = await self._client.post(
                subscription.endpoint,
                content=encrypted["body"],
                headers={
                    **self._authorization_for(subscription.endpoint),
                    "Content-Encoding": "aes128gcm",
                    "Content-Type": "application/octet-stream",
                    "TTL": str(MESSAGE_TIME_TO_LIVE_SECONDS),
                    "Urgency": "normal",
                },
            )
        except httpx.TransportError:
            return PushDelivery.FAILED
        if response.status_code in GONE_STATUSES:
            return PushDelivery.GONE
        if response.status_code in SUCCESS_STATUSES:
            return PushDelivery.DELIVERED
        return PushDelivery.FAILED

    def _authorization_for(self, endpoint: str) -> dict[str, str]:
        parts = urlsplit(endpoint)
        claims = {
            "aud": f"{parts.scheme}://{parts.netloc}",
            "exp": int(time.time()) + VAPID_TOKEN_LIFETIME_SECONDS,
            "sub": self._subject,
        }
        headers: dict[str, str] = self._vapid.sign(claims)
        return {"Authorization": headers["Authorization"]}
