"""Create incidents table

Revision ID: 0001_create_incidents
Revises:
Create Date: 2026-10-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_create_incidents"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incidents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("service_name", sa.String(length=100), server_default="api-gateway", nullable=False),
        sa.Column("severity", sa.String(length=20), server_default="MEDIUM", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="OPEN", nullable=False),
        sa.Column("assignee", sa.String(length=100), server_default="DevOps On-Call", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_incidents_id"), "incidents", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_incidents_id"), table_name="incidents")
    op.drop_table("incidents")
