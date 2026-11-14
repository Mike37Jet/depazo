from collections.abc import AsyncIterator

from depazo.application.ports.listing_source import SourceLayoutChangedError
from depazo.domain.listing import Listing
from depazo.infrastructure.http.polite_client import PageFetcher
from depazo.infrastructure.sources.arriendos_ec.parser import (
    FEED_URL,
    SITE_HOST,
    SOURCE_NAME,
    UnreadableFeedError,
    parse_feed,
)

ALLOWED_HOSTS = frozenset({SITE_HOST})
MIN_INTERVAL_SECONDS = 5.0


class ArriendosEcListingSource:
    def __init__(self, fetcher: PageFetcher) -> None:
        self._fetcher = fetcher

    @property
    def name(self) -> str:
        return SOURCE_NAME

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        xml = await self._fetcher.get_text(FEED_URL)
        try:
            listings = parse_feed(xml)
        except UnreadableFeedError as error:
            raise SourceLayoutChangedError(
                f"{SOURCE_NAME} feed not recognized at {FEED_URL}; update the parser"
            ) from error
        for listing in listings:
            yield listing
