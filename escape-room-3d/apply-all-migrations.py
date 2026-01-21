#!/usr/bin/env python3
"""
Script per applicare manualmente tutte le migrations mancanti (002-005) su Render
Esegui questo nella Shell del backend service
"""

from app.database import engine
from sqlalchemy import text

print("🚀 Inizio applicazione migrations 002-005...")

with engine.connect() as conn:
    
    # ==================== MIGRATION 002: spawn_data ====================
    print("\n📍 Migration 002: Aggiunta spawn_data a rooms...")
    conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS spawn_data JSON"))
    conn.commit()
    
    print("   Popolamento coordinate spawn...")
    conn.execute(text("UPDATE rooms SET spawn_data = :data WHERE name = 'kitchen'"), 
                 {"data": '{"position": {"x": -0.97, "y": 0, "z": 2.14}, "yaw": 2.32}'})
    conn.execute(text("UPDATE rooms SET spawn_data = :data WHERE name = 'bathroom'"), 
                 {"data": '{"position": {"x": 1.18, "y": 0, "z": 2.56}, "yaw": 3.84}'})
    conn.execute(text("UPDATE rooms SET spawn_data = :data WHERE name = 'bedroom'"), 
                 {"data": '{"position": {"x": -0.13, "y": 0, "z": 1.45}, "yaw": 0.79}'})
    conn.execute(text("UPDATE rooms SET spawn_data = :data WHERE name = 'livingroom'"), 
                 {"data": '{"position": {"x": 0.55, "y": 0, "z": 1.44}, "yaw": 5.36}'})
    conn.commit()
    print("   ✅ Migration 002 completata")
    
    # ==================== MIGRATION 003: default_state ====================
    print("\n🎯 Migration 003: Aggiunta default_state a elements...")
    conn.execute(text("ALTER TABLE elements ADD COLUMN IF NOT EXISTS default_state JSON"))
    conn.commit()
    print("   ✅ Migration 003 completata")
    
    # ==================== MIGRATION 004: players & puzzles ====================
    print("\n👥 Migration 004: Tabelle players e puzzles...")
    
    # Aggiungi status a game_sessions se non esiste
    conn.execute(text("""
        ALTER TABLE game_sessions 
        ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'waiting' NOT NULL
    """))
    conn.commit()
    
    # Crea tabella players se non esiste
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL,
            nickname VARCHAR NOT NULL,
            current_room VARCHAR DEFAULT 'lobby' NOT NULL,
            status VARCHAR DEFAULT 'waiting' NOT NULL,
            connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            socket_id VARCHAR,
            FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
        )
    """))
    conn.commit()
    
    # Crea indici per players
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_players_id ON players(id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_players_session_id ON players(session_id)"))
    conn.commit()
    
    # Crea tabella puzzles se non esiste
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS puzzles (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL,
            room VARCHAR NOT NULL,
            puzzle_number INTEGER NOT NULL,
            puzzle_name VARCHAR,
            solved BOOLEAN DEFAULT FALSE NOT NULL,
            solved_by VARCHAR,
            solved_at TIMESTAMP WITH TIME ZONE,
            FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
        )
    """))
    conn.commit()
    
    # Crea indici per puzzles
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_puzzles_id ON puzzles(id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_puzzles_session_id ON puzzles(session_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_puzzles_room ON puzzles(room)"))
    conn.commit()
    print("   ✅ Migration 004 completata")
    
    # ==================== MIGRATION 005: session PIN ====================
    print("\n🔢 Migration 005: Aggiunta PIN a game_sessions...")
    conn.execute(text("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS pin VARCHAR(4)"))
    conn.commit()
    
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_game_sessions_pin ON game_sessions(pin)"))
    conn.commit()
    print("   ✅ Migration 005 completata")
    
    # ==================== AGGIORNA ALEMBIC_VERSION ====================
    print("\n📝 Aggiornamento alembic_version...")
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('002') ON CONFLICT DO NOTHING"))
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('003') ON CONFLICT DO NOTHING"))
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('004') ON CONFLICT DO NOTHING"))
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('005') ON CONFLICT DO NOTHING"))
    conn.commit()
    
    # ==================== VERIFICA ====================
    print("\n✅ VERIFICA:")
    
    # Verifica spawn_data
    print("\n   Coordinate spawn:")
    result = conn.execute(text("SELECT name, spawn_data FROM rooms WHERE spawn_data IS NOT NULL"))
    for row in result:
        print(f"     - {row.name}: {row.spawn_data}")
    
    # Verifica tabelle
    print("\n   Tabelle create:")
    result = conn.execute(text("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('players', 'puzzles')
        ORDER BY table_name
    """))
    for row in result:
        print(f"     - {row.table_name}")
    
    # Verifica alembic_version
    print("\n   Versioni migrations:")
    result = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))
    versions = [row.version_num for row in result]
    print(f"     - {', '.join(versions)}")

print("\n🎉 COMPLETATO! Tutte le migrations sono state applicate.")
print("   Il backend dovrebbe riavviarsi automaticamente tra pochi secondi.")
