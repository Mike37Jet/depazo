from dataclasses import dataclass
from decimal import Decimal

MIN_PLAUSIBLE_APARTMENT_AREA_M2 = Decimal(10)
MAX_PLAUSIBLE_APARTMENT_AREA_M2 = Decimal(2000)
MIN_PLAUSIBLE_MONTHLY_RENT_USD = Decimal(100)
MAX_PLAUSIBLE_MONTHLY_RENT_USD = Decimal(20000)
MAX_LATITUDE = 90.0
MAX_LONGITUDE = 180.0


class InvalidListingError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class GeoPoint:
    latitude: float
    longitude: float

    def __post_init__(self) -> None:
        if abs(self.latitude) > MAX_LATITUDE or abs(self.longitude) > MAX_LONGITUDE:
            raise InvalidListingError(
                f"coordinates out of range: {self.latitude}, {self.longitude}"
            )


@dataclass(frozen=True, slots=True)
class Listing:
    source: str
    external_id: str
    url: str
    title: str
    description: str
    monthly_rent_usd: Decimal | None
    condo_fee_usd: Decimal | None
    area_m2: Decimal | None
    bedrooms: int | None
    bathrooms: int | None
    neighborhood: str | None
    city: str | None
    location: GeoPoint | None
    image_url: str | None

    def __post_init__(self) -> None:
        if not self.source or not self.external_id or not self.url:
            raise InvalidListingError("source, external_id and url are required")
        if any(
            amount is not None and amount < 0
            for amount in (self.monthly_rent_usd, self.condo_fee_usd)
        ):
            raise InvalidListingError("rent and condo fee cannot be negative")
        if any(count is not None and count < 0 for count in (self.bedrooms, self.bathrooms)):
            raise InvalidListingError("room counts cannot be negative")

    @property
    def has_plausible_rent(self) -> bool:
        return self.monthly_rent_usd is None or (
            MIN_PLAUSIBLE_MONTHLY_RENT_USD
            <= self.monthly_rent_usd
            <= MAX_PLAUSIBLE_MONTHLY_RENT_USD
        )


def plausible_apartment_area(area_m2: Decimal) -> Decimal | None:
    if MIN_PLAUSIBLE_APARTMENT_AREA_M2 <= area_m2 <= MAX_PLAUSIBLE_APARTMENT_AREA_M2:
        return area_m2
    return None
