from collections.abc import AsyncIterator
from urllib.parse import quote

from depazo.application.ports.listing_source import SourceLayoutChangedError
from depazo.domain.listing import Listing
from depazo.infrastructure.http.polite_client import PageFetcher
from depazo.infrastructure.sources.marketplace.parser import (
    SITE_HOST,
    SOURCE_NAME,
    UnreadablePageError,
    parse_listing_page,
)

ALLOWED_HOSTS = frozenset({SITE_HOST})
MIN_INTERVAL_SECONDS = 10.0
SHOULD_RESPECT_ROBOTS = False
NAVIGATION_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}
NEWEST_FIRST = "sortBy=creation_time_descend"
SEARCH_QUERIES = ("departamento arriendo", "suite arriendo")


class MarketplaceListingSource:
    def __init__(self, fetcher: PageFetcher, city_slug: str = "quito") -> None:
        self._fetcher = fetcher
        self._city_slug = city_slug

    @property
    def name(self) -> str:
        return SOURCE_NAME

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        seen_external_ids: set[str] = set()
        for page_url in self._page_urls()[:max_pages]:
            html = await self._fetcher.get_text(page_url)
            try:
                page_listings = parse_listing_page(html)
            except UnreadablePageError as error:
                raise SourceLayoutChangedError(
                    f"{SOURCE_NAME} shows no listings at {page_url}; "
                    "the layout changed or it asks to log in"
                ) from error
            for listing in page_listings:
                if listing.external_id not in seen_external_ids:
                    seen_external_ids.add(listing.external_id)
                    yield listing

    def _page_urls(self) -> list[str]:
        marketplace_url = f"https://{SITE_HOST}/marketplace/{self._city_slug}"
        searches = [
            f"{marketplace_url}/search?query={quote(query)}&{NEWEST_FIRST}"
            for query in SEARCH_QUERIES
        ]
        return [*searches, f"{marketplace_url}/propertyrentals?{NEWEST_FIRST}"]
