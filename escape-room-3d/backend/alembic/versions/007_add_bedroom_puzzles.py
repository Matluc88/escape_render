"""add bedroom puzzles state tracking

Revision ID: 007_bedroom_puzzles
Revises: 006_kitchen_puzzles
Create Date: 2025-12-28 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_add_bedroom_puzzles'
down_revision = '006_kitchen_puzzles'
branch_labels = None
depends_on = None


def upgrade():
    # Create bedroom_puzzle_states table
    op.create_table(
        'bedroom_puzzle_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('room_name', sa.String(50), nullable=False, server_default='camera'),
        sa.Column('puzzle_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('session_id', 'room_name', name='uix_bedroom_session_room')
    )
    
    # Create index for faster lookups
    op.create_index('ix_bedroom_puzzle_states_session_id', 'bedroom_puzzle_states', ['session_id'])
    
    # Create trigger to update updated_at on row modification
    op.execute("""
        CREATE OR REPLACE FUNCTION update_bedroom_puzzle_states_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_bedroom_puzzle_states_updated_at
        BEFORE UPDATE ON bedroom_puzzle_states
        FOR EACH ROW
        EXECUTE FUNCTION update_bedroom_puzzle_states_updated_at();
    """)


def downgrade():
    # Drop trigger first
    op.execute("DROP TRIGGER IF EXISTS trigger_update_bedroom_puzzle_states_updated_at ON bedroom_puzzle_states;")
    op.execute("DROP FUNCTION IF EXISTS update_bedroom_puzzle_states_updated_at();")
    
    # Drop index
    op.drop_index('ix_bedroom_puzzle_states_session_id', table_name='bedroom_puzzle_states')
    
    # Drop table
    op.drop_table('bedroom_puzzle_states')
