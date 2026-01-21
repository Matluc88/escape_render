"""Add bathroom hardware control fields

Revision ID: 015
Revises: 014
Create Date: 2026-01-17 03:03:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015_add_bathroom_hardware'
down_revision = '014_add_livingroom_fan'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add hardware control fields to bathroom_puzzle_states table:
    - door_servo_should_open: Porta bagno si apre alla vittoria (P26)
    - window_servo_should_close: Finestra si chiude quando ventola done (P25)
    - fan_should_run: Ventola fisica si attiva quando ventola done (P32)
    """
    op.add_column('bathroom_puzzle_states', 
        sa.Column('door_servo_should_open', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column('bathroom_puzzle_states', 
        sa.Column('window_servo_should_close', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column('bathroom_puzzle_states', 
        sa.Column('fan_should_run', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade():
    """Remove hardware control fields"""
    op.drop_column('bathroom_puzzle_states', 'fan_should_run')
    op.drop_column('bathroom_puzzle_states', 'window_servo_should_close')
    op.drop_column('bathroom_puzzle_states', 'door_servo_should_open')