import time
from collections import deque
from collections.abc import Callable


class InMemoryRateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._clock = clock
        self._requests_by_key: dict[str, deque[float]] = {}

    @property
    def window_seconds(self) -> float:
        return self._window_seconds

    def allow(self, key: str) -> bool:
        now = self._clock()
        recent_requests = self._requests_by_key.setdefault(key, deque())
        while recent_requests and now - recent_requests[0] >= self._window_seconds:
            recent_requests.popleft()
        if len(recent_requests) >= self._max_requests:
            return False
        recent_requests.append(now)
        return True
