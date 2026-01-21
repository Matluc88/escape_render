#!/usr/bin/env python3
"""
Script per aggiornare le coordinate di spawn nel database
Basato su spawn-positions-2026-01-16.json
"""
import sys
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Aggiungi la directory backend al path per importare i moduli
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

# ✅ Nuove coordinate di spawn in LOCAL SPACE (ricatturate 16 Gennaio 2026)
# Y = 0 (pavimento locale) - offset applicato automaticamente dal runtime
SPAWN_POSITIONS = {
    "livingroom": {  # soggiorno
        "position": {"x": 0.51, "y": 0, "z": 1.44},
        "yaw": 5.25  # 301°
    },
    "kitchen": {  # cucina
        "position": {"x": -1.9, "y": 0, "z": 1.35},
        "yaw": 6.28  # 360°
    },
    "bathroom": {  # bagno
        "position": {"x": 1.41, "y": 0, "z": 2.89},
        "yaw": 3.71  # 213°
    },
    "bedroom": {  # camera
        "position": {"x": -0.22, "y": 0, "z": -0.89},
        "yaw": 0.85  # 49°
    }
}

def update_spawn_positions():
    """Aggiorna le coordinate di spawn nel database"""
    print("="*80)
    print("🎯 AGGIORNAMENTO SPAWN POSITIONS")
    print("="*80)
    print(f"Database URL: {DATABASE_URL}")
    print()
    
    # Crea engine e session
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        updated_count = 0
        
        for room_name, spawn_data in SPAWN_POSITIONS.items():
            print(f"📍 Aggiornamento {room_name}...")
            print(f"   Position: x={spawn_data['position']['x']}, y={spawn_data['position']['y']}, z={spawn_data['position']['z']}")
            print(f"   Yaw: {spawn_data['yaw']:.2f} rad ({int(spawn_data['yaw'] * 180 / 3.14159)}°)")
            
            # Query per verificare se la stanza esiste
            check_query = text("SELECT id, name FROM rooms WHERE name = :room_name")
            result = session.execute(check_query, {"room_name": room_name}).fetchone()
            
            if not result:
                print(f"   ⚠️  Stanza '{room_name}' NON trovata nel database - SKIP")
                print()
                continue
            
            room_id, db_room_name = result
            print(f"   ✓ Stanza trovata (ID: {room_id})")
            
            # Query per aggiornare spawn_data
            # PostgreSQL richiede JSON string, non dict Python
            # Usa CAST invece di :: per evitare conflitto con parametri SQLAlchemy
            update_query = text("""
                UPDATE rooms 
                SET spawn_data = CAST(:spawn_data AS jsonb)
                WHERE name = :room_name
            """)
            
            session.execute(update_query, {
                "room_name": room_name,
                "spawn_data": json.dumps(spawn_data)  # Converti dict in JSON string
            })
            
            updated_count += 1
            print(f"   ✅ spawn_data aggiornato!")
            print()
        
        # Commit delle modifiche
        session.commit()
        
        print("="*80)
        print(f"✅ AGGIORNAMENTO COMPLETATO")
        print(f"   Stanze aggiornate: {updated_count}/{len(SPAWN_POSITIONS)}")
        print("="*80)
        print()
        
        # Verifica finale: leggi i dati aggiornati
        print("🔍 VERIFICA DATI AGGIORNATI:")
        print("="*80)
        
        for room_name in SPAWN_POSITIONS.keys():
            verify_query = text("SELECT name, spawn_data FROM rooms WHERE name = :room_name")
            result = session.execute(verify_query, {"room_name": room_name}).fetchone()
            
            if result:
                db_name, db_spawn_data = result
                print(f"✓ {db_name}:")
                if db_spawn_data:
                    print(f"  Position: x={db_spawn_data['position']['x']}, y={db_spawn_data['position']['y']}, z={db_spawn_data['position']['z']}")
                    print(f"  Yaw: {db_spawn_data['yaw']:.2f}")
                else:
                    print(f"  ⚠️  spawn_data è NULL")
                print()
        
        print("="*80)
        print("🎉 PROCESSO COMPLETATO CON SUCCESSO!")
        print("="*80)
        
    except Exception as e:
        session.rollback()
        print()
        print("="*80)
        print(f"❌ ERRORE durante l'aggiornamento:")
        print(f"   {type(e).__name__}: {str(e)}")
        print("="*80)
        raise
    
    finally:
        session.close()


if __name__ == "__main__":
    update_spawn_positions()