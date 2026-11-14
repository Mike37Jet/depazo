from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    Double,
    ForeignKey,
    Identity,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

MONEY = Numeric(12, 2)


class Base(DeclarativeBase):
    pass


class ListingRecord(Base):
    __tablename__ = "listings"
    __table_args__ = (UniqueConstraint("source", "external_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    source: Mapped[str] = mapped_column(String(40))
    external_id: Mapped[str] = mapped_column(String(64))
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    monthly_rent_usd: Mapped[Decimal | None] = mapped_column(MONEY)
    condo_fee_usd: Mapped[Decimal | None] = mapped_column(MONEY)
    area_m2: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    bedrooms: Mapped[int | None] = mapped_column(SmallInteger)
    bathrooms: Mapped[int | None] = mapped_column(SmallInteger)
    neighborhood: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Double)
    longitude: Mapped[float | None] = mapped_column(Double)
    image_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ListingPriceRecord(Base):
    __tablename__ = "listing_price_history"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    listing_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    monthly_rent_usd: Mapped[Decimal | None] = mapped_column(MONEY)
    condo_fee_usd: Mapped[Decimal | None] = mapped_column(MONEY)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
