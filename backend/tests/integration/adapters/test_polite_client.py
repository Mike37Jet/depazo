import httpx
import pytest
import respx

from depazo.application.ports.listing_source import SourceBlockedError, SourceUnavailableError
from depazo.infrastructure.http.polite_client import HostNotAllowedError, PoliteHttpClient

ALLOWED_HOST = "www.icasas.ec"
PAGE_URL = f"https://{ALLOWED_HOST}/arriendo/departamentos/quito"


def a_client() -> PoliteHttpClient:
    return PoliteHttpClient(frozenset({ALLOWED_HOST}), min_interval_seconds=0)


@respx.mock
async def test_returns_page_text() -> None:
    respx.get(PAGE_URL).mock(return_value=httpx.Response(200, text="<html>ok</html>"))

    async with a_client() as client:
        text = await client.get_text(PAGE_URL)

    assert text == "<html>ok</html>"


@respx.mock
async def test_sends_identifiable_user_agent() -> None:
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
    respx.get(PAGE_URL).mock(
        return_value=httpx.Response(302, headers={"location": "https://evil.test/steal"})
    )

    async with a_client() as client:
        with pytest.raises(HostNotAllowedError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_follows_redirect_within_allowed_host() -> None:
    respx.get(PAGE_URL).mock(return_value=httpx.Response(301, headers={"location": "/nueva"}))
    respx.get(f"https://{ALLOWED_HOST}/nueva").mock(return_value=httpx.Response(200, text="moved"))

    async with a_client() as client:
        text = await client.get_text(PAGE_URL)

    assert text == "moved"


@pytest.mark.parametrize("status_code", [401, 403, 429])
@respx.mock
async def test_stops_when_source_blocks(status_code: int) -> None:
    respx.get(PAGE_URL).mock(return_value=httpx.Response(status_code))

    async with a_client() as client:
        with pytest.raises(SourceBlockedError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_detects_cloudflare_challenge_as_block() -> None:
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
    respx.get(PAGE_URL).mock(return_value=httpx.Response(503))

    async with a_client() as client:
        with pytest.raises(SourceUnavailableError):
            await client.get_text(PAGE_URL)


@respx.mock
async def test_reports_network_failures_as_unavailable() -> None:
    respx.get(PAGE_URL).mock(side_effect=httpx.ConnectError("down"))

    async with a_client() as client:
        with pytest.raises(SourceUnavailableError):
            await client.get_text(PAGE_URL)
