from depazo.presentation.api.rate_limit import InMemoryRateLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_allows_requests_up_to_the_limit_per_key() -> None:
    limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60, clock=FakeClock())

    results = [limiter.allow("a"), limiter.allow("a"), limiter.allow("a"), limiter.allow("b")]

    assert results == [True, True, False, True]


def test_allows_again_once_the_window_has_passed() -> None:
    clock = FakeClock()
    limiter = InMemoryRateLimiter(max_requests=1, window_seconds=60, clock=clock)
    limiter.allow("a")

    clock.now = 60

    assert limiter.allow("a")
