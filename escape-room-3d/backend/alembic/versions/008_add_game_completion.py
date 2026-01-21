"""Add game completion tracking

Revision ID: 008_add_game_completion
Revises: 007_add_bedroom_puzzles
Create Date: 2025-12-29 00:11:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_add_game_completion'
down_revision = '007_add_bedroom_puzzles'
branch_labels = None
depends_on = None


def upgrade():
    # Create game_completion_states table
    op.create_table(
        'game_completion_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('rooms_status', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('game_won', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('victory_time', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')  # One completion state per session
    )
    
    # Create indexes for performance
    op.create_index(
        'ix_game_completion_states_session_id',
        'game_completion_states',
        ['session_id']
    )
    
    op.create_index(
        'ix_game_completion_states_game_won',
        'game_completion_states',
        ['game_won']
    )


def downgrade():
    # Drop indexes
    op.drop_index('ix_game_completion_states_game_won')
    op.drop_index('ix_game_completion_states_session_id')
    
    # Drop table
    op.drop_table('game_completion_states')
