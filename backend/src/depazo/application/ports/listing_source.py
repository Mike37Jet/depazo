from collections.abc import AsyncIterator
from typing import Protocol

from depazo.domain.listing import Listing


class SourceBlockedError(Exception):
    pass


class SourceUnavailableError(Exception):
    pass


class ListingSource(Protocol):
    @property
    def name(self) -> str: ...

    def listings(self, max_pages: int) -> AsyncIterator[Listing]: ...
