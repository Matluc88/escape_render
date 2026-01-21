"""add bathroom puzzles

Revision ID: 011_add_bathroom_puzzles
Revises: 010_add_livingroom_puzzles
Create Date: 2026-01-07 16:36:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_add_bathroom_puzzles'
down_revision = '010_add_livingroom_puzzles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create bathroom_puzzle_states table
    op.create_table(
        'bathroom_puzzle_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('room_name', sa.String(length=50), nullable=False),
        sa.Column('puzzle_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bathroom_puzzle_states_session_id'), 'bathroom_puzzle_states', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bathroom_puzzle_states_session_id'), table_name='bathroom_puzzle_states')
    op.drop_table('bathroom_puzzle_states')
