import httpx
import pytest
import respx

from depazo.application.ports.listing_source import SourceLayoutChangedError
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.sources.arriendos_ec.source import (
    ALLOWED_HOSTS,
    ArriendosEcListingSource,
)
from tests.integration.http_mocks import serve_robots

FEED_URL = "https://arriendos.ec/feed/properties"
HOST = "arriendos.ec"


@respx.mock
async def test_reads_the_feed_with_a_single_request(arriendos_ec_feed_xml: str) -> None:
    serve_robots(HOST)
    feed = respx.get(FEED_URL).mock(return_value=httpx.Response(200, text=arriendos_ec_feed_xml))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        source = ArriendosEcListingSource(client)
        listings = [listing async for listing in source.listings(max_pages=20)]

    assert len(listings) == 6
    assert feed.call_count == 1


@respx.mock
async def test_fails_loudly_when_the_feed_changes() -> None:
    serve_robots(HOST)
    respx.get(FEED_URL).mock(return_value=httpx.Response(200, text="<html>nuevo sitio</html>"))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        source = ArriendosEcListingSource(client)
        with pytest.raises(SourceLayoutChangedError):
            _ = [listing async for listing in source.listings(max_pages=1)]
