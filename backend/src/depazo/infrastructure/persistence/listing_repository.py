from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from depazo.domain.listing import GeoPoint, Listing
from depazo.infrastructure.persistence.models import ListingPriceRecord, ListingRecord

ACTIVE_STATUS = "active"


class SqlAlchemyListingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find(self, source: str, external_id: str) -> Listing | None:
        record = await self._find_record(source, external_id)
        return _to_listing(record) if record is not None else None

    async def save(self, listing: Listing, seen_at: datetime) -> None:
        record = await self._find_record(listing.source, listing.external_id)
        if record is None:
            record = ListingRecord(
                source=listing.source,
                external_id=listing.external_id,
                first_seen_at=seen_at,
            )
            self._session.add(record)
        _copy_listing_into(record, listing)
        record.status = ACTIVE_STATUS
        record.last_seen_at = seen_at
        await self._session.flush()

    async def record_price(self, listing: Listing, observed_at: datetime) -> None:
        record = await self._find_record(listing.source, listing.external_id)
        if record is None:
            raise LookupError(f"{listing.source}/{listing.external_id} must be saved first")
        self._session.add(
            ListingPriceRecord(
                listing_id=record.id,
                monthly_rent_usd=listing.monthly_rent_usd,
                condo_fee_usd=listing.condo_fee_usd,
                observed_at=observed_at,
            )
        )
        await self._session.flush()

    async def list_active(self) -> Sequence[Listing]:
        statement = select(ListingRecord).where(ListingRecord.status == ACTIVE_STATUS)
        records = await self._session.scalars(statement)
        return [_to_listing(record) for record in records]

    async def _find_record(self, source: str, external_id: str) -> ListingRecord | None:
        statement = select(ListingRecord).where(
            ListingRecord.source == source, ListingRecord.external_id == external_id
        )
        return await self._session.scalar(statement)


def _copy_listing_into(record: ListingRecord, listing: Listing) -> None:
    record.url = listing.url
    record.title = listing.title
    record.description = listing.description
    record.monthly_rent_usd = listing.monthly_rent_usd
    record.condo_fee_usd = listing.condo_fee_usd
    record.area_m2 = listing.area_m2
    record.bedrooms = listing.bedrooms
    record.bathrooms = listing.bathrooms
    record.neighborhood = listing.neighborhood
    record.city = listing.city
    record.latitude = listing.location.latitude if listing.location else None
    record.longitude = listing.location.longitude if listing.location else None
    record.image_url = listing.image_url


def _to_listing(record: ListingRecord) -> Listing:
    return Listing(
        source=record.source,
        external_id=record.external_id,
        url=record.url,
        title=record.title,
        description=record.description,
        monthly_rent_usd=record.monthly_rent_usd,
        condo_fee_usd=record.condo_fee_usd,
        area_m2=record.area_m2,
        bedrooms=record.bedrooms,
        bathrooms=record.bathrooms,
        neighborhood=record.neighborhood,
        city=record.city,
        location=_location_of(record),
        image_url=record.image_url,
    )


def _location_of(record: ListingRecord) -> GeoPoint | None:
    if record.latitude is None or record.longitude is None:
        return None
    return GeoPoint(latitude=record.latitude, longitude=record.longitude)
