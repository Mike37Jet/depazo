import json
from decimal import Decimal
from pathlib import Path

import pytest

from depazo.domain.listing import Listing
from depazo.infrastructure.sources.capture.capture_file import (
    MAX_CAPTURE_FILE_BYTES,
    MAX_CAPTURE_MESSAGE_BYTES,
    MAX_CAPTURE_MESSAGE_LISTINGS,
    CapturedFileListingSource,
    CapturedMessageListingSource,
    InvalidCaptureFileError,
    read_capture_message,
)
from tests.builders import a_capture, a_captured_listing


async def collect(path: Path) -> list[Listing]:
    return [listing async for listing in CapturedFileListingSource(path).listings(max_pages=1)]


async def collect_message(content: bytes) -> list[Listing]:
    source = CapturedMessageListingSource(read_capture_message(content))
    return [listing async for listing in source.listings(max_pages=1)]


async def test_imports_listings_exported_by_the_extension(browser_capture_path: Path) -> None:
    listings = await collect(browser_capture_path)

    first = listings[0]
    assert first.source == "plusvalia"
    assert first.external_id == "151448881"
    assert first.monthly_rent_usd == Decimal(1100)
    assert first.condo_fee_usd == Decimal(1)
    assert first.area_m2 == Decimal(102)
    assert first.neighborhood == "La Carolina"


async def test_discards_implausible_area(browser_capture_path: Path) -> None:
    listings = await collect(browser_capture_path)

    assert listings[1].area_m2 is None


async def test_skips_listings_whose_url_is_outside_the_portal(browser_capture_path: Path) -> None:
    listings = await collect(browser_capture_path)

    assert [listing.external_id for listing in listings] == [
        "151448881",
        "151196219",
        "2135556347218642",
    ]


async def test_drops_images_from_untrusted_hosts(
    browser_capture_path: Path, tmp_path: Path
) -> None:
    capture = json.loads(browser_capture_path.read_text(encoding="utf-8"))
    capture["listings"][0]["imageUrl"] = "https://evil.test/a.jpg"
    path = tmp_path / "capture.json"
    path.write_text(json.dumps(capture), encoding="utf-8")

    listings = await collect(path)

    assert listings[0].image_url is None


async def test_rejects_files_with_unexpected_fields(
    browser_capture_path: Path, tmp_path: Path
) -> None:
    capture = json.loads(browser_capture_path.read_text(encoding="utf-8"))
    capture["listings"][0]["advertiserPhone"] = "0999999999"
    path = tmp_path / "capture.json"
    path.write_text(json.dumps(capture), encoding="utf-8")

    with pytest.raises(InvalidCaptureFileError):
        await collect(path)


async def test_rejects_files_that_are_not_captures(tmp_path: Path) -> None:
    path = tmp_path / "capture.json"
    path.write_text('{"hello": "world"}', encoding="utf-8")

    with pytest.raises(InvalidCaptureFileError):
        await collect(path)


async def test_rejects_oversized_files(tmp_path: Path) -> None:
    path = tmp_path / "capture.json"
    path.write_bytes(b" " * (MAX_CAPTURE_FILE_BYTES + 1))

    with pytest.raises(InvalidCaptureFileError):
        await collect(path)


async def test_reports_missing_files(tmp_path: Path) -> None:
    with pytest.raises(InvalidCaptureFileError):
        await collect(tmp_path / "missing.json")


async def test_imports_marketplace_listings_with_signed_images(browser_capture_path: Path) -> None:
    listings = await collect(browser_capture_path)

    marketplace = listings[-1]
    assert marketplace.source == "marketplace"
    assert marketplace.url == "https://www.facebook.com/marketplace/item/2135556347218642/"
    assert marketplace.image_url is not None
    assert "fbcdn.net" in marketplace.image_url


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.com\\@www.plusvalia.com/x",
        "https://user:secret@www.plusvalia.com/x",
        "https://evil.com@www.plusvalia.com/x",
        "https://www.plusvalia.com:8443/x",
        "https://www.plusvalia.com:443/x",
        "https://www.plusvalia.com/a b",
        "https://www.plusvalia.com/a\tb",
        " https://www.plusvalia.com/x",
        "https://www.plusvalia.com/x\n",
        "https://www.plusvalia.com/\u0000x",
        "https://www.plusvalia.com/\u200bx",
        "https://www.plusvalia.com\\x",
        "https://WWW.PLUSVALIA.COM/x",
        "https://www.plusvalia.com.evil.com/x",
        "https://evilwww.plusvalia.com/x",
        "https://[::1]/x",
        "https:www.plusvalia.com/x",
        "http://www.plusvalia.com/x",
    ],
)
async def test_skips_listings_whose_url_is_not_strictly_on_the_portal(url: str) -> None:
    listings = await collect_message(a_capture(a_captured_listing(url=url)))

    assert listings == []


