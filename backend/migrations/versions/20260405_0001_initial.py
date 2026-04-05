"""initial schema

Revision ID: 20260405_0001
Revises: 
Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260405_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gists",
        sa.Column("gist_id", sa.UUID(as_uuid=True),
                  primary_key=True, nullable=False),
        sa.Column("gist_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expiration_date", sa.DateTime(), nullable=True),
        sa.Column("read_count", sa.Integer(), nullable=False),
        sa.Column("max_reads", sa.Integer(), nullable=False),
        sa.Column("version_history", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("gists")
