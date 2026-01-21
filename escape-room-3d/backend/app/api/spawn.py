"""
API endpoints per gestire i punti di spawn delle stanze
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

# Configura logger per spawn
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/api/spawn", tags=["spawn"])


@router.get("/{room_name}")
async def get_spawn_point(room_name: str, db: Session = Depends(get_db)):
    """
    Ottiene le coordinate di spawn per una stanza specifica
    
    Args:
        room_name: Nome della stanza (camera, cucina, soggiorno, bagno, esterno)
    
    Returns:
        Dict con position {x, y, z} e yaw
    """
    logger.info("="*80)
    logger.info(f"🎯 RICHIESTA SPAWN POINT")
    logger.info(f"   Room richiesta: '{room_name}'")
    
    try:
        # Mapping nomi italiani → nomi database inglesi
        room_mapping = {
            'cucina': 'kitchen',
            'bagno': 'bathroom',
            'camera': 'bedroom',
            'soggiorno': 'livingroom',
            'esterno': 'gate'
        }
        
        # Converti nome italiano in inglese
        db_room_name = room_mapping.get(room_name, room_name)
        logger.info(f"   Room mappata: '{room_name}' → '{db_room_name}'")
        
        # Query alla tabella rooms con campo JSON spawn_data
        query = text("""
            SELECT spawn_data
            FROM rooms 
            WHERE name = :room_name
        """)
        
        logger.info(f"   Esecuzione query SQL per room: '{db_room_name}'")
        result = db.execute(query, {"room_name": db_room_name}).fetchone()
        
        if not result or not result[0]:
            logger.error(f"   ❌ ERRORE: Spawn point NON trovato per room: '{room_name}' (db: '{db_room_name}')")
            logger.info("="*80)
            raise HTTPException(
                status_code=404,
                detail=f"Spawn point not found for room: {room_name}"
            )
        
        # Estrai dati dal JSON
        spawn_data = result[0]
        logger.info(f"   ✅ Dati spawn recuperati dal database:")
        logger.info(f"      Raw spawn_data: {spawn_data}")
        
        response = {
            "position": {
                "x": float(spawn_data['position']['x']),
                "y": float(spawn_data['position']['y']),
                "z": float(spawn_data['position']['z'])
            },
            "yaw": float(spawn_data['yaw'])
        }
        
        logger.info(f"   📍 COORDINATE FINALI RESTITUITE:")
        logger.info(f"      Position: x={response['position']['x']}, y={response['position']['y']}, z={response['position']['z']}")
        logger.info(f"      Yaw: {response['yaw']}")
        logger.info("="*80)
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"   ❌ ERRORE CRITICO nel fetch spawn point:")
        logger.error(f"      Room: '{room_name}' (db: '{db_room_name}')")
        logger.error(f"      Errore: {str(e)}")
        logger.error(f"      Tipo: {type(e).__name__}")
        logger.info("="*80)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching spawn point: {str(e)}"
        )


@router.get("/")
async def get_all_spawn_points(db: Session = Depends(get_db)):
    """
    Ottiene tutti i punti di spawn disponibili
    
    Returns:
        Dict con tutti i spawn points per stanza
    """
    logger.info("="*80)
    logger.info(f"🗂️  RICHIESTA TUTTI GLI SPAWN POINTS")
    
    try:
        query = text("""
            SELECT room_name, spawn_x, spawn_y, spawn_z, yaw 
            FROM spawn_points 
            ORDER BY room_name
        """)
        
        logger.info(f"   Esecuzione query per ottenere tutti gli spawn points...")
        results = db.execute(query).fetchall()
        logger.info(f"   ✅ Trovati {len(results)} spawn points nel database")
        
        spawn_points = {}
        for row in results:
            spawn_points[row[0]] = {
                "position": {
                    "x": float(row[1]),
                    "y": float(row[2]),
                    "z": float(row[3])
                },
                "yaw": float(row[4])
            }
            logger.info(f"      - {row[0]}: x={row[1]}, y={row[2]}, z={row[3]}, yaw={row[4]}")
        
        logger.info(f"   📦 TOTALE SPAWN POINTS RESTITUITI: {len(spawn_points)}")
        logger.info("="*80)
        
        return spawn_points
    
    except Exception as e:
        logger.error(f"   ❌ ERRORE nel fetch di tutti gli spawn points:")
        logger.error(f"      Errore: {str(e)}")
        logger.error(f"      Tipo: {type(e).__name__}")
        logger.info("="*80)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching spawn points: {str(e)}"
        )