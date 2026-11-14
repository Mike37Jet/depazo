from collections.abc import Callable

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.neighborhoods import NeighborhoodSummary, summarize_neighborhoods


class ListNeighborhoods:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self) -> list[NeighborhoodSummary]:
        async with self._open_unit_of_work() as unit_of_work:
            listings = await unit_of_work.listings.list_active()
        return summarize_neighborhoods(listings)
