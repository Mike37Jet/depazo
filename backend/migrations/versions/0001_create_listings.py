from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MONEY = sa.Numeric(12, 2)
TIMESTAMP = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "listings",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("external_id", sa.String(64), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("monthly_rent_usd", MONEY),
        sa.Column("condo_fee_usd", MONEY),
        sa.Column("area_m2", sa.Numeric(10, 2)),
        sa.Column("bedrooms", sa.SmallInteger),
        sa.Column("bathrooms", sa.SmallInteger),
        sa.Column("neighborhood", sa.Text),
        sa.Column("city", sa.Text),
        sa.Column("latitude", sa.Double),
        sa.Column("longitude", sa.Double),
        sa.Column("image_url", sa.Text),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("first_seen_at", TIMESTAMP, nullable=False),
        sa.Column("last_seen_at", TIMESTAMP, nullable=False),
        sa.UniqueConstraint("source", "external_id"),
        sa.CheckConstraint("monthly_rent_usd >= 0", name="listings_rent_not_negative"),
        sa.CheckConstraint("condo_fee_usd >= 0", name="listings_condo_fee_not_negative"),
        sa.CheckConstraint(
            "(latitude IS NULL) = (longitude IS NULL)", name="listings_complete_coordinates"
        ),
    )
    op.execute(
        "ALTER TABLE listings ADD COLUMN location geography(Point, 4326) "
        "GENERATED ALWAYS AS "
        "(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED"
    )
    op.execute("CREATE INDEX listings_location_index ON listings USING gist (location)")
    op.create_index("listings_last_seen_at_index", "listings", ["last_seen_at"])
    op.create_table(
        "listing_price_history",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column(
            "listing_id",
            sa.BigInteger,
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("monthly_rent_usd", MONEY),
        sa.Column("condo_fee_usd", MONEY),
        sa.Column("observed_at", TIMESTAMP, nullable=False),
    )
    op.execute("ALTER TABLE listings ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE listing_price_history ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("listing_price_history")
    op.drop_table("listings")
