import json
from decimal import Decimal
from pathlib import Path

import pytest

from depazo.domain.listing import Listing
from depazo.infrastructure.sources.capture.capture_file import (
    MAX_CAPTURE_FILE_BYTES,
    CapturedFileListingSource,
    InvalidCaptureFileError,
)


async def collect(path: Path) -> list[Listing]:
    return [listing async for listing in CapturedFileListingSource(path).listings(max_pages=1)]


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
