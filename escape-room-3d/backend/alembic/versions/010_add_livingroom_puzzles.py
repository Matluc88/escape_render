"""add livingroom puzzles

Revision ID: 010_add_livingroom_puzzles
Revises: 009_create_test_session
Create Date: 2026-01-04 13:39:00

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '010_add_livingroom_puzzles'
down_revision = '009_create_test_session'
branch_labels = None
depends_on = None


def upgrade():
    # Create livingroom_puzzle_states table
    op.create_table(
        'livingroom_puzzle_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('tv_status', sa.String(), nullable=False, server_default='locked'),
        sa.Column('pianta_status', sa.String(), nullable=False, server_default='locked'),
        sa.Column('condizionatore_status', sa.String(), nullable=False, server_default='locked'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')
    )
    op.create_index('ix_livingroom_puzzle_states_session_id', 'livingroom_puzzle_states', ['session_id'])
    
    # Initialize puzzle state for test session 999 (immortal session)
    op.execute("""
        INSERT INTO livingroom_puzzle_states (session_id, tv_status, pianta_status, condizionatore_status, created_at, updated_at)
        SELECT 999, 'locked', 'locked', 'locked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE EXISTS (SELECT 1 FROM game_sessions WHERE id = 999)
        ON CONFLICT (session_id) DO NOTHING;
    """)
    
    print("✅ [Migration 010] livingroom_puzzle_states table created")
    print("✅ [Migration 010] Test session 999 initialized")


def downgrade():
    op.drop_index('ix_livingroom_puzzle_states_session_id', table_name='livingroom_puzzle_states')
    op.drop_table('livingroom_puzzle_states')
    
    print("⬇️  [Migration 010] livingroom_puzzle_states table dropped")
