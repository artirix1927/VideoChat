"""Add unique constraint to friend_requests

Revision ID: 16ac04e5c519
Revises: 628087cd4b28
Create Date: 2025-07-26 01:29:44.571958
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "16ac04e5c519"
down_revision: Union[str, Sequence[str], None] = "628087cd4b28"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("friend_requests", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_from_to_user", ["from_user", "to_user"])


def downgrade() -> None:
    with op.batch_alter_table("friend_requests", schema=None) as batch_op:
        batch_op.drop_constraint("uq_from_to_user", type_="unique")
