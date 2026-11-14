from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from depazo.domain.search_profile import ScoreWeights, SearchProfile
from depazo.infrastructure.persistence.models import SearchProfileRecord


class SqlAlchemySearchProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_for_user(self, user_id: UUID) -> SearchProfile | None:
        record = await self._session.get(SearchProfileRecord, user_id)
        return _to_profile(record) if record is not None else None

    async def list_all(self) -> Sequence[tuple[UUID, SearchProfile]]:
        records = await self._session.scalars(select(SearchProfileRecord))
        return [(record.user_id, _to_profile(record)) for record in records]

    async def save_for_user(
        self, user_id: UUID, profile: SearchProfile, saved_at: datetime
    ) -> None:
        record = await self._session.get(SearchProfileRecord, user_id)
        if record is None:
            record = SearchProfileRecord(user_id=user_id)
            self._session.add(record)
        record.max_monthly_cost_usd = profile.max_monthly_cost_usd
        record.min_monthly_cost_usd = profile.min_monthly_cost_usd
        record.is_condo_fee_in_budget = profile.is_condo_fee_in_budget
        record.min_bedrooms = profile.min_bedrooms
        record.min_bathrooms = profile.min_bathrooms
        record.min_area_m2 = profile.min_area_m2
        record.preferred_neighborhoods = sorted(profile.preferred_neighborhoods)
        record.excluded_neighborhoods = sorted(profile.excluded_neighborhoods)
        record.price_weight = profile.weights.price
        record.area_weight = profile.weights.area
        record.neighborhood_weight = profile.weights.neighborhood
        record.min_score = profile.min_score
        record.updated_at = saved_at
        await self._session.flush()


def _to_profile(record: SearchProfileRecord) -> SearchProfile:
    return SearchProfile(
        max_monthly_cost_usd=record.max_monthly_cost_usd,
        min_monthly_cost_usd=record.min_monthly_cost_usd,
        is_condo_fee_in_budget=record.is_condo_fee_in_budget,
        min_bedrooms=record.min_bedrooms,
        min_bathrooms=record.min_bathrooms,
        min_area_m2=record.min_area_m2,
        preferred_neighborhoods=frozenset(record.preferred_neighborhoods),
        excluded_neighborhoods=frozenset(record.excluded_neighborhoods),
        weights=ScoreWeights(
            price=record.price_weight,
            area=record.area_weight,
            neighborhood=record.neighborhood_weight,
        ),
        min_score=record.min_score,
    )
