from collections.abc import AsyncIterator
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError
from pydantic.alias_generators import to_camel

from depazo.application.ports.listing_source import SourceUnavailableError
from depazo.domain.listing import InvalidListingError, Listing, plausible_apartment_area

CAPTURE_FORMAT = "depazo.capture"
CAPTURE_FORMAT_VERSION = 1
MAX_CAPTURE_FILE_BYTES = 10 * 1024 * 1024
MAX_CAPTURED_LISTINGS = 5000
SOURCE_NAME = "capture"
LISTING_HOSTS = {"plusvalia": "www.plusvalia.com"}
IMAGE_HOST_SUFFIXES = {"plusvalia": ".naventcdn.com"}

Amount = Annotated[Decimal, Field(ge=0, le=1_000_000)]
RoomCount = Annotated[int, Field(ge=0, le=50)]
Place = Annotated[str, Field(min_length=1, max_length=120)]
Url = Annotated[str, Field(max_length=2048)]


class InvalidCaptureFileError(SourceUnavailableError):
    pass


class CapturedListingRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, alias_generator=to_camel)

    source: Literal["plusvalia"]
    external_id: Annotated[str, Field(pattern=r"^[\w-]{1,64}$")]
    url: Url
    title: Annotated[str, Field(min_length=1, max_length=300)]
    monthly_rent_usd: Amount | None
    condo_fee_usd: Amount | None
    area_m2: Annotated[Decimal, Field(gt=0)] | None
    bedrooms: RoomCount | None
    bathrooms: RoomCount | None
    neighborhood: Place | None
    city: Place | None
    image_url: Url | None
    captured_at: AwareDatetime


class CaptureFile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, alias_generator=to_camel)

    format: Literal["depazo.capture"]
    version: Literal[1]
    exported_at: AwareDatetime
    listings: Annotated[tuple[CapturedListingRecord, ...], Field(max_length=MAX_CAPTURED_LISTINGS)]


class CapturedFileListingSource:
    def __init__(self, path: Path) -> None:
        self._path = path

    @property
    def name(self) -> str:
        return SOURCE_NAME

    async def listings(self, max_pages: int) -> AsyncIterator[Listing]:
        for record in read_capture_file(self._path).listings:
            listing = to_listing(record)
            if listing is not None:
                yield listing


def read_capture_file(path: Path) -> CaptureFile:
    try:
        if path.stat().st_size > MAX_CAPTURE_FILE_BYTES:
            raise InvalidCaptureFileError(f"capture file exceeds {MAX_CAPTURE_FILE_BYTES} bytes")
        return CaptureFile.model_validate_json(path.read_bytes())
    except OSError as error:
        raise InvalidCaptureFileError(f"cannot read capture file {path.name}") from error
    except ValidationError as error:
        raise InvalidCaptureFileError(
            f"{path.name} is not a valid depazo capture: {error.error_count()} errors"
        ) from error


def to_listing(record: CapturedListingRecord) -> Listing | None:
    if not _is_https_on_host(record.url, LISTING_HOSTS[record.source]):
        return None
    try:
        return Listing(
            source=record.source,
            external_id=record.external_id,
            url=record.url,
            title=record.title,
            description="",
            monthly_rent_usd=record.monthly_rent_usd,
            condo_fee_usd=record.condo_fee_usd,
            area_m2=plausible_apartment_area(record.area_m2) if record.area_m2 else None,
            bedrooms=record.bedrooms,
            bathrooms=record.bathrooms,
            neighborhood=record.neighborhood,
            city=record.city,
            location=None,
            image_url=_trusted_image_url(record),
        )
    except InvalidListingError:
        return None


def _trusted_image_url(record: CapturedListingRecord) -> str | None:
    if record.image_url is None:
        return None
    parts = urlsplit(record.image_url)
    is_trusted = parts.scheme == "https" and (parts.hostname or "").endswith(
        IMAGE_HOST_SUFFIXES[record.source]
    )
    return record.image_url if is_trusted else None


def _is_https_on_host(url: str, host: str) -> bool:
    parts = urlsplit(url)
    return parts.scheme == "https" and parts.hostname == host
