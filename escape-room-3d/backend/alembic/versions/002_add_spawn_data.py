"""add spawn_data to rooms

Revision ID: 002
Revises: 001
Create Date: 2025-12-14 20:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add spawn_data column to rooms table
    op.add_column('rooms', sa.Column('spawn_data', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Spawn position and rotation: {position: {x, y, z}, yaw: float}'))
    
    # Insert default rooms if they don't exist (using INSERT ... ON CONFLICT DO NOTHING for safety)
    op.execute("""
        INSERT INTO rooms (name, description) VALUES
        ('bedroom', 'Camera da letto - Stanza con il letto e comodini'),
        ('kitchen', 'Cucina - Stanza con frigorifero e puzzle LED'),
        ('bathroom', 'Bagno - Stanza con lavandino e specchio'),
        ('livingroom', 'Soggiorno - Stanza con divano e TV'),
        ('gate', 'Esterno - Area esterna con serra e cancello')
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # 📍 COORDINATE DEFINITIVE (16/01/2026 ore 08:40)
    # Fonte: definitive.json
    # Tutte le stanze aggiornate con le coordinate definitive
    op.execute("""
        UPDATE rooms SET spawn_data = '{"position": {"x": -0.94, "y": 0, "z": 2.14}, "yaw": 2.48}'::json WHERE name = 'kitchen';
        UPDATE rooms SET spawn_data = '{"position": {"x": 1.31, "y": 0, "z": 2.77}, "yaw": 3.53}'::json WHERE name = 'bathroom';
        UPDATE rooms SET spawn_data = '{"position": {"x": -0.56, "y": 0, "z": 1.31}, "yaw": 0.46}'::json WHERE name = 'bedroom';
        UPDATE rooms SET spawn_data = '{"position": {"x": 0.54, "y": 0, "z": 1.51}, "yaw": 5.39}'::json WHERE name = 'livingroom';
        UPDATE rooms SET spawn_data = '{"position": {"x": 0.53, "y": 0, "z": 7.27}, "yaw": 0}'::json WHERE name = 'gate';
    """)


def downgrade():
    # Remove spawn_data column
    op.drop_column('rooms', 'spawn_data')