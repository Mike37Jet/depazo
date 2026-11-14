from enum import StrEnum

from depazo.domain.listing import Listing


class SightingOutcome(StrEnum):
    NEW = "new"
    PRICE_CHANGED = "price_changed"
    UNCHANGED = "unchanged"


def classify_sighting(previous: Listing | None, current: Listing) -> SightingOutcome:
    if previous is None:
        return SightingOutcome.NEW
    if (previous.monthly_rent_usd, previous.condo_fee_usd) != (
        current.monthly_rent_usd,
        current.condo_fee_usd,
    ):
        return SightingOutcome.PRICE_CHANGED
    return SightingOutcome.UNCHANGED
