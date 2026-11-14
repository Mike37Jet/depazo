from decimal import Decimal

import pytest

from depazo.infrastructure.sources.icasas.parser import (
    parse_listing_page,
    parse_spanish_decimal,
    parse_total_results,
)


def test_parses_every_card_on_the_page(icasas_page_html: str) -> None:
    listings = parse_listing_page(icasas_page_html)

    assert len(listings) == 4
    assert all(listing.source == "icasas" for listing in listings)


def test_parses_price_area_rooms_and_location(icasas_page_html: str) -> None:
    listing = parse_listing_page(icasas_page_html)[0]

    assert listing.external_id == "01a1d170-a3cf-7504-847b-9eb47b26c4b1"
    assert listing.url == "https://www.icasas.ec/propiedad/a455-8501-1a1d1f6-9eb47b26c537-758a"
    assert listing.title == "Departamento en Cumbayá, Quito"
    assert listing.monthly_rent_usd == Decimal(1500)
    assert listing.area_m2 == Decimal(255)
    assert listing.bedrooms == 3
    assert listing.bathrooms == 3
    assert listing.neighborhood == "Cumbayá"
    assert listing.city == "Quito"
    assert listing.location is not None
    assert listing.location.latitude == pytest.approx(-0.2151522)


def test_uses_first_part_of_compound_locality_as_neighborhood(icasas_page_html: str) -> None:
    listing = parse_listing_page(icasas_page_html)[1]

    assert listing.neighborhood == "Gonzalez Suarez"
    assert listing.city == "Quito"


def test_parses_area_with_decimal_comma(icasas_page_html: str) -> None:
    listing = parse_listing_page(icasas_page_html)[2]

    assert listing.area_m2 == Decimal("301.4")


def test_discards_implausible_area(icasas_page_html: str) -> None:
    listing = parse_listing_page(icasas_page_html)[3]

    assert listing.area_m2 is None
    assert listing.monthly_rent_usd == Decimal(550)


def test_never_stores_advertiser_names(icasas_page_html: str) -> None:
    listings = parse_listing_page(icasas_page_html)

    assert all("Anunciante" not in repr(listing) for listing in listings)


def test_reads_total_results_from_heading() -> None:
    assert parse_total_results("<h1>553 departamento en arriendo en Quito</h1>") == 553


def test_returns_no_listings_for_page_without_cards() -> None:
    assert parse_listing_page("<html><body><p>Sin resultados</p></body></html>") == []


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("1.350 $destacado", Decimal(1350)),
        ("301,4m2", Decimal("301.4")),
        ("82.000m2", Decimal(82000)),
        ("3", Decimal(3)),
        ("Consultar precio", None),
    ],
)
def test_parses_spanish_formatted_numbers(text: str, expected: Decimal | None) -> None:
    assert parse_spanish_decimal(text) == expected
