import json

import httpx
import pytest
import respx

from depazo.application.dto.listing_alert import AlertKind, ListingAlert
from depazo.application.ports.notifier import NotificationFailedError
from depazo.domain.scoring import score_listing
from depazo.infrastructure.notifications.resend_notifier import (
    RESEND_EMAILS_URL,
    EmailAlertSettings,
    NotificationsNotConfiguredError,
    ResendEmailNotifier,
    email_alert_settings_from_environment,
)
from tests.builders import a_listing, a_profile

RECIPIENT = "renter@example.test"


def settings() -> EmailAlertSettings:
    return EmailAlertSettings.model_validate(
        {"RESEND_API_KEY": "re_test_key", "DEPAZO_ALERT_EMAIL": RECIPIENT}
    )


def an_alert() -> ListingAlert:
    listing = a_listing()
    return ListingAlert(listing, score_listing(listing, a_profile()), AlertKind.NEW)


@respx.mock
async def test_sends_a_plain_text_email_with_idempotency_key() -> None:
    route = respx.post(RESEND_EMAILS_URL).mock(return_value=httpx.Response(200, json={"id": "1"}))

    async with ResendEmailNotifier(settings()) as notifier:
        await notifier.send_alerts([an_alert()])

    request = route.calls.last.request
    payload = json.loads(request.content)
    assert request.headers["Authorization"] == "Bearer re_test_key"
    assert request.headers["Idempotency-Key"].startswith("depazo-alerts-")
    assert payload["to"] == [RECIPIENT]
    assert "html" not in payload
    assert payload["text"]


@pytest.mark.parametrize("status_code", [401, 422, 500])
@respx.mock
async def test_reports_rejected_emails(status_code: int) -> None:
    respx.post(RESEND_EMAILS_URL).mock(return_value=httpx.Response(status_code))

    async with ResendEmailNotifier(settings()) as notifier:
        with pytest.raises(NotificationFailedError):
            await notifier.send_alerts([an_alert()])


@respx.mock
async def test_reports_network_failures() -> None:
    respx.post(RESEND_EMAILS_URL).mock(side_effect=httpx.ConnectError("down"))

    async with ResendEmailNotifier(settings()) as notifier:
        with pytest.raises(NotificationFailedError):
            await notifier.send_alerts([an_alert()])


@pytest.mark.parametrize(
    "environment",
    [{}, {"RESEND_API_KEY": "re_test_key"}, {"RESEND_API_KEY": "k", "DEPAZO_ALERT_EMAIL": "no"}],
)
def test_requires_api_key_and_a_valid_recipient(
    environment: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("RESEND_API_KEY", "DEPAZO_ALERT_EMAIL"):
        monkeypatch.delenv(name, raising=False)
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    with pytest.raises(NotificationsNotConfiguredError):
        email_alert_settings_from_environment()
