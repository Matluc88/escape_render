"""add default_state to elements

Revision ID: 003
Revises: 002
Create Date: 2025-12-20 23:06:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add default_state column to elements table
    op.add_column('elements', sa.Column('default_state', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Add new element type 'indicator'
    op.execute("ALTER TYPE elementtype ADD VALUE IF NOT EXISTS 'indicator'")


def downgrade():
    # Remove default_state column
    op.drop_column('elements', 'default_state')
    
    # Note: Cannot easily remove enum value, would require recreating the enum type
