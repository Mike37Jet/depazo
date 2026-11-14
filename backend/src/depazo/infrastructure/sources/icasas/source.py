from collections.abc import AsyncIterator

from depazo.application.ports.listing_source import SourceLayoutChangedError
from depazo.domain.listing import Listing
from depazo.infrastructure.http.polite_client import PageFetcher
from depazo.infrastructure.sources.icasas.parser import (
    BASE_URL,
    SOURCE_NAME,
    count_listing_cards,
    parse_listing_page,
    parse_total_results,
)

ALLOWED_HOSTS = frozenset({"www.icasas.ec"})
MIN_INTERVAL_SECONDS = 5.0
FIRST_PAGE_NUMBER = 1


class ICasasListingSource:
    def __init__(self, fetcher: PageFetcher, city_slug: str = "quito") -> None:
        self._fetcher = fetcher
        self._city_slug = city_slug

    @property
    def name(self) -> str:
        return SOURCE_NAME

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        for page_number in range(FIRST_PAGE_NUMBER, max_pages + 1):
            page_url = self._page_url(page_number)
            html = await self._fetcher.get_text(page_url)
            page_listings = parse_listing_page(html)
            if not page_listings:
                self._ensure_layout_is_recognized(html, page_number, page_url)
                return
            for listing in page_listings:
                yield listing

    def _page_url(self, page_number: int) -> str:
        search_path = f"{BASE_URL}/arriendo/departamentos/{self._city_slug}"
        return search_path if page_number == FIRST_PAGE_NUMBER else f"{search_path}/p_{page_number}"

    @staticmethod
    def _ensure_layout_is_recognized(html: str, page_number: int, page_url: str) -> None:
        has_unreadable_cards = count_listing_cards(html) > 0
        is_first_page_without_zero_results = (
            page_number == FIRST_PAGE_NUMBER and parse_total_results(html) != 0
        )
        if has_unreadable_cards or is_first_page_without_zero_results:
            raise SourceLayoutChangedError(
                f"{SOURCE_NAME} page layout not recognized at {page_url}; update the parser"
            )
