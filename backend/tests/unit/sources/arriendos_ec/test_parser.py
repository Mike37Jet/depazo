from decimal import Decimal

import pytest

from depazo.infrastructure.sources.arriendos_ec.parser import (
    UnreadableFeedError,
    extract_neighborhood,
    parse_feed,
)

FEED_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Arriendos</title>{items}</channel></rss>"""


def an_item(
    title: str = "Departamento de 2 Habitaciones \u2013 Sector La Carolina (Quito)",
    description: str = "Departamento de 2 habitaciones y 1 baño por $500/mes.",
    link: str = "https://arriendos.ec/propiedades/depa-la-carolina",
    category: str = "Departamentos",
) -> str:
    return (
        f"<item><title>{title}</title><link>{link}</link>"
        f"<description><![CDATA[{description}]]></description>"
        f"<category>{category}</category></item>"
    )


def a_feed(*items: str) -> str:
    return FEED_TEMPLATE.format(items="".join(items))


def test_keeps_only_apartments_in_quito(arriendos_ec_feed_xml: str) -> None:
    listings = parse_feed(arriendos_ec_feed_xml)

    assert len(listings) == 6
    assert all(listing.city == "Quito" for listing in listings)
    assert all(listing.source == "arriendos_ec" for listing in listings)


def test_reads_price_rooms_area_and_place_from_the_text(arriendos_ec_feed_xml: str) -> None:
    listing = next(
        listing
        for listing in parse_feed(arriendos_ec_feed_xml)
        if listing.neighborhood == "Ponciano Alto"
    )

    assert listing.monthly_rent_usd == Decimal(320)
    assert listing.bedrooms == 3
    assert listing.bathrooms == 2
    assert listing.area_m2 == Decimal(100)
    assert listing.url.startswith("https://arriendos.ec/propiedades/")
    assert listing.image_url is not None
    assert listing.image_url.startswith("https://arriendos.ec/storage/")


def test_reads_spanish_thousands_in_prices(arriendos_ec_feed_xml: str) -> None:
    prices = {listing.monthly_rent_usd for listing in parse_feed(arriendos_ec_feed_xml)}

    assert Decimal(1150) in prices


def test_takes_the_price_from_the_title_when_the_description_has_none() -> None:
    feed = a_feed(
        an_item(
            title="Suite con Garaje Av. Shyris | Sector El Coral Quito $450",
            description="Suite con garaje \u2013 Av. de los Shyris (Sector El Coral, Quito)",
            category="Suites",
        )
    )

    listing = parse_feed(feed)[0]

    assert listing.monthly_rent_usd == Decimal(450)
    assert listing.neighborhood == "El Coral"


def test_never_keeps_the_advertisers_contact(arriendos_ec_feed_xml: str) -> None:
    listings = parse_feed(arriendos_ec_feed_xml)

    assert not any("@" in f"{listing.title} {listing.description}" for listing in listings)


@pytest.mark.parametrize(
    "item",
    [
        an_item(category="Oficinas"),
        an_item(title="Departamento \u2013 Urbanor (Guayaquil)", description="por $300/mes"),
        an_item(link="https://otro-sitio.example/propiedades/x"),
        an_item(link="javascript:alert(1)"),
    ],
    ids=["office", "other-city", "foreign-link", "script-link"],
)
def test_skips_items_that_are_not_quito_apartments_on_the_site(item: str) -> None:
    assert parse_feed(a_feed(item)) == []


def test_shortens_long_slugs_into_stable_ids() -> None:
    link = "https://arriendos.ec/propiedades/" + "departamento-muy-largo-" * 5

    first = parse_feed(a_feed(an_item(link=link)))[0].external_id
    second = parse_feed(a_feed(an_item(link=link)))[0].external_id

    assert len(first) <= 64
    assert first == second


@pytest.mark.parametrize(
    ("title", "description", "expected"),
    [
        ("Departamento \u2013 Sector La Carolina (Quito)", "", "La Carolina"),
        ("Departamento \u2013 Cumbayá (A Pasos de la USFQ)", "", "Cumbayá"),
        ("Departamento \u2013 Av. Galo Plaza (Norte de Quito)", "", None),
        ("Departamento amplio", "En el sector El Batán (Quito).", "El Batán"),
        ("Departamento amplio", "Sin datos de ubicación", None),
    ],
)
def test_extracts_the_neighborhood(title: str, description: str, expected: str | None) -> None:
    assert extract_neighborhood(title, description) == expected


@pytest.mark.parametrize(
    "xml",
    [
        "<html><body>Mantenimiento</body></html>",
        "not xml at all",
        '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "x">]><rss><channel/></rss>',
    ],
    ids=["html", "garbage", "entities"],
)
def test_refuses_documents_that_are_not_a_plain_rss_feed(xml: str) -> None:
    with pytest.raises(UnreadableFeedError):
        parse_feed(xml)
