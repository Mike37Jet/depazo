from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

from depazo.application.use_cases.rank_listings import RankedListing, RankingReport
from depazo.domain.listing import Listing
from depazo.domain.neighborhoods import NeighborhoodSummary
from depazo.domain.scoring import CriterionScore
from depazo.domain.search_profile import ScoreWeights, SearchProfile

AsNumber = PlainSerializer(float, return_type=float, when_used="json")
Amount = Annotated[Decimal, Field(gt=0, le=100_000, decimal_places=2), AsNumber]
Weight = Annotated[Decimal, Field(ge=0, le=10, decimal_places=2), AsNumber]
RoomCount = Annotated[int, Field(ge=0, le=20)]
Neighborhood = Annotated[str, Field(min_length=1, max_length=120)]
Neighborhoods = Annotated[list[Neighborhood], Field(max_length=100)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class WeightsBody(StrictModel):
    price: Weight = Decimal("0.5")
    area: Weight = Decimal("0.25")
    neighborhood: Weight = Decimal("0.25")


class SearchProfileBody(StrictModel):
    max_monthly_cost_usd: Amount
    min_monthly_cost_usd: Amount | None = None
    is_condo_fee_in_budget: bool = True
    min_bedrooms: RoomCount | None = None
    min_bathrooms: RoomCount | None = None
    min_area_m2: Annotated[Decimal, Field(gt=0, le=2000, decimal_places=2), AsNumber] | None = None
    preferred_neighborhoods: Neighborhoods = []
    excluded_neighborhoods: Neighborhoods = []
    weights: WeightsBody = WeightsBody()
    min_score: Annotated[int, Field(ge=0, le=100)] = 60

    def to_domain(self) -> SearchProfile:
        return SearchProfile(
            max_monthly_cost_usd=self.max_monthly_cost_usd,
            min_monthly_cost_usd=self.min_monthly_cost_usd,
            is_condo_fee_in_budget=self.is_condo_fee_in_budget,
            min_bedrooms=self.min_bedrooms,
            min_bathrooms=self.min_bathrooms,
            min_area_m2=self.min_area_m2,
            preferred_neighborhoods=frozenset(self.preferred_neighborhoods),
            excluded_neighborhoods=frozenset(self.excluded_neighborhoods),
            weights=ScoreWeights(
                price=self.weights.price,
                area=self.weights.area,
                neighborhood=self.weights.neighborhood,
            ),
            min_score=self.min_score,
        )

    @classmethod
    def from_domain(cls, profile: SearchProfile) -> "SearchProfileBody":
        return cls(
            max_monthly_cost_usd=profile.max_monthly_cost_usd,
            min_monthly_cost_usd=profile.min_monthly_cost_usd,
            is_condo_fee_in_budget=profile.is_condo_fee_in_budget,
            min_bedrooms=profile.min_bedrooms,
            min_bathrooms=profile.min_bathrooms,
            min_area_m2=profile.min_area_m2,
            preferred_neighborhoods=sorted(profile.preferred_neighborhoods),
            excluded_neighborhoods=sorted(profile.excluded_neighborhoods),
            weights=WeightsBody(
                price=profile.weights.price,
                area=profile.weights.area,
                neighborhood=profile.weights.neighborhood,
            ),
            min_score=profile.min_score,
        )


class ListingBody(StrictModel):
    source: str
    external_id: str
    url: str
    title: str
    description: str
    monthly_rent_usd: float | None
    condo_fee_usd: float | None
    area_m2: float | None
    bedrooms: int | None
    bathrooms: int | None
    neighborhood: str | None
    city: str | None
    latitude: float | None
    longitude: float | None
    image_url: str | None

    @classmethod
    def from_domain(cls, listing: Listing) -> "ListingBody":
        return cls(
            source=listing.source,
            external_id=listing.external_id,
            url=listing.url,
            title=listing.title,
            description=listing.description,
            monthly_rent_usd=_as_float(listing.monthly_rent_usd),
            condo_fee_usd=_as_float(listing.condo_fee_usd),
            area_m2=_as_float(listing.area_m2),
            bedrooms=listing.bedrooms,
            bathrooms=listing.bathrooms,
            neighborhood=listing.neighborhood,
            city=listing.city,
            latitude=listing.location.latitude if listing.location else None,
            longitude=listing.location.longitude if listing.location else None,
            image_url=listing.image_url,
        )


class CriterionBody(StrictModel):
    criterion: str
    value: float
    weight: float

    @classmethod
    def from_domain(cls, criterion: CriterionScore) -> "CriterionBody":
        return cls(
            criterion=criterion.criterion.value,
            value=float(criterion.value),
            weight=float(criterion.weight),
        )


class MatchBody(StrictModel):
    score: int
    breakdown: list[CriterionBody]
    listing: ListingBody

    @classmethod
    def from_domain(cls, match: RankedListing) -> "MatchBody":
        return cls(
            score=match.result.total,
            breakdown=[CriterionBody.from_domain(item) for item in match.result.breakdown],
            listing=ListingBody.from_domain(match.listing),
        )


class MatchesBody(StrictModel):
    matches: list[MatchBody]
    match_count: int
    evaluated_count: int
    rejected_count: int

    @classmethod
    def from_report(cls, report: RankingReport, limit: int) -> "MatchesBody":
        return cls(
            matches=[MatchBody.from_domain(match) for match in report.matches[:limit]],
            match_count=len(report.matches),
            evaluated_count=report.evaluated_count,
            rejected_count=report.rejected_count,
        )


class NeighborhoodBody(StrictModel):
    name: str
    listing_count: int


class NeighborhoodsBody(StrictModel):
    neighborhoods: list[NeighborhoodBody]

    @classmethod
    def from_domain(cls, summaries: list[NeighborhoodSummary]) -> "NeighborhoodsBody":
        return cls(
            neighborhoods=[
                NeighborhoodBody(name=summary.name, listing_count=summary.listing_count)
                for summary in summaries
            ]
        )


def _as_float(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None
