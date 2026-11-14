from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from depazo.application.use_cases.manage_search_profile import GetSearchProfile, SaveSearchProfile
from depazo.application.use_cases.rank_user_matches import (
    RankUserMatches,
    SearchProfileNotFoundError,
)
from depazo.domain.search_profile import InvalidSearchProfileError
from depazo.presentation.api.dependencies import CurrentUser, Dependencies
from depazo.presentation.api.schemas import MatchesBody, SearchProfileBody

MAX_MATCHES_PER_PAGE = 100

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/search-profile")
async def read_search_profile(user: CurrentUser, dependencies: Dependencies) -> SearchProfileBody:
    profile = await GetSearchProfile(dependencies.open_unit_of_work).execute(user.user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no search profile yet")
    return SearchProfileBody.from_domain(profile)


@router.put("/search-profile")
async def replace_search_profile(
    body: SearchProfileBody, user: CurrentUser, dependencies: Dependencies
) -> SearchProfileBody:
    try:
        profile = body.to_domain()
    except InvalidSearchProfileError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    saved = await SaveSearchProfile(dependencies.open_unit_of_work, dependencies.clock).execute(
        user.user_id, profile
    )
    return SearchProfileBody.from_domain(saved)


@router.get("/matches")
async def list_matches(
    user: CurrentUser,
    dependencies: Dependencies,
    limit: Annotated[int, Query(ge=1, le=MAX_MATCHES_PER_PAGE)] = 20,
) -> MatchesBody:
    try:
        report = await RankUserMatches(dependencies.open_unit_of_work).execute(user.user_id)
    except SearchProfileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="no search profile yet"
        ) from error
    return MatchesBody.from_report(report, limit)
