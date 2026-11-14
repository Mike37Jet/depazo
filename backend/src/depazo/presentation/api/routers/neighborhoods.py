from fastapi import APIRouter

from depazo.application.use_cases.list_neighborhoods import ListNeighborhoods
from depazo.presentation.api.dependencies import CurrentUser, Dependencies
from depazo.presentation.api.schemas import NeighborhoodsBody

router = APIRouter(prefix="/neighborhoods", tags=["neighborhoods"])


@router.get("")
async def list_neighborhoods(user: CurrentUser, dependencies: Dependencies) -> NeighborhoodsBody:
    summaries = await ListNeighborhoods(dependencies.open_unit_of_work).execute()
    return NeighborhoodsBody.from_domain(summaries)
