from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("search_profiles", sa.Column("max_bedrooms", sa.SmallInteger))


def downgrade() -> None:
    op.drop_column("search_profiles", "max_bedrooms")
