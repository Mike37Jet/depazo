import httpx
import pytest
import respx

from depazo.application.ports.listing_source import SourceLayoutChangedError
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.sources.icasas.source import ALLOWED_HOSTS, ICasasListingSource
from tests.integration.http_mocks import serve_robots

FIRST_PAGE_URL = "https://www.icasas.ec/arriendo/departamentos/quito"
SECOND_PAGE_URL = f"{FIRST_PAGE_URL}/p_2"
EMPTY_PAGE = "<html><body><ul class='listAds'></ul></body></html>"
HOST = "www.icasas.ec"


@respx.mock
async def test_collects_listings_across_pages_until_an_empty_page(icasas_page_html: str) -> None:
    serve_robots(HOST)
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=icasas_page_html))
    respx.get(SECOND_PAGE_URL).mock(return_value=httpx.Response(200, text=EMPTY_PAGE))
    third_page = respx.get(f"{FIRST_PAGE_URL}/p_3").mock(return_value=httpx.Response(200))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        listings = [listing async for listing in ICasasListingSource(client).listings(max_pages=5)]

    assert len(listings) == 4
    assert not third_page.called


@respx.mock
async def test_respects_max_pages(icasas_page_html: str) -> None:
    serve_robots(HOST)
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=icasas_page_html))
    second_page = respx.get(SECOND_PAGE_URL).mock(
        return_value=httpx.Response(200, text=icasas_page_html)
    )

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        listings = [listing async for listing in ICasasListingSource(client).listings(max_pages=1)]

    assert len(listings) == 4
    assert not second_page.called


@respx.mock
async def test_fails_loudly_when_first_page_layout_is_not_recognized() -> None:
    serve_robots(HOST)
    redesigned_page = "<h1>553 departamento en arriendo en Quito</h1><div class='new-grid'></div>"
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=redesigned_page))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        with pytest.raises(SourceLayoutChangedError):
            [listing async for listing in ICasasListingSource(client).listings(max_pages=1)]


@respx.mock
async def test_fails_loudly_when_cards_can_no_longer_be_read(icasas_page_html: str) -> None:
    serve_robots(HOST)
    unreadable_cards = "<ul class='listAds'><li class='serp-snippet'><p>sin enlace</p></li></ul>"
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=icasas_page_html))
    respx.get(SECOND_PAGE_URL).mock(return_value=httpx.Response(200, text=unreadable_cards))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        with pytest.raises(SourceLayoutChangedError):
            [listing async for listing in ICasasListingSource(client).listings(max_pages=2)]


@respx.mock
async def test_accepts_a_search_with_zero_results() -> None:
    serve_robots(HOST)
    no_results_page = f"<h1>0 departamento en arriendo en Quito</h1>{EMPTY_PAGE}"
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=no_results_page))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        listings = [listing async for listing in ICasasListingSource(client).listings(max_pages=1)]

    assert listings == []
