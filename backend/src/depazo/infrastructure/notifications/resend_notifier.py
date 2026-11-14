from collections.abc import Sequence
from typing import Self

import httpx
from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

from depazo.application.dto.listing_alert import ListingAlert
from depazo.application.ports.notifier import NotificationFailedError
from depazo.infrastructure.notifications.alert_email import compose_alert_email

RESEND_EMAILS_URL = "https://api.resend.com/emails"
DEFAULT_SENDER = "depazo <onboarding@resend.dev>"
EMAIL_PATTERN = r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$"
FIRST_ERROR_STATUS = 400


class NotificationsNotConfiguredError(ValueError):
    pass


class EmailAlertSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    resend_api_key: SecretStr = Field(validation_alias="RESEND_API_KEY")
    recipient: str = Field(validation_alias="DEPAZO_ALERT_EMAIL", pattern=EMAIL_PATTERN)
    sender: str = Field(
        default=DEFAULT_SENDER, validation_alias="DEPAZO_ALERT_FROM", max_length=200
    )


def email_alert_settings_from_environment() -> EmailAlertSettings:
    try:
        return EmailAlertSettings()  # type: ignore[call-arg]
    except ValidationError as error:
        raise NotificationsNotConfiguredError(
            "set RESEND_API_KEY and a valid DEPAZO_ALERT_EMAIL to send alerts"
        ) from error


class ResendEmailNotifier:
    def __init__(self, settings: EmailAlertSettings, timeout_seconds: float = 15.0) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=False)

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self._client.aclose()

    async def send_alerts(self, alerts: Sequence[ListingAlert]) -> None:
        email = compose_alert_email(alerts)
        try:
            response = await self._client.post(
                RESEND_EMAILS_URL,
                headers={
                    "Authorization": f"Bearer {self._settings.resend_api_key.get_secret_value()}",
                    "Idempotency-Key": email.idempotency_key,
                },
                json={
                    "from": self._settings.sender,
                    "to": [self._settings.recipient],
                    "subject": email.subject,
                    "text": email.text,
                },
            )
        except httpx.TransportError as error:
            raise NotificationFailedError("cannot reach the email provider") from error
        if response.status_code >= FIRST_ERROR_STATUS:
            raise NotificationFailedError(f"email provider answered {response.status_code}")
