from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Response, status

from depazo.application.use_cases.manage_search_profile import GetSearchProfile, SaveSearchProfile
from depazo.application.use_cases.rank_user_matches import (
    ListSavedListings,
    RankUserMatches,
    SearchProfileNotFoundError,
)
from depazo.application.use_cases.react_to_listing import (
    ClearListingReaction,
    ListingNotFoundError,
    ReactToListing,
)
from depazo.domain.listing_reaction import ListingKey
from depazo.domain.search_profile import InvalidSearchProfileError
from depazo.presentation.api.dependencies import CurrentUser, Dependencies
from depazo.presentation.api.schemas import (
    MatchesBody,
    ReactionBody,
    SavedListingsBody,
    SearchProfileBody,
)

MAX_MATCHES_PER_PAGE = 100

Source = Annotated[str, Path(min_length=1, max_length=40)]
ExternalId = Annotated[str, Path(min_length=1, max_length=64)]

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


@router.get("/saved-listings")
async def list_saved_listings(user: CurrentUser, dependencies: Dependencies) -> SavedListingsBody:
    try:
        saved = await ListSavedListings(dependencies.open_unit_of_work).execute(user.user_id)
    except SearchProfileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="no search profile yet"
        ) from error
    return SavedListingsBody.from_domain(saved)


@router.put("/listings/{source}/{external_id}/reaction", status_code=status.HTTP_204_NO_CONTENT)
async def react_to_listing(
    source: Source,
    external_id: ExternalId,
    body: ReactionBody,
    user: CurrentUser,
    dependencies: Dependencies,
) -> Response:
    react = ReactToListing(dependencies.open_unit_of_work, dependencies.clock)
    try:
        await react.execute(user.user_id, ListingKey(source, external_id), body.reaction)
    except ListingNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="listing not found"
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/listings/{source}/{external_id}/reaction", status_code=status.HTTP_204_NO_CONTENT)
async def clear_listing_reaction(
    source: Source, external_id: ExternalId, user: CurrentUser, dependencies: Dependencies
) -> Response:
    await ClearListingReaction(dependencies.open_unit_of_work).execute(
        user.user_id, ListingKey(source, external_id)
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
