from dataclasses import replace
from decimal import Decimal
from typing import Any

from depazo.domain.listing import GeoPoint, Listing
from depazo.domain.search_profile import SearchProfile

DEFAULT_LISTING = Listing(
    source="test-source",
    external_id="listing-1",
    url="https://example.test/listing-1",
    title="Departamento en La Carolina, Quito",
    description="Departamento luminoso",
    monthly_rent_usd=Decimal(720),
    condo_fee_usd=Decimal(80),
    area_m2=Decimal(95),
    bedrooms=2,
    bathrooms=2,
    neighborhood="La Carolina",
    city="Quito",
    location=GeoPoint(latitude=-0.18, longitude=-78.48),
    image_url=None,
)


def a_listing(**overrides: Any) -> Listing:
    return replace(DEFAULT_LISTING, **overrides)


DEFAULT_PROFILE = SearchProfile(max_monthly_cost_usd=Decimal(1000))


def a_profile(**overrides: Any) -> SearchProfile:
    return replace(DEFAULT_PROFILE, **overrides)
