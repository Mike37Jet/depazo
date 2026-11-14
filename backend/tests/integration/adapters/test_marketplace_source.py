import httpx
import pytest
import respx

from depazo.application.ports.listing_source import SourceBlockedError, SourceLayoutChangedError
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.sources.marketplace.source import (
    ALLOWED_HOSTS,
    NAVIGATION_HEADERS,
    SHOULD_RESPECT_ROBOTS,
    MarketplaceListingSource,
)
from tests.integration.http_mocks import serve_robots

HOST = "www.facebook.com"
MARKETPLACE_URL = f"https://{HOST}/marketplace/quito"
CATEGORY_URL = f"{MARKETPLACE_URL}/propertyrentals"
SEARCH_URL = f"{MARKETPLACE_URL}/search"


def a_client() -> PoliteHttpClient:
    return PoliteHttpClient(
        ALLOWED_HOSTS,
        min_interval_seconds=0,
        should_respect_robots=SHOULD_RESPECT_ROBOTS,
        extra_headers=NAVIGATION_HEADERS,
    )


@respx.mock
async def test_merges_searches_and_category_without_repeating_listings(
    marketplace_category_html: str, marketplace_search_html: str
) -> None:
    search = respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, text=marketplace_search_html)
    )
    category = respx.get(CATEGORY_URL).mock(
        return_value=httpx.Response(200, text=marketplace_category_html)
    )

    async with a_client() as client:
        source = MarketplaceListingSource(client)
        listings = [listing async for listing in source.listings(max_pages=20)]

    external_ids = [listing.external_id for listing in listings]
    assert len(external_ids) == len(set(external_ids)) == 14
    assert search.call_count == 2
    assert category.call_count == 1


@respx.mock
async def test_asks_for_the_newest_listings_as_a_page_navigation(
    marketplace_search_html: str,
) -> None:
    search = respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, text=marketplace_search_html)
    )

    async with a_client() as client:
        source = MarketplaceListingSource(client)
        _ = [listing async for listing in source.listings(max_pages=1)]

    request = search.calls.last.request
    assert search.call_count == 1
    assert request.url.params["sortBy"] == "creation_time_descend"
    assert request.url.params["query"] == "departamento arriendo"
    assert request.headers["Sec-Fetch-Mode"] == "navigate"
    assert request.headers["User-Agent"].startswith("depazo/")


@respx.mock
async def test_does_not_ask_for_robots(marketplace_search_html: str) -> None:
    robots = serve_robots(HOST, "User-agent: *\nDisallow: /\n")
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(200, text=marketplace_search_html))

    async with a_client() as client:
        source = MarketplaceListingSource(client)
        listings = [listing async for listing in source.listings(max_pages=1)]

    assert listings
    assert not robots.called


@respx.mock
async def test_fails_loudly_when_the_page_asks_to_log_in() -> None:
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, text="<html>Inicia sesión en Facebook</html>")
    )

    async with a_client() as client:
        source = MarketplaceListingSource(client)
        with pytest.raises(SourceLayoutChangedError):
            _ = [listing async for listing in source.listings(max_pages=3)]


@respx.mock
async def test_stops_at_the_first_page_that_blocks() -> None:
    search = respx.get(SEARCH_URL).mock(return_value=httpx.Response(429))

    async with a_client() as client:
        source = MarketplaceListingSource(client)
        with pytest.raises(SourceBlockedError):
            _ = [listing async for listing in source.listings(max_pages=3)]

    assert search.call_count == 1
