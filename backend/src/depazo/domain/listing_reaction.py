from dataclasses import dataclass
from enum import StrEnum

from depazo.domain.listing import Listing


class Reaction(StrEnum):
    SAVED = "saved"
    DISCARDED = "discarded"


@dataclass(frozen=True, slots=True)
class ListingKey:
    source: str
    external_id: str

    @classmethod
    def of(cls, listing: Listing) -> "ListingKey":
        return cls(source=listing.source, external_id=listing.external_id)
