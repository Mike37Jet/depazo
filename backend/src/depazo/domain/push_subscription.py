import re
from dataclasses import dataclass
from urllib.parse import urlsplit

PUSH_SERVICE_HOSTS = (
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "push.apple.com",
    "notify.windows.com",
)
MAX_ENDPOINT_LENGTH = 1000
BASE64_URL_KEY = re.compile(r"^[A-Za-z0-9_-]{16,200}={0,2}$")
PLAIN_HOST_NAME = re.compile(r"^[a-z0-9.-]{1,253}$")


class InvalidPushSubscriptionError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class PushSubscription:
    endpoint: str
    p256dh: str
    auth: str

    def __post_init__(self) -> None:
        if not is_push_service_endpoint(self.endpoint):
            raise InvalidPushSubscriptionError("the endpoint is not a known push service")
        if not BASE64_URL_KEY.match(self.p256dh) or not BASE64_URL_KEY.match(self.auth):
            raise InvalidPushSubscriptionError("the subscription keys are malformed")


def is_push_service_endpoint(endpoint: str) -> bool:
    if len(endpoint) > MAX_ENDPOINT_LENGTH:
        return False
    try:
        parts = urlsplit(endpoint)
        port = parts.port
    except ValueError:
        return False
    host = parts.hostname or ""
    return (
        parts.scheme == "https"
        and port is None
        and PLAIN_HOST_NAME.match(host) is not None
        and parts.username is None
        and parts.password is None
        and any(host == allowed or host.endswith(f".{allowed}") for allowed in PUSH_SERVICE_HOSTS)
    )
