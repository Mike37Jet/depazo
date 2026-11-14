import httpx
import pytest
import respx

from depazo.application.ports.listing_source import SourceBlockedError, SourceUnavailableError
from depazo.infrastructure.http.polite_client import (
    DisallowedByRobotsError,
    HostNotAllowedError,
    PoliteHttpClient,
)
from tests.integration.http_mocks import serve_robots

ALLOWED_HOST = "www.icasas.ec"
PAGE_URL = f"https://{ALLOWED_HOST}/arriendo/departamentos/quito"
ROBOTS_URL = f"https://{ALLOWED_HOST}/robots.txt"


def a_client() -> PoliteHttpClient:
    return PoliteHttpClient(frozenset({ALLOWED_HOST}), min_interval_seconds=0)


@respx.mock
async def test_returns_page_text() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="<html>ok</html>"))

    async with a_client() as client:
        text = await client.get_text(PAGE_URL)

    assert text == "<html>ok</html>"


@respx.mock
async def test_sends_identifiable_user_agent() -> None:
    serve_robots(ALLOWED_HOST)
    route = respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with a_client() as client:
        await client.get_text(PAGE_URL)

    assert route.calls.last.request.headers["User-Agent"].startswith("depazo/")


@respx.mock
async def test_refuses_hosts_outside_allowlist_without_sending_request() -> None:
    route = respx.get("https://evil.test/").mock(return_value=httpx.Response(200))

    async with a_client() as client:
        with pytest.raises(HostNotAllowedError):
            await client.get_text("https://evil.test/")

    assert not route.called


@respx.mock
async def test_refuses_plain_http() -> None:
    async with a_client() as client:
        with pytest.raises(HostNotAllowedError):
            await client.get_text(f"http://{ALLOWED_HOST}/")


@respx.mock
async def test_refuses_redirect_to_foreign_host() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(
        return_value=httpx.Response(302, headers={"location": "https://evil.test/steal"})
    )

    async with a_client() as client:
        with pytest.raises(HostNotAllowedError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_follows_redirect_within_allowed_host() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(return_value=httpx.Response(301, headers={"location": "/nueva"}))
    respx.get(f"https://{ALLOWED_HOST}/nueva").mock(return_value=httpx.Response(200, text="moved"))

    async with a_client() as client:
        text = await client.get_text(PAGE_URL)

    assert text == "moved"


@pytest.mark.parametrize("status_code", [401, 403, 429])
@respx.mock
async def test_stops_when_source_blocks(status_code: int) -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(return_value=httpx.Response(status_code))

    async with a_client() as client:
        with pytest.raises(SourceBlockedError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_detects_cloudflare_challenge_as_block() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(
        return_value=httpx.Response(
            200, headers={"cf-mitigated": "challenge"}, text="Just a moment"
        )
    )

    async with a_client() as client:
        with pytest.raises(SourceBlockedError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_reports_server_errors_as_unavailable() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(return_value=httpx.Response(503))

    async with a_client() as client:
        with pytest.raises(SourceUnavailableError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_reports_network_failures_as_unavailable() -> None:
    serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(side_effect=httpx.ConnectError("down"))

    async with a_client() as client:
        with pytest.raises(SourceUnavailableError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_does_not_request_pages_disallowed_by_robots() -> None:
    serve_robots(ALLOWED_HOST, "User-agent: *\nDisallow: /arriendo/\n")
    page = respx.get(PAGE_URL).mock(return_value=httpx.Response(200))

    async with a_client() as client:
        with pytest.raises(DisallowedByRobotsError):
            await client.get_text(PAGE_URL)

    assert not page.called


@respx.mock
async def test_applies_robots_wildcard_rules() -> None:
    serve_robots(ALLOWED_HOST, "User-agent: *\nDisallow: /*/f_*\n")
    filtered_url = f"{PAGE_URL}/f_amoblado"

    async with a_client() as client:
        with pytest.raises(DisallowedByRobotsError):
            await client.get_text(filtered_url)


@respx.mock
async def test_applies_rules_written_for_depazo() -> None:
    serve_robots(ALLOWED_HOST, "User-agent: *\nAllow: /\n\nUser-agent: depazo\nDisallow: /\n")

    async with a_client() as client:
        with pytest.raises(DisallowedByRobotsError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_checks_robots_for_redirect_targets() -> None:
    serve_robots(ALLOWED_HOST, "User-agent: *\nDisallow: /privado\n")
    respx.get(PAGE_URL).mock(return_value=httpx.Response(302, headers={"location": "/privado"}))

    async with a_client() as client:
        with pytest.raises(DisallowedByRobotsError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_downloads_robots_once_per_host() -> None:
    robots = serve_robots(ALLOWED_HOST)
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with a_client() as client:
        await client.get_text(PAGE_URL)
        await client.get_text(PAGE_URL)

    assert robots.call_count == 1


@respx.mock
async def test_allows_everything_when_robots_is_missing() -> None:
    respx.get(ROBOTS_URL).mock(return_value=httpx.Response(404))
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with a_client() as client:
        text = await client.get_text(PAGE_URL)

    assert text == "ok"


@respx.mock
async def test_assumes_full_disallow_when_robots_fails() -> None:
    respx.get(ROBOTS_URL).mock(return_value=httpx.Response(503))
    page = respx.get(PAGE_URL).mock(return_value=httpx.Response(200))

    async with a_client() as client:
        with pytest.raises(SourceUnavailableError):
            await client.get_text(PAGE_URL)

    assert not page.called


@respx.mock
async def test_waits_at_least_the_crawl_delay_between_requests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    waits: list[float] = []

    async def record_wait(seconds: float) -> None:
        waits.append(seconds)

    monkeypatch.setattr("depazo.infrastructure.http.polite_client.asyncio.sleep", record_wait)
    serve_robots(ALLOWED_HOST, "User-agent: *\nCrawl-delay: 30\n")
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with a_client() as client:
        await client.get_text(PAGE_URL)

    assert waits
    assert min(waits) > 29


@respx.mock
async def test_skips_robots_only_when_told_to() -> None:
    robots = serve_robots(ALLOWED_HOST, "User-agent: *\nDisallow: /\n")
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with PoliteHttpClient(
        frozenset({ALLOWED_HOST}), min_interval_seconds=0, should_respect_robots=False
    ) as client:
        text = await client.get_text(PAGE_URL)

    assert text == "ok"
    assert not robots.called


@respx.mock
async def test_sends_extra_headers_without_replacing_the_user_agent() -> None:
    serve_robots(ALLOWED_HOST)
    route = respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="ok"))

    async with PoliteHttpClient(
        frozenset({ALLOWED_HOST}),
        min_interval_seconds=0,
        extra_headers={"Sec-Fetch-Mode": "navigate", "User-Agent": "Mozilla/5.0"},
    ) as client:
        await client.get_text(PAGE_URL)

    headers = route.calls.last.request.headers
    assert headers["Sec-Fetch-Mode"] == "navigate"
    assert headers["User-Agent"].startswith("depazo/")
