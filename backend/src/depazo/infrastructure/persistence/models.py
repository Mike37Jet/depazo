from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    DateTime,
    Double,
    ForeignKey,
    Identity,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

MONEY = Numeric(12, 2)
WEIGHT = Numeric(4, 2)


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


class SearchProfileRecord(Base):
    __tablename__ = "search_profiles"

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    max_monthly_cost_usd: Mapped[Decimal] = mapped_column(MONEY)
    min_monthly_cost_usd: Mapped[Decimal | None] = mapped_column(MONEY)
    is_condo_fee_in_budget: Mapped[bool] = mapped_column(Boolean)
    min_bedrooms: Mapped[int | None] = mapped_column(SmallInteger)
    max_bedrooms: Mapped[int | None] = mapped_column(SmallInteger)
    min_bathrooms: Mapped[int | None] = mapped_column(SmallInteger)
    min_area_m2: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    preferred_neighborhoods: Mapped[list[str]] = mapped_column(ARRAY(Text))
    excluded_neighborhoods: Mapped[list[str]] = mapped_column(ARRAY(Text))
    price_weight: Mapped[Decimal] = mapped_column(WEIGHT)
    area_weight: Mapped[Decimal] = mapped_column(WEIGHT)
    neighborhood_weight: Mapped[Decimal] = mapped_column(WEIGHT)
    min_score: Mapped[int] = mapped_column(SmallInteger)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ListingReactionRecord(Base):
    __tablename__ = "listing_reactions"

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    listing_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True
    )
    reaction: Mapped[str] = mapped_column(String(20))
    reacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PushSubscriptionRecord(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(Text)
    auth: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
