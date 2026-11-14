from dataclasses import dataclass
from enum import StrEnum

from depazo.domain.listing import Listing
from depazo.domain.scoring import ScoreResult


class AlertKind(StrEnum):
    NEW = "new"
    NEW_PRICE = "new_price"


@dataclass(frozen=True, slots=True)
class ListingAlert:
    listing: Listing
    result: ScoreResult
    kind: AlertKind
