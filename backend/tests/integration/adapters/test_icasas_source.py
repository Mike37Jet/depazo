import httpx
import respx

from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.sources.icasas.source import ALLOWED_HOSTS, ICasasListingSource

FIRST_PAGE_URL = "https://www.icasas.ec/arriendo/departamentos/quito"
SECOND_PAGE_URL = f"{FIRST_PAGE_URL}/p_2"
EMPTY_PAGE = "<html><body><ul class='listAds'></ul></body></html>"


@respx.mock
async def test_collects_listings_across_pages_until_an_empty_page(icasas_page_html: str) -> None:
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=icasas_page_html))
    respx.get(SECOND_PAGE_URL).mock(return_value=httpx.Response(200, text=EMPTY_PAGE))
    third_page = respx.get(f"{FIRST_PAGE_URL}/p_3").mock(return_value=httpx.Response(200))

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        listings = [listing async for listing in ICasasListingSource(client).listings(max_pages=5)]

    assert len(listings) == 4
    assert not third_page.called


@respx.mock
async def test_respects_max_pages(icasas_page_html: str) -> None:
    respx.get(FIRST_PAGE_URL).mock(return_value=httpx.Response(200, text=icasas_page_html))
    second_page = respx.get(SECOND_PAGE_URL).mock(
        return_value=httpx.Response(200, text=icasas_page_html)
    )

    async with PoliteHttpClient(ALLOWED_HOSTS, min_interval_seconds=0) as client:
        listings = [listing async for listing in ICasasListingSource(client).listings(max_pages=1)]

    assert len(listings) == 4
    assert not second_page.called
