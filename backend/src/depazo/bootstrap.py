from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager

from depazo.application.ports.listing_source import ListingSource
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.sources.icasas import source as icasas


class UnknownSourceError(ValueError):
    pass


@asynccontextmanager
async def _icasas_source() -> AsyncIterator[ListingSource]:
    async with PoliteHttpClient(icasas.ALLOWED_HOSTS, icasas.MIN_INTERVAL_SECONDS) as client:
        yield icasas.ICasasListingSource(client)


SOURCE_FACTORIES: dict[str, Callable[[], AbstractAsyncContextManager[ListingSource]]] = {
    "icasas": _icasas_source,
}


def open_listing_source(name: str) -> AbstractAsyncContextManager[ListingSource]:
    factory = SOURCE_FACTORIES.get(name)
    if factory is None:
        raise UnknownSourceError(
            f"unknown source '{name}', available: {', '.join(SOURCE_FACTORIES)}"
        )
    return factory()
