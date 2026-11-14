import asyncio
import time
from typing import Protocol, Self
from urllib.parse import urljoin, urlsplit

import httpx
from protego import Protego

from depazo.application.ports.listing_source import SourceBlockedError, SourceUnavailableError

USER_AGENT = "depazo/0.1 (+https://github.com/Mike37Jet/depazo)"
ROBOTS_USER_AGENT = "depazo"
BLOCKING_STATUS_CODES = frozenset({401, 403, 429})
BLOCKING_HEADERS = frozenset({"cf-mitigated"})
MAX_RESPONSE_BYTES = 5_000_000
MAX_REDIRECTS = 3
FIRST_ERROR_STATUS = 400
FIRST_SERVER_ERROR_STATUS = 500


class HostNotAllowedError(Exception):
    pass


class DisallowedByRobotsError(SourceUnavailableError):
    pass


class PageFetcher(Protocol):
    async def get_text(self, url: str) -> str: ...


class PoliteHttpClient:
    def __init__(
        self,
        allowed_hosts: frozenset[str],
        min_interval_seconds: float,
        timeout_seconds: float = 20.0,
    ) -> None:
        self._allowed_hosts = allowed_hosts
        self._min_interval_seconds = min_interval_seconds
        self._last_request_at: float | None = None
        self._robots_by_host: dict[str, Protego] = {}
        self._client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT, "Accept-Language": "es-EC,es;q=0.9"},
            timeout=timeout_seconds,
            follow_redirects=False,
        )

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self._client.aclose()

    async def get_text(self, url: str) -> str:
        response = await self._get_following_redirects(url, should_check_robots=True)
        if response.status_code >= FIRST_ERROR_STATUS:
            raise SourceUnavailableError(f"{response.url} answered {response.status_code}")
        return self._read_body(response)

    async def _get_following_redirects(self, url: str, should_check_robots: bool) -> httpx.Response:
        current_url = url
        for _ in range(MAX_REDIRECTS + 1):
            self._ensure_allowed(current_url)
            if should_check_robots:
                await self._ensure_allowed_by_robots(current_url)
            response = await self._request(current_url)
            if not response.is_redirect:
                return response
            current_url = urljoin(current_url, response.headers.get("location", ""))
        raise SourceUnavailableError(f"too many redirects from {url}")

    async def _request(self, url: str) -> httpx.Response:
        await self._wait_for_turn()
        try:
            response = await self._client.get(url)
        except httpx.TransportError as error:
            raise SourceUnavailableError(f"cannot reach {url}") from error
        if self._is_blocked(response):
            raise SourceBlockedError(f"{url} answered {response.status_code}")
        return response

    def _ensure_allowed(self, url: str) -> None:
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in self._allowed_hosts:
            raise HostNotAllowedError(url)

    async def _ensure_allowed_by_robots(self, url: str) -> None:
        robots = await self._robots_for(urlsplit(url).netloc)
        if not robots.can_fetch(url, ROBOTS_USER_AGENT):
            raise DisallowedByRobotsError(f"robots.txt disallows {url}")

    async def _robots_for(self, host: str) -> Protego:
        cached_robots = self._robots_by_host.get(host)
        if cached_robots is not None:
            return cached_robots
        response = await self._get_following_redirects(
            f"https://{host}/robots.txt", should_check_robots=False
        )
        robots = self._parse_robots(response)
        self._robots_by_host[host] = robots
        self._min_interval_seconds = max(
            self._min_interval_seconds, robots.crawl_delay(ROBOTS_USER_AGENT) or 0
        )
        return robots

    def _parse_robots(self, response: httpx.Response) -> Protego:
        if response.status_code >= FIRST_SERVER_ERROR_STATUS:
            raise SourceUnavailableError(
                f"{response.url} answered {response.status_code}; assuming full disallow"
            )
        if response.status_code >= FIRST_ERROR_STATUS:
            return Protego.parse("")
        return Protego.parse(self._read_body(response))

    async def _wait_for_turn(self) -> None:
        if self._last_request_at is not None:
            elapsed = time.monotonic() - self._last_request_at
            if elapsed < self._min_interval_seconds:
                await asyncio.sleep(self._min_interval_seconds - elapsed)
        self._last_request_at = time.monotonic()

    @staticmethod
    def _is_blocked(response: httpx.Response) -> bool:
        has_blocking_header = any(header in response.headers for header in BLOCKING_HEADERS)
        return response.status_code in BLOCKING_STATUS_CODES or has_blocking_header

    @staticmethod
    def _read_body(response: httpx.Response) -> str:
        if len(response.content) > MAX_RESPONSE_BYTES:
            raise SourceUnavailableError(f"{response.url} response too large")
        return response.text
