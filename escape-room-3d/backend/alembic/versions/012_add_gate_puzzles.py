"""Add gate puzzles table

Revision ID: 012_add_gate_puzzles
Revises: 011_add_bathroom_puzzles
Create Date: 2026-01-09 22:37:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012_add_gate_puzzles'
down_revision = '011_add_bathroom_puzzles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create gate_puzzles table
    op.create_table(
        'gate_puzzles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('photocell_clear', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('gates_open', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('door_open', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('roof_open', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('led_status', sa.String(), nullable=False, server_default='red'),
        sa.Column('rgb_strip_on', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')
    )
    op.create_index(op.f('ix_gate_puzzles_id'), 'gate_puzzles', ['id'], unique=False)
    op.create_index(op.f('ix_gate_puzzles_session_id'), 'gate_puzzles', ['session_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_gate_puzzles_session_id'), table_name='gate_puzzles')
    op.drop_index(op.f('ix_gate_puzzles_id'), table_name='gate_puzzles')
    op.drop_table('gate_puzzles')
