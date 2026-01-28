"""
Global Puzzle Management API Endpoints

Provides admin endpoints for managing ALL puzzles across all rooms:
- POST /initialize - Initialize all puzzles for a session
- POST /reset - Reset all puzzles to initial state
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models.game_session import GameSession

# Import all puzzle services
from app.services.kitchen_puzzle_service import KitchenPuzzleService
from app.services.livingroom_puzzle_service import LivingRoomPuzzleService
from app.services.bathroom_puzzle_service import BathroomPuzzleService
from app.services.bedroom_puzzle_service import BedroomPuzzleService

router = APIRouter(prefix="/api/puzzles/session/{session_id}", tags=["global-puzzles"])
logger = logging.getLogger(__name__)


@router.post("/initialize")
async def initialize_all_puzzles(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Initialize ALL puzzles for a new game session.
    
    This creates initial puzzle states for all 4 rooms:
    - Kitchen (cucina)
    - Living Room (soggiorno)
    - Bathroom (bagno)
    - Bedroom (camera)
    
    Called by admin when starting a new game from Lobby.
    """
    try:
        # 🔒 VALIDATE: Check if session exists
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            logger.error(f"[GlobalPuzzles] ❌ Session {session_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        logger.info(f"[GlobalPuzzles] 🎯 Initializing all puzzles for session {session_id}")
        
        initialized_count = 0
        
        # Initialize Kitchen puzzles
        try:
            KitchenPuzzleService.get_or_create_state(db, session_id)
            initialized_count += 1
            logger.info(f"[GlobalPuzzles] ✅ Kitchen puzzles initialized")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Kitchen init error: {e}")
        
        # Initialize Living Room puzzles
        try:
            LivingRoomPuzzleService.get_or_create(db, session_id)
            initialized_count += 1
            logger.info(f"[GlobalPuzzles] ✅ Living Room puzzles initialized")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Living Room init error: {e}")
        
        # Initialize Bathroom puzzles
        try:
            BathroomPuzzleService.get_or_create_state(db, session_id)
            initialized_count += 1
            logger.info(f"[GlobalPuzzles] ✅ Bathroom puzzles initialized")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Bathroom init error: {e}")
        
        # Initialize Bedroom puzzles
        try:
            BedroomPuzzleService.get_or_create_state(db, session_id)
            initialized_count += 1
            logger.info(f"[GlobalPuzzles] ✅ Bedroom puzzles initialized")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Bedroom init error: {e}")
        
        logger.info(f"[GlobalPuzzles] 🎉 Initialization complete: {initialized_count}/4 rooms")
        
        return {
            "message": "Puzzles initialized successfully",
            "session_id": session_id,
            "initialized_count": initialized_count,
            "rooms": ["cucina", "soggiorno", "bagno", "camera"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GlobalPuzzles] ❌ Initialization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize puzzles: {str(e)}"
        )


@router.post("/reset")
async def reset_all_puzzles(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Reset ALL puzzles to initial state for a session.
    
    This resets puzzle states for all 4 rooms:
    - Kitchen (cucina) - 3 puzzles
    - Living Room (soggiorno) - 3 puzzles
    - Bathroom (bagno) - 3 puzzles
    - Bedroom (camera) - 4 puzzles
    
    Total: 13 puzzles (including 1 Esterno puzzle not managed here)
    
    Called by admin from Lobby when clicking "RESET ENIGMI".
    """
    try:
        # 🔒 VALIDATE: Check if session exists
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            logger.error(f"[GlobalPuzzles] ❌ Session {session_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        logger.info(f"[GlobalPuzzles] 🔄 Resetting all puzzles for session {session_id}")
        
        reset_count = 0
        
        # Reset Kitchen puzzles (3 puzzles: frigo, anta pentola, pentola)
        try:
            await KitchenPuzzleService.reset_all_puzzles(db, session_id)
            reset_count += 3
            logger.info(f"[GlobalPuzzles] ✅ Kitchen puzzles reset (3 puzzles)")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Kitchen reset error: {e}")
        
        # Reset Living Room puzzles (3 puzzles: TV, pianta, condizionatore)
        try:
            await LivingRoomPuzzleService.reset_puzzles(db, session_id, level="full")
            reset_count += 3
            logger.info(f"[GlobalPuzzles] ✅ Living Room puzzles reset (3 puzzles)")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Living Room reset error: {e}")
        
        # Reset Bathroom puzzles (3 puzzles: specchio, doccia, ventola)
        try:
            BathroomPuzzleService.reset_puzzles(db, session_id, level="full")
            reset_count += 3
            logger.info(f"[GlobalPuzzles] ✅ Bathroom puzzles reset (3 puzzles)")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Bathroom reset error: {e}")
        
        # Reset Bedroom puzzles (4 puzzles: comodino, materasso, poltrona, ventola)
        try:
            BedroomPuzzleService.reset_puzzles(db, session_id, level="full")
            reset_count += 4
            logger.info(f"[GlobalPuzzles] ✅ Bedroom puzzles reset (4 puzzles)")
        except Exception as e:
            logger.error(f"[GlobalPuzzles] ❌ Bedroom reset error: {e}")
        
        logger.info(f"[GlobalPuzzles] 🎉 Reset complete: {reset_count}/13 puzzles")
        
        return {
            "message": "All puzzles reset successfully",
            "session_id": session_id,
            "reset_count": reset_count,
            "rooms": {
                "cucina": 3,
                "soggiorno": 3,
                "bagno": 3,
                "camera": 4
            },
            "note": "Esterno puzzle (1) is managed separately"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GlobalPuzzles] ❌ Reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset puzzles: {str(e)}"
        )