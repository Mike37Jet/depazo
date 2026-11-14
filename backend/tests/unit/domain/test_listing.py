from decimal import Decimal

import pytest
from hypothesis import given
from hypothesis import strategies as st

from depazo.domain.listing import (
    MAX_PLAUSIBLE_APARTMENT_AREA_M2,
    MAX_PLAUSIBLE_MONTHLY_RENT_USD,
    MIN_PLAUSIBLE_APARTMENT_AREA_M2,
    MIN_PLAUSIBLE_MONTHLY_RENT_USD,
    GeoPoint,
    InvalidListingError,
    plausible_apartment_area,
)
from tests.builders import a_listing


def test_rejects_negative_rent() -> None:
    with pytest.raises(InvalidListingError):
        a_listing(monthly_rent_usd=Decimal(-1))


def test_rejects_negative_condo_fee() -> None:
    with pytest.raises(InvalidListingError):
        a_listing(condo_fee_usd=Decimal(-1))


def test_rejects_negative_bedrooms() -> None:
    with pytest.raises(InvalidListingError):
        a_listing(bedrooms=-1)


def test_rejects_listing_without_external_id() -> None:
    with pytest.raises(InvalidListingError):
        a_listing(external_id="")


@pytest.mark.parametrize(("latitude", "longitude"), [(91.0, 0.0), (0.0, -181.0)])
def test_rejects_coordinates_out_of_range(latitude: float, longitude: float) -> None:
    with pytest.raises(InvalidListingError):
        GeoPoint(latitude=latitude, longitude=longitude)


def test_discards_implausible_apartment_area() -> None:
    assert plausible_apartment_area(Decimal(82000)) is None


def test_keeps_plausible_apartment_area() -> None:
    assert plausible_apartment_area(Decimal("301.4")) == Decimal("301.4")


@given(st.decimals(min_value=0, max_value=100_000, allow_nan=False, places=1))
def test_plausible_area_is_either_discarded_or_within_bounds(area: Decimal) -> None:
    result = plausible_apartment_area(area)

    assert (
        result is None
        or MIN_PLAUSIBLE_APARTMENT_AREA_M2 <= result <= MAX_PLAUSIBLE_APARTMENT_AREA_M2
    )


@given(st.decimals(min_value=0, max_value=1_000_000, allow_nan=False, places=0))
def test_plausible_rent_matches_rental_bounds(rent: Decimal) -> None:
    listing = a_listing(monthly_rent_usd=rent)

    is_within_bounds = MIN_PLAUSIBLE_MONTHLY_RENT_USD <= rent <= MAX_PLAUSIBLE_MONTHLY_RENT_USD
    assert listing.has_plausible_rent == is_within_bounds


def test_listing_without_price_has_plausible_rent() -> None:
    assert a_listing(monthly_rent_usd=None).has_plausible_rent
