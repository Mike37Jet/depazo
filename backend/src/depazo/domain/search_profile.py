import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal

MAX_SCORE_THRESHOLD = 100


class InvalidSearchProfileError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class ScoreWeights:
    price: Decimal = Decimal("0.5")
    area: Decimal = Decimal("0.25")
    neighborhood: Decimal = Decimal("0.25")

    def __post_init__(self) -> None:
        weights = (self.price, self.area, self.neighborhood)
        if any(weight < 0 for weight in weights) or sum(weights) == 0:
            raise InvalidSearchProfileError("weights must be non-negative and not all zero")


@dataclass(frozen=True, slots=True)
class SearchProfile:
    max_monthly_cost_usd: Decimal
    min_monthly_cost_usd: Decimal | None = None
    is_condo_fee_in_budget: bool = True
    min_bedrooms: int | None = None
    max_bedrooms: int | None = None
    min_bathrooms: int | None = None
    min_area_m2: Decimal | None = None
    preferred_neighborhoods: frozenset[str] = field(default_factory=frozenset)
    excluded_neighborhoods: frozenset[str] = field(default_factory=frozenset)
    weights: ScoreWeights = field(default_factory=ScoreWeights)
    min_score: int = 60

    def __post_init__(self) -> None:
        if self.max_monthly_cost_usd <= 0:
            raise InvalidSearchProfileError("max monthly cost must be positive")
        if self.min_monthly_cost_usd is not None and not (
            0 <= self.min_monthly_cost_usd <= self.max_monthly_cost_usd
        ):
            raise InvalidSearchProfileError("min monthly cost must be between 0 and the max")
        if self.min_area_m2 is not None and self.min_area_m2 <= 0:
            raise InvalidSearchProfileError("min area must be positive")
        if any(
            count is not None and count < 0
            for count in (self.min_bedrooms, self.max_bedrooms, self.min_bathrooms)
        ):
            raise InvalidSearchProfileError("room counts cannot be negative")
        if (
            self.min_bedrooms is not None
            and self.max_bedrooms is not None
            and self.max_bedrooms < self.min_bedrooms
        ):
            raise InvalidSearchProfileError("max bedrooms cannot be below min bedrooms")
        if not 0 <= self.min_score <= MAX_SCORE_THRESHOLD:
            raise InvalidSearchProfileError("min score must be between 0 and 100")
        overlapping = _normalized(self.preferred_neighborhoods) & _normalized(
            self.excluded_neighborhoods
        )
        if overlapping:
            raise InvalidSearchProfileError(
                f"neighborhoods both preferred and excluded: {', '.join(sorted(overlapping))}"
            )

    def prefers(self, neighborhood: str) -> bool:
        return normalize_place_name(neighborhood) in _normalized(self.preferred_neighborhoods)

    def excludes(self, neighborhood: str) -> bool:
        return normalize_place_name(neighborhood) in _normalized(self.excluded_neighborhoods)


def normalize_place_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(without_accents.casefold().split())


def _normalized(names: frozenset[str]) -> frozenset[str]:
    return frozenset(normalize_place_name(name) for name in names)
