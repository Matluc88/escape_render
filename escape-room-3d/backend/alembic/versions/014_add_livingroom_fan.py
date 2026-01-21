"""Add fan_should_run to livingroom_puzzle_states

Revision ID: 014
Revises: 013
Create Date: 2026-01-15 17:54:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014_add_livingroom_fan'
down_revision = '013_add_livingroom_door_servo'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add fan_should_run Boolean field to livingroom_puzzle_states table.
    
    This field controls the physical fan on GPIO P26 in the ESP32.
    When condizionatore puzzle is completed, fan_should_run is set to True.
    """
    # Add fan_should_run column
    op.add_column(
        'livingroom_puzzle_states',
        sa.Column('fan_should_run', sa.Boolean(), nullable=False, server_default='false')
    )
    
    print("✅ Migration 014: Added fan_should_run to livingroom_puzzle_states")


def downgrade():
    """Remove fan_should_run column"""
    op.drop_column('livingroom_puzzle_states', 'fan_should_run')
    
    print("⬇️ Migration 014: Removed fan_should_run from livingroom_puzzle_states")