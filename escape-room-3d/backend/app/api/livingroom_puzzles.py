"""
Living Room Puzzle API Endpoints

Provides REST API for managing living room puzzle state:
- GET /state - Get current puzzle state
- POST /tv/complete - Complete TV puzzle (Tasto M)
- POST /pianta/complete - Complete pianta puzzle (Tasto G)
- POST /condizionatore/complete - Complete condizionatore puzzle (Click)
- POST /reset - Reset puzzle state (admin)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.services.livingroom_puzzle_service import LivingRoomPuzzleService
from app.schemas.livingroom_puzzle import LivingRoomPuzzleStateResponse, ResetRequest

router = APIRouter(prefix="/api", tags=["livingroom_puzzles"])
logger = logging.getLogger(__name__)


@router.get(
    "/sessions/{session_id}/livingroom-puzzles/state",
    response_model=LivingRoomPuzzleStateResponse,
    tags=["livingroom_puzzles"]
)
async def get_puzzle_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current living room puzzle state
    
    Returns:
        - Puzzle stati (tv, pianta, condizionatore)
        - LED stati (pianta, condizionatore)
    
    Note: Porta LED is managed by game_completion system
    """
    try:
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        response = LivingRoomPuzzleService._build_response(puzzle)
        
        logger.info(f"[API] Living room puzzle state retrieved for session {session_id}")
        return response
    
    except ValueError as e:
        # Session doesn't exist - return 404
        logger.error(f"[API] Session {session_id} not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except Exception as e:
        logger.error(f"[API] Error getting puzzle state for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/sessions/{session_id}/livingroom-puzzles/tv/complete",
    response_model=LivingRoomPuzzleStateResponse,
    tags=["livingroom_puzzles"]
)
async def complete_tv_puzzle(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete TV puzzle (Tasto M - Divano ruota + TV verde)
    
    Transition:
    - tv: locked → completed
    - pianta: locked → active (LED rosso)
    """
    try:
        logger.info(f"[API] Completing TV puzzle for session {session_id}")
        response = await LivingRoomPuzzleService.complete_tv(db, session_id)
        
        logger.info(f"[API] ✅ TV puzzle completed for session {session_id}")
        return response
        
    except Exception as e:
        logger.error(f"[API] Error completing TV puzzle for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/sessions/{session_id}/livingroom-puzzles/pianta/complete",
    response_model=LivingRoomPuzzleStateResponse,
    tags=["livingroom_puzzles"]
)
async def complete_pianta_puzzle(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete Pianta puzzle (Tasto G - Pianta movimento)
    
    Transition:
    - pianta: active → completed (LED verde)
    - condizionatore: locked → active (LED rosso)
    """
    try:
        logger.info(f"[API] Completing pianta puzzle for session {session_id}")
        response = await LivingRoomPuzzleService.complete_pianta(db, session_id)
        
        logger.info(f"[API] ✅ Pianta puzzle completed for session {session_id}")
        return response
        
    except Exception as e:
        logger.error(f"[API] Error completing pianta puzzle for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/sessions/{session_id}/livingroom-puzzles/condizionatore/complete",
    response_model=LivingRoomPuzzleStateResponse,
    tags=["livingroom_puzzles"]
)
async def complete_condizionatore_puzzle(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete Condizionatore puzzle (Click + porta chiusa)
    
    Transition:
    - condizionatore: active → completed (LED verde)
    
    Side effect:
    - Triggers game_completion.update_room_completion('soggiorno')
    - Door LED managed globally (blinking logic)
    """
    try:
        logger.info(f"[API] Completing condizionatore puzzle for session {session_id}")
        response = await LivingRoomPuzzleService.complete_condizionatore(db, session_id)
        
        logger.info(f"[API] ✅ Condizionatore puzzle completed for session {session_id}")
        logger.info(f"[API] 🏆 Soggiorno room completion triggered!")
        
        # 📡 Broadcast game_completion update via WebSocket
        try:
            from app.websocket.handler import broadcast_to_session
            from app.services.game_completion_service import GameCompletionService
            
            # Get updated game completion state
            completion_state = GameCompletionService.get_or_create_state(db, session_id)
            led_states = GameCompletionService.get_door_led_states(db, session_id)
            
            # Prepare broadcast data
            broadcast_data = {
                "session_id": session_id,
                "rooms_status": completion_state.rooms_status,
                "door_led_states": led_states,
                "game_won": completion_state.game_won,
                "victory_time": completion_state.victory_time.isoformat() if completion_state.victory_time else None,
                "completed_rooms_count": sum(1 for room in completion_state.rooms_status.values() if room.get("completed", False)),
                "updated_at": completion_state.updated_at.isoformat()
            }
            
            # Broadcast to all clients in session
            await broadcast_to_session(
                session_id=session_id,
                event="game_completion_update",
                data=broadcast_data
            )
            logger.info(f"[API] 📡 Game completion broadcast sent for session {session_id}")
            
        except Exception as broadcast_error:
            logger.error(f"[API] ❌ Error broadcasting game_completion: {broadcast_error}")
            # Non bloccare la risposta se il broadcast fallisce
        
        return response
        
    except Exception as e:
        logger.error(f"[API] Error completing condizionatore puzzle for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/sessions/{session_id}/livingroom-puzzles/door-servo-status",
    tags=["livingroom_puzzles"]
)
async def get_door_servo_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if door servo should close
    
    Returns:
        - should_close_servo: true when condizionatore completed
        - condizionatore_status: current puzzle status
    
    ESP32 polls this every 2 seconds to control physical door on GPIO P32
    """
    try:
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        return {
            "should_close_servo": puzzle.door_servo_should_close,
            "condizionatore_status": puzzle.condizionatore_status
        }
        
    except Exception as e:
        logger.error(f"[API] Error getting door servo status for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/sessions/{session_id}/livingroom-puzzles/fan-status",
    tags=["livingroom_puzzles"]
)
async def get_fan_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if fan should run
    
    Returns:
        - should_run_fan: true when condizionatore completed
        - condizionatore_status: current puzzle status
    
    ESP32 polls this every 2 seconds to control physical fan on GPIO P26
    """
    try:
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        return {
            "should_run_fan": puzzle.fan_should_run,
            "condizionatore_status": puzzle.condizionatore_status
        }
        
    except Exception as e:
        logger.error(f"[API] Error getting fan status for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/sessions/{session_id}/livingroom-puzzles/reset",
    response_model=LivingRoomPuzzleStateResponse,
    tags=["livingroom_puzzles"]
)
async def reset_puzzles(
    session_id: int,
    request: ResetRequest = ResetRequest(),
    db: Session = Depends(get_db)
):
    """
    Reset living room puzzle state (admin only)
    
    Args:
        level: 'full' (default) = reset everything, 'partial' = keep some progress
    """
    try:
        logger.info(f"[API] Resetting living room puzzles for session {session_id} (level={request.level})")
        response = await LivingRoomPuzzleService.reset_puzzles(db, session_id, request.level)
        
        logger.info(f"[API] ✅ Living room puzzles reset for session {session_id}")
        return response
        
    except Exception as e:
        logger.error(f"[API] Error resetting puzzles for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))