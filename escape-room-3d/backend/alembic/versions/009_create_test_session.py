"""Create permanent test session

Revision ID: 009_create_test_session
Revises: 008_add_game_completion
Create Date: 2025-12-29 17:40:00

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '009_create_test_session'
down_revision = '008_add_game_completion'
branch_labels = None
depends_on = None


def upgrade():
    """
    Creates a permanent test session for development and testing.
    
    Session Details:
    - ID: 999 (fixed, won't conflict with auto-increment)
    - PIN: TEST (easy to remember)
    - Room ID: 1
    - Status: active (always active)
    - Expected Players: 10 (allows multiple concurrent testers)
    """
    
    # Check if test session already exists
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT id FROM game_sessions WHERE id = 999"))
    
    if result.fetchone() is None:
        # Insert test session
        conn.execute(
            sa.text("""
                INSERT INTO game_sessions (id, room_id, pin, start_time, end_time, expected_players, connected_players, status)
                VALUES (999, 1, 'TEST', :start_time, NULL, 10, 0, 'active')
            """),
            {"start_time": datetime.utcnow()}
        )
        
        # Reset sequence to avoid conflicts (start from 1000)
        conn.execute(sa.text("SELECT setval('game_sessions_id_seq', 1000, false)"))
        
        print("✅ Test session created: ID=999, PIN=TEST")
    else:
        print("ℹ️  Test session already exists")


def downgrade():
    """Remove the test session"""
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM game_sessions WHERE id = 999"))
    print("🗑️  Test session removed")
