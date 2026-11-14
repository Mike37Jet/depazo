import json
from decimal import Decimal

import pytest

from depazo.domain.listing import Listing
from depazo.infrastructure.sources.marketplace.parser import (
    UnreadablePageError,
    parse_listing_page,
)

KEYCAP_PHONE_NUMBER = "".join(f"{digit}\ufe0f\u20e3" for digit in "0989028226")


def a_node(
    listing_id: str = "1448878229981389",
    title: str = "Arriendo departamento sector La Carolina",
    amount: str = "780.00",
    place: str = "Quito",
    **overrides: object,
) -> dict[str, object]:
    return {
        "id": listing_id,
        "marketplace_listing_title": title,
        "listing_price": {"amount": amount},
        "location": {"reverse_geocode": {"city": place}},
        "is_live": True,
        "is_sold": False,
        "is_pending": False,
        **overrides,
    }


def a_page(*nodes: dict[str, object]) -> str:
    state = {"require": [{"edges": [{"node": {"listing": node}} for node in nodes]}]}
    return f'<html><script type="application/json">{json.dumps(state)}</script></html>'


def the_only_listing(html: str) -> Listing:
    (listing,) = parse_listing_page(html)
    return listing


def test_keeps_only_available_apartments_of_the_category_page(
    marketplace_category_html: str,
) -> None:
    listings = parse_listing_page(marketplace_category_html)

    assert [listing.external_id for listing in listings] == [
        "1184964820710711",
        "2038200320080894",
        "1697974211750730",
        "1920440069399019",
        "1448878229981389",
        "1063199863427785",
    ]
    assert all(listing.source == "marketplace" for listing in listings)
    assert all(listing.city == "Quito" for listing in listings)


def test_keeps_only_apartments_in_the_quito_district_of_the_search_page(
    marketplace_search_html: str,
) -> None:
    listings = parse_listing_page(marketplace_search_html)

    assert len(listings) == 8
    assert {listing.neighborhood for listing in listings} >= {"Rumipamba", "Tumbaco"}


def test_reads_price_rooms_place_and_image(marketplace_search_html: str) -> None:
    listing = next(
        listing
        for listing in parse_listing_page(marketplace_search_html)
        if listing.external_id == "2026813774696638"
    )

    assert listing.monthly_rent_usd == Decimal(850)
    assert listing.bedrooms == 2
    assert listing.bathrooms == 2
    assert listing.neighborhood == "República del Salvador"
    assert listing.url == "https://www.facebook.com/marketplace/item/2026813774696638/"
    assert listing.image_url is not None
    assert listing.image_url.startswith("https://scontent.fuio5-1.fna.fbcdn.net/")


def test_reads_titles_written_with_decorative_letters(marketplace_search_html: str) -> None:
    external_ids = {listing.external_id for listing in parse_listing_page(marketplace_search_html)}

    assert "1442432598086147" in external_ids


def test_never_reads_the_seller(marketplace_search_html: str) -> None:
    listings = parse_listing_page(marketplace_search_html)

    assert "Anunciante de prueba" in marketplace_search_html
    assert all("Anunciante" not in repr(listing) for listing in listings)


@pytest.mark.parametrize("amount", ["0.00", "1.00", "20.00"])
def test_treats_placeholder_prices_as_unknown_rent(amount: str) -> None:
    listing = the_only_listing(a_page(a_node(amount=amount)))

    assert listing.monthly_rent_usd is None


@pytest.mark.parametrize(
    "title",
    [
        "Renta de casa",
        "SE RENTA LOCAL COMERCIAL",
        "Oficina tipo suite en renta",
        "Arriendo terreno",
    ],
)
def test_skips_properties_that_are_not_apartments(title: str) -> None:
    html = a_page(a_node(title=title), a_node(listing_id="2000000000000001"))

    assert [listing.external_id for listing in parse_listing_page(html)] == ["2000000000000001"]


@pytest.mark.parametrize("place", ["Latacunga", "San Miguel de Ibarra", "Sangolqui", ""])
def test_skips_listings_outside_the_quito_district(place: str) -> None:
    html = a_page(a_node(place=place), a_node(listing_id="2000000000000001"))

    assert [listing.external_id for listing in parse_listing_page(html)] == ["2000000000000001"]


@pytest.mark.parametrize("flag", ["is_sold", "is_pending", "is_hidden"])
def test_skips_listings_that_are_no_longer_available(flag: str) -> None:
    html = a_page(a_node() | {flag: True}, a_node(listing_id="2000000000000001"))

    assert [listing.external_id for listing in parse_listing_page(html)] == ["2000000000000001"]


def test_uses_the_parish_as_neighborhood_when_the_title_names_no_sector() -> None:
    listing = the_only_listing(a_page(a_node(title="Arriendo departamento", place="Cumbaya")))

    assert listing.neighborhood == "Cumbaya"


@pytest.mark.parametrize(
    "title",
    [
        "Arriendo departamento sector San Carlos 0989028226",
        f"Arriendo departamento sector San Carlos {KEYCAP_PHONE_NUMBER}",
        "Arriendo departamento sector San Carlos +593 98 902 8226",
        "Arriendo departamento sector San Carlos 02-245-1234",
    ],
)
def test_removes_phone_numbers_from_the_title(title: str) -> None:
    listing = the_only_listing(a_page(a_node(title=title)))

    assert listing.title == "Arriendo departamento sector San Carlos"
    assert listing.neighborhood == "San Carlos"


def test_keeps_areas_and_room_counts_in_the_title() -> None:
    title = "Suite de 65 m2 con 1 dormitorio y 1 baño en $ 450"

    listing = the_only_listing(a_page(a_node(title=title)))

    assert listing.title == title


def test_reads_a_short_sector_name() -> None:
    title = "LOFT EN RENTA SECTOR La Pradera! 📍 cerca del parque"

    listing = the_only_listing(a_page(a_node(title=title)))

    assert listing.neighborhood == "La Pradera"


def test_drops_images_from_untrusted_hosts() -> None:
    photo = {"image": {"uri": "https://evil.test/a.jpg"}}

    listing = the_only_listing(a_page(a_node(primary_listing_photo=photo)))

    assert listing.image_url is None


def test_ignores_nodes_with_an_unexpected_identifier() -> None:
    html = a_page(a_node(listing_id="../../login"), a_node(listing_id="2000000000000001"))

    assert [listing.external_id for listing in parse_listing_page(html)] == ["2000000000000001"]


@pytest.mark.parametrize(
    "html",
    [
        "<html><body>Inicia sesión para continuar</body></html>",
        '<html><script type="application/json">{"marketplace_listing_title": </script></html>',
        a_page(a_node(listing_id="not-a-number")),
    ],
)
def test_fails_when_the_page_has_no_readable_listings(html: str) -> None:
    with pytest.raises(UnreadablePageError):
        parse_listing_page(html)


def test_reports_no_listings_when_none_is_an_apartment() -> None:
    assert parse_listing_page(a_page(a_node(title="Arriendo bodega"))) == []
