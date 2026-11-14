from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.domain.search_profile import SearchProfile


class GetSearchProfile:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork]) -> None:
        self._open_unit_of_work = open_unit_of_work

    async def execute(self, user_id: UUID) -> SearchProfile | None:
        async with self._open_unit_of_work() as unit_of_work:
            return await unit_of_work.search_profiles.find_for_user(user_id)


class SaveSearchProfile:
    def __init__(
        self, open_unit_of_work: Callable[[], UnitOfWork], clock: Callable[[], datetime]
    ) -> None:
        self._open_unit_of_work = open_unit_of_work
        self._clock = clock

    async def execute(self, user_id: UUID, profile: SearchProfile) -> SearchProfile:
        async with self._open_unit_of_work() as unit_of_work:
            await unit_of_work.search_profiles.save_for_user(user_id, profile, self._clock())
            await unit_of_work.commit()
        return profile
