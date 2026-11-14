from collections.abc import Sequence
from typing import Protocol

from depazo.application.dto.listing_alert import ListingAlert


class NotificationFailedError(Exception):
    pass


class Notifier(Protocol):
    async def send_alerts(self, alerts: Sequence[ListingAlert]) -> None: ...