async def test_keeps_the_query_of_a_listing_url_on_the_portal() -> None:
    url = "https://www.plusvalia.com/propiedades/clasificado/x-1.html?utm=a"

    listings = await collect_message(a_capture(a_captured_listing(url=url)))

    assert [listing.url for listing in listings] == [url]


@pytest.mark.parametrize(
    "image_url",
    [
        "https://evil.com\\@img.naventcdn.com/a.jpg",
        "https://user:secret@img.naventcdn.com/a.jpg",
        "https://img.naventcdn.com:8443/a.jpg",
        "https://img.naventcdn.com/a b.jpg",
        "https://img.naventcdn.com/a\u0007.jpg",
        "https://img.naventcdn.com.evil.com/a.jpg",
        "https://evilnaventcdn.com/a.jpg",
        "http://img.naventcdn.com/a.jpg",
    ],
)
async def test_drops_images_whose_url_is_not_strictly_on_the_image_host(image_url: str) -> None:
    listings = await collect_message(a_capture(a_captured_listing(imageUrl=image_url)))

    assert [listing.image_url for listing in listings] == [None]


async def test_removes_phone_numbers_from_the_title_and_the_neighborhood() -> None:
    record = a_captured_listing(
        title="Suite amoblada 0989028226 llamar",
        neighborhood="La Floresta +593 98 902 8226",
    )

    listings = await collect_message(a_capture(record))

    assert listings[0].title == "Suite amoblada llamar"
    assert listings[0].neighborhood == "La Floresta"


async def test_leaves_no_neighborhood_when_it_was_only_a_phone_number() -> None:
    listings = await collect_message(a_capture(a_captured_listing(neighborhood="0989028226")))

    assert listings[0].neighborhood is None


async def test_removes_phone_numbers_from_imported_files(tmp_path: Path) -> None:
    path = tmp_path / "capture.json"
    path.write_bytes(a_capture(a_captured_listing(title="Departamento 02-245-1234")))

    listings = await collect(path)

    assert listings[0].title == "Departamento"


async def test_reads_listings_from_a_capture_message() -> None:
    listings = await collect_message(a_capture(a_captured_listing()))

    assert [(listing.source, listing.external_id) for listing in listings] == [
        ("plusvalia", "151448881")
    ]


def test_rejects_messages_with_listings_from_other_sources() -> None:
    marketplace = a_captured_listing(
        source="marketplace",
        url="https://www.facebook.com/marketplace/item/1/",
        imageUrl=None,
    )

    with pytest.raises(InvalidCaptureFileError):
        read_capture_message(a_capture(a_captured_listing(), marketplace))


def test_accepts_messages_with_the_maximum_number_of_listings() -> None:
    records = [
        a_captured_listing(externalId=str(number)) for number in range(MAX_CAPTURE_MESSAGE_LISTINGS)
    ]

    capture = read_capture_message(a_capture(*records))

    assert len(capture.listings) == MAX_CAPTURE_MESSAGE_LISTINGS


def test_rejects_messages_with_too_many_listings() -> None:
    records = [
        a_captured_listing(externalId=str(number))
        for number in range(MAX_CAPTURE_MESSAGE_LISTINGS + 1)
    ]

    with pytest.raises(InvalidCaptureFileError):
        read_capture_message(a_capture(*records))


def test_rejects_oversized_messages() -> None:
    with pytest.raises(InvalidCaptureFileError):
        read_capture_message(b" " * (MAX_CAPTURE_MESSAGE_BYTES + 1))


@pytest.mark.parametrize("content", [b"\xff\xfe{}", b"not json", b'{"hello": "world"}', b"[]"])
def test_rejects_messages_that_are_not_captures(content: bytes) -> None:
    with pytest.raises(InvalidCaptureFileError):
        read_capture_message(content)


@pytest.mark.parametrize("field", ["title", "neighborhood", "city"])
async def test_replaces_characters_the_database_cannot_store_in_texts(field: str) -> None:
    record = a_captured_listing(**{field: "La\u0000Carolina\u001f norte"})

    listings = await collect_message(a_capture(record))

    assert getattr(listings[0], field) == "La Carolina norte"


async def test_removes_phone_numbers_from_the_city() -> None:
    record = a_captured_listing(city="Quito 0991234567")

    listings = await collect_message(a_capture(record))

    assert listings[0].city == "Quito"


async def test_leaves_no_city_when_it_was_only_a_phone_number() -> None:
    listings = await collect_message(a_capture(a_captured_listing(city="0991234567")))

    assert listings[0].city is None


@pytest.mark.parametrize("title", ["0991234567", "\u0000", "+593 99 123 4567 \u0000"])
async def test_skips_only_the_listing_whose_title_has_nothing_left(title: str) -> None:
    nameless = a_captured_listing(externalId="1", title=title)
    named = a_captured_listing(externalId="2")

    listings = await collect_message(a_capture(nameless, named))

    assert [listing.external_id for listing in listings] == ["2"]
