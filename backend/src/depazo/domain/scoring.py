from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

from depazo.domain.listing import Listing
from depazo.domain.search_profile import SearchProfile

FULL_PRICE_SCORE_BUDGET_SHARE = Decimal("0.6")
FULL_AREA_SCORE_MINIMUM_MULTIPLE = Decimal("1.5")
NEUTRAL_VALUE = Decimal("0.5")
MAX_TOTAL = 100


class RejectionReason(StrEnum):
    PRICE_UNKNOWN = "price_unknown"
    OVER_BUDGET = "over_budget"
    UNDER_MINIMUM_PRICE = "under_minimum_price"
    TOO_FEW_BEDROOMS = "too_few_bedrooms"
    TOO_FEW_BATHROOMS = "too_few_bathrooms"
    TOO_SMALL = "too_small"
    EXCLUDED_NEIGHBORHOOD = "excluded_neighborhood"


class Criterion(StrEnum):
    PRICE = "price"
    AREA = "area"
    NEIGHBORHOOD = "neighborhood"


@dataclass(frozen=True, slots=True)
class CriterionScore:
    criterion: Criterion
    value: Decimal
    weight: Decimal


@dataclass(frozen=True, slots=True)
class ScoreResult:
    total: int
    rejection_reasons: tuple[RejectionReason, ...]
    breakdown: tuple[CriterionScore, ...]

    @property
    def passed_hard_filters(self) -> bool:
        return not self.rejection_reasons


def monthly_cost_usd(listing: Listing, profile: SearchProfile) -> Decimal | None:
    if listing.monthly_rent_usd is None:
        return None
    condo_fee = listing.condo_fee_usd if profile.is_condo_fee_in_budget else None
    return listing.monthly_rent_usd + (condo_fee or Decimal(0))


def score_listing(listing: Listing, profile: SearchProfile) -> ScoreResult:
    cost = monthly_cost_usd(listing, profile)
    rejection_reasons = _rejection_reasons(listing, profile, cost)
    if rejection_reasons or cost is None:
        return ScoreResult(total=0, rejection_reasons=rejection_reasons, breakdown=())
    breakdown = tuple(
        criterion_score
        for criterion_score in (
            _price_score(cost, profile),
            _area_score(listing, profile),
            _neighborhood_score(listing, profile),
        )
        if criterion_score is not None
    )
    return ScoreResult(total=_weighted_total(breakdown), rejection_reasons=(), breakdown=breakdown)


def _rejection_reasons(
    listing: Listing, profile: SearchProfile, cost: Decimal | None
) -> tuple[RejectionReason, ...]:
    checks = (
        (cost is None, RejectionReason.PRICE_UNKNOWN),
        (cost is not None and cost > profile.max_monthly_cost_usd, RejectionReason.OVER_BUDGET),
        (
            cost is not None
            and profile.min_monthly_cost_usd is not None
            and cost < profile.min_monthly_cost_usd,
            RejectionReason.UNDER_MINIMUM_PRICE,
        ),
        (_is_below(listing.bedrooms, profile.min_bedrooms), RejectionReason.TOO_FEW_BEDROOMS),
        (_is_below(listing.bathrooms, profile.min_bathrooms), RejectionReason.TOO_FEW_BATHROOMS),
        (_is_below(listing.area_m2, profile.min_area_m2), RejectionReason.TOO_SMALL),
        (
            listing.neighborhood is not None and profile.excludes(listing.neighborhood),
            RejectionReason.EXCLUDED_NEIGHBORHOOD,
        ),
    )
    return tuple(reason for is_rejected, reason in checks if is_rejected)


def _is_below[Quantity: (int, Decimal)](value: Quantity | None, minimum: Quantity | None) -> bool:
    return value is not None and minimum is not None and value < minimum


def _price_score(cost: Decimal, profile: SearchProfile) -> CriterionScore:
    full_score_cost = profile.max_monthly_cost_usd * FULL_PRICE_SCORE_BUDGET_SHARE
    span = profile.max_monthly_cost_usd - full_score_cost
    value = _clamp((profile.max_monthly_cost_usd - cost) / span)
    return CriterionScore(Criterion.PRICE, value, profile.weights.price)


def _area_score(listing: Listing, profile: SearchProfile) -> CriterionScore | None:
    if profile.min_area_m2 is None:
        return None
    if listing.area_m2 is None:
        return CriterionScore(Criterion.AREA, NEUTRAL_VALUE, profile.weights.area)
    span = profile.min_area_m2 * (FULL_AREA_SCORE_MINIMUM_MULTIPLE - 1)
    value = _clamp((listing.area_m2 - profile.min_area_m2) / span)
    return CriterionScore(Criterion.AREA, value, profile.weights.area)


def _neighborhood_score(listing: Listing, profile: SearchProfile) -> CriterionScore | None:
    if not profile.preferred_neighborhoods:
        return None
    if listing.neighborhood is None:
        value = NEUTRAL_VALUE
    else:
        value = Decimal(1) if profile.prefers(listing.neighborhood) else Decimal(0)
    return CriterionScore(Criterion.NEIGHBORHOOD, value, profile.weights.neighborhood)


def _weighted_total(breakdown: tuple[CriterionScore, ...]) -> int:
    total_weight = sum((criterion.weight for criterion in breakdown), Decimal(0))
    if total_weight == 0:
        return MAX_TOTAL
    weighted_sum = sum((criterion.value * criterion.weight for criterion in breakdown), Decimal(0))
    total = weighted_sum / total_weight * MAX_TOTAL
    return int(total.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _clamp(value: Decimal) -> Decimal:
    return min(Decimal(1), max(Decimal(0), value))
