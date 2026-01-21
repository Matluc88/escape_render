"""add pin to game sessions

Revision ID: 005
Revises: 004
Create Date: 2025-12-23 18:16:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_add_session_pin'
down_revision = '004_add_players_and_puzzles'
branch_labels = None
depends_on = None


def upgrade():
    # Add PIN column to game_sessions table
    op.add_column('game_sessions', sa.Column('pin', sa.String(4), nullable=True))
    
    # Create unique index on pin
    op.create_index('ix_game_sessions_pin', 'game_sessions', ['pin'], unique=True)


def downgrade():
    # Drop index and column
    op.drop_index('ix_game_sessions_pin', table_name='game_sessions')
    op.drop_column('game_sessions', 'pin')
