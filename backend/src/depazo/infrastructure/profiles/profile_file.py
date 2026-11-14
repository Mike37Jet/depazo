from decimal import Decimal
from pathlib import Path
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from depazo.domain.search_profile import InvalidSearchProfileError, ScoreWeights, SearchProfile

MAX_PROFILE_FILE_BYTES = 64 * 1024
MAX_NEIGHBORHOODS = 100

Amount = Annotated[Decimal, Field(gt=0, le=100_000)]
RoomCount = Annotated[int, Field(ge=0, le=20)]
Weight = Annotated[Decimal, Field(ge=0, le=10)]
Neighborhoods = Annotated[
    frozenset[Annotated[str, Field(min_length=1, max_length=120)]],
    Field(max_length=MAX_NEIGHBORHOODS),
]


class InvalidProfileFileError(ValueError):
    pass


class WeightsRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    price: Weight = Decimal("0.5")
    area: Weight = Decimal("0.25")
    neighborhood: Weight = Decimal("0.25")


class SearchProfileDocument(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    max_monthly_cost_usd: Amount
    min_monthly_cost_usd: Amount | None = None
    is_condo_fee_in_budget: bool = True
    min_bedrooms: RoomCount | None = None
    max_bedrooms: RoomCount | None = None
    min_bathrooms: RoomCount | None = None
    min_area_m2: Annotated[Decimal, Field(gt=0, le=2000)] | None = None
    preferred_neighborhoods: Neighborhoods = frozenset()
    excluded_neighborhoods: Neighborhoods = frozenset()
    weights: WeightsRecord = WeightsRecord()
    min_score: Annotated[int, Field(ge=0, le=100)] = 60

    def to_profile(self) -> SearchProfile:
        return SearchProfile(
            max_monthly_cost_usd=self.max_monthly_cost_usd,
            min_monthly_cost_usd=self.min_monthly_cost_usd,
            is_condo_fee_in_budget=self.is_condo_fee_in_budget,
            min_bedrooms=self.min_bedrooms,
            max_bedrooms=self.max_bedrooms,
            min_bathrooms=self.min_bathrooms,
            min_area_m2=self.min_area_m2,
            preferred_neighborhoods=self.preferred_neighborhoods,
            excluded_neighborhoods=self.excluded_neighborhoods,
            weights=ScoreWeights(
                price=self.weights.price,
                area=self.weights.area,
                neighborhood=self.weights.neighborhood,
            ),
            min_score=self.min_score,
        )


def load_search_profile(path: Path) -> SearchProfile:
    try:
        if path.stat().st_size > MAX_PROFILE_FILE_BYTES:
            raise InvalidProfileFileError(f"{path} is larger than {MAX_PROFILE_FILE_BYTES} bytes")
        record = SearchProfileDocument.model_validate_json(path.read_bytes())
        return record.to_profile()
    except OSError as error:
        raise InvalidProfileFileError(f"cannot read {path}") from error
    except (ValidationError, InvalidSearchProfileError) as error:
        raise InvalidProfileFileError(f"{path} is not a valid search profile: {error}") from error
