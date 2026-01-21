"""add livingroom door servo field

Revision ID: 013_add_livingroom_door_servo
Revises: 012_add_gate_puzzles
Create Date: 2026-01-15 14:07:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_add_livingroom_door_servo'
down_revision = '012_add_gate_puzzles'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add door_servo_should_close field to livingroom_puzzle_states table
    
    This field controls the physical door servo on GPIO P32:
    - False (default): Door open at 45°
    - True: Door closed at 90° (triggered when condizionatore completed)
    """
    # Add new column
    op.add_column(
        'livingroom_puzzle_states',
        sa.Column('door_servo_should_close', sa.Boolean(), nullable=False, server_default='false')
    )
    
    print("✅ [Migration 013] door_servo_should_close field added to livingroom_puzzle_states")
    print("✅ [Migration 013] Default value: false (door open at 45°)")


def downgrade():
    """Remove door_servo_should_close field"""
    op.drop_column('livingroom_puzzle_states', 'door_servo_should_close')
    
    print("⬇️  [Migration 013] door_servo_should_close field removed from livingroom_puzzle_states")