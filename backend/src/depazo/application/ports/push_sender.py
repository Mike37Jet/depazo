from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from depazo.domain.push_subscription import PushSubscription


class PushDelivery(StrEnum):
    DELIVERED = "delivered"
    GONE = "gone"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class PushMessage:
    title: str
    body: str
    url: str


class PushSender(Protocol):
    async def send(self, subscription: PushSubscription, message: PushMessage) -> PushDelivery: ...
