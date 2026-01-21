"""add players and puzzles tables

Revision ID: 004
Revises: 003
Create Date: 2025-12-23 17:58:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_add_players_and_puzzles'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add status column to game_sessions table
    op.add_column('game_sessions', sa.Column('status', sa.String(), server_default='waiting', nullable=False))
    
    # Create players table
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('nickname', sa.String(), nullable=False),
        sa.Column('current_room', sa.String(), server_default='lobby', nullable=False),
        sa.Column('status', sa.String(), server_default='waiting', nullable=False),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('socket_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_players_id', 'players', ['id'])
    op.create_index('ix_players_session_id', 'players', ['session_id'])
    
    # Create puzzles table
    op.create_table(
        'puzzles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('room', sa.String(), nullable=False),
        sa.Column('puzzle_number', sa.Integer(), nullable=False),
        sa.Column('puzzle_name', sa.String(), nullable=True),
        sa.Column('solved', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('solved_by', sa.String(), nullable=True),
        sa.Column('solved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_puzzles_id', 'puzzles', ['id'])
    op.create_index('ix_puzzles_session_id', 'puzzles', ['session_id'])
    op.create_index('ix_puzzles_room', 'puzzles', ['room'])


def downgrade():
    # Drop puzzles table
    op.drop_index('ix_puzzles_room', table_name='puzzles')
    op.drop_index('ix_puzzles_session_id', table_name='puzzles')
    op.drop_index('ix_puzzles_id', table_name='puzzles')
    op.drop_table('puzzles')
    
    # Drop players table
    op.drop_index('ix_players_session_id', table_name='players')
    op.drop_index('ix_players_id', table_name='players')
    op.drop_table('players')
    
    # Remove status column from game_sessions
    op.drop_column('game_sessions', 'status')
