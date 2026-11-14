from collections.abc import AsyncIterator

from depazo.domain.listing import Listing
from depazo.infrastructure.http.polite_client import PageFetcher
from depazo.infrastructure.sources.icasas.parser import BASE_URL, SOURCE_NAME, parse_listing_page

ALLOWED_HOSTS = frozenset({"www.icasas.ec"})
MIN_INTERVAL_SECONDS = 5.0


class ICasasListingSource:
    def __init__(self, fetcher: PageFetcher, city_slug: str = "quito") -> None:
        self._fetcher = fetcher
        self._city_slug = city_slug

    @property
    def name(self) -> str:
        return SOURCE_NAME

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        for page_number in range(1, max_pages + 1):
            html = await self._fetcher.get_text(self._page_url(page_number))
            page_listings = parse_listing_page(html)
            if not page_listings:
                return
            for listing in page_listings:
                yield listing

    def _page_url(self, page_number: int) -> str:
        search_path = f"{BASE_URL}/arriendo/departamentos/{self._city_slug}"
        return search_path if page_number == 1 else f"{search_path}/p_{page_number}"
