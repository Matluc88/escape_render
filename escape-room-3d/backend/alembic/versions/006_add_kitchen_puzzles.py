"""add kitchen puzzles state tracking

Revision ID: 006_kitchen_puzzles
Revises: 005_add_session_pin
Create Date: 2025-12-26 06:22:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_kitchen_puzzles'
down_revision = '005_add_session_pin'
branch_labels = None
depends_on = None


def upgrade():
    # Create kitchen_puzzle_states table
    op.create_table(
        'kitchen_puzzle_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('room_name', sa.String(50), nullable=False, default='cucina'),
        sa.Column('puzzle_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('session_id', 'room_name', name='uix_session_room')
    )
    
    # Create index for faster lookups
    op.create_index('ix_kitchen_puzzle_states_session_id', 'kitchen_puzzle_states', ['session_id'])
    
    # Create trigger to update updated_at on row modification
    op.execute("""
        CREATE OR REPLACE FUNCTION update_kitchen_puzzle_states_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_kitchen_puzzle_states_updated_at
        BEFORE UPDATE ON kitchen_puzzle_states
        FOR EACH ROW
        EXECUTE FUNCTION update_kitchen_puzzle_states_updated_at();
    """)


def downgrade():
    # Drop trigger first
    op.execute("DROP TRIGGER IF EXISTS trigger_update_kitchen_puzzle_states_updated_at ON kitchen_puzzle_states;")
    op.execute("DROP FUNCTION IF EXISTS update_kitchen_puzzle_states_updated_at();")
    
    # Drop index
    op.drop_index('ix_kitchen_puzzle_states_session_id', table_name='kitchen_puzzle_states')
    
    # Drop table
    op.drop_table('kitchen_puzzle_states')
