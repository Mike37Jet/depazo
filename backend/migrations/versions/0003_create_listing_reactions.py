from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "listing_reactions",
        sa.Column("user_id", sa.Uuid, primary_key=True),
        sa.Column(
            "listing_id",
            sa.BigInteger,
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("reaction", sa.String(20), nullable=False),
        sa.Column("reacted_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "reaction IN ('saved', 'discarded')", name="listing_reactions_known_reaction"
        ),
    )
    op.create_index("listing_reactions_listing_id_index", "listing_reactions", ["listing_id"])
    op.execute("ALTER TABLE listing_reactions ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("listing_reactions")
