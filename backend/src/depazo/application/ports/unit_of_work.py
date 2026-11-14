from typing import Protocol, Self

from depazo.application.ports.listing_repository import ListingRepository
from depazo.application.ports.search_profile_repository import SearchProfileRepository


class UnitOfWork(Protocol):
    @property
    def listings(self) -> ListingRepository: ...

    @property
    def search_profiles(self) -> SearchProfileRepository: ...

    async def __aenter__(self) -> Self: ...

    async def __aexit__(self, *exc_info: object) -> None: ...

    async def commit(self) -> None: ...
