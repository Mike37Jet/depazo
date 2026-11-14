from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MONEY = sa.Numeric(12, 2)
WEIGHT = sa.Numeric(4, 2)
EMPTY_TEXT_ARRAY = sa.text("'{}'::text[]")


def upgrade() -> None:
    op.create_table(
        "search_profiles",
        sa.Column("user_id", sa.Uuid, primary_key=True),
        sa.Column("max_monthly_cost_usd", MONEY, nullable=False),
        sa.Column("min_monthly_cost_usd", MONEY),
        sa.Column("is_condo_fee_in_budget", sa.Boolean, nullable=False),
        sa.Column("min_bedrooms", sa.SmallInteger),
        sa.Column("min_bathrooms", sa.SmallInteger),
        sa.Column("min_area_m2", sa.Numeric(10, 2)),
        sa.Column(
            "preferred_neighborhoods",
            postgresql.ARRAY(sa.Text),
            nullable=False,
            server_default=EMPTY_TEXT_ARRAY,
        ),
        sa.Column(
            "excluded_neighborhoods",
            postgresql.ARRAY(sa.Text),
            nullable=False,
            server_default=EMPTY_TEXT_ARRAY,
        ),
        sa.Column("price_weight", WEIGHT, nullable=False),
        sa.Column("area_weight", WEIGHT, nullable=False),
        sa.Column("neighborhood_weight", WEIGHT, nullable=False),
        sa.Column("min_score", sa.SmallInteger, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("max_monthly_cost_usd > 0", name="search_profiles_positive_budget"),
        sa.CheckConstraint("min_score BETWEEN 0 AND 100", name="search_profiles_min_score_range"),
    )
    op.execute("ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("search_profiles")
