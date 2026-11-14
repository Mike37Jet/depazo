from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from depazo.domain.listing import Listing
from depazo.domain.search_profile import normalize_place_name


@dataclass(frozen=True, slots=True)
class NeighborhoodSummary:
    name: str
    listing_count: int


def summarize_neighborhoods(listings: Iterable[Listing]) -> list[NeighborhoodSummary]:
    spellings: defaultdict[str, Counter[str]] = defaultdict(Counter)
    for listing in listings:
        name = " ".join((listing.neighborhood or "").split())
        if name:
            spellings[normalize_place_name(name)][name] += 1
    summaries = [
        NeighborhoodSummary(name=counter.most_common(1)[0][0], listing_count=counter.total())
        for counter in spellings.values()
    ]
    return sorted(
        summaries, key=lambda summary: (-summary.listing_count, normalize_place_name(summary.name))
    )
