import pytest

from depazo.domain.push_subscription import InvalidPushSubscriptionError, PushSubscription

P256DH = "B" + "x" * 86
AUTH = "aGVsbG8tYXV0aC1zZWNyZXQ"


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://fcm.googleapis.com/fcm/send/abc",
        "https://updates.push.services.mozilla.com/wpush/v2/abc",
        "https://web.push.apple.com/QGt0",
        "https://wns2-by3p.notify.windows.com/w/?token=abc",
    ],
    ids=["chrome", "firefox", "safari", "edge"],
)
def test_accepts_endpoints_of_known_push_services(endpoint: str) -> None:
    subscription = PushSubscription(endpoint=endpoint, p256dh=P256DH, auth=AUTH)

    assert subscription.endpoint == endpoint


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://fcm.googleapis.com/fcm/send/abc",
        "https://evil.example/fcm.googleapis.com",
        "https://fcm.googleapis.com.evil.example/x",
        "https://fcm.googleapis.com:8443/x",
        "https://user:pass@fcm.googleapis.com/x",
        "https://169.254.169.254/latest",
        "https://fcm.googleapis.com/" + "x" * 1000,
    ],
    ids=["http", "path-trick", "suffix-trick", "port", "credentials", "metadata-ip", "too-long"],
)
def test_refuses_endpoints_outside_the_push_services(endpoint: str) -> None:
    with pytest.raises(InvalidPushSubscriptionError):
        PushSubscription(endpoint=endpoint, p256dh=P256DH, auth=AUTH)


@pytest.mark.parametrize(
    ("p256dh", "auth"), [("short", AUTH), (P256DH, "not base64!"), (P256DH, "")]
)
def test_refuses_malformed_keys(p256dh: str, auth: str) -> None:
    with pytest.raises(InvalidPushSubscriptionError):
        PushSubscription(endpoint="https://fcm.googleapis.com/x", p256dh=p256dh, auth=auth)
