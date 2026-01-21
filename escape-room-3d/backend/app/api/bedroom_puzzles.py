"""Bedroom Puzzles API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.bedroom_puzzle_service import BedroomPuzzleService
from app.schemas.bedroom_puzzle import (
    BedroomPuzzleStateResponse,
    PuzzleCompletionRequest,
    ResetPuzzlesRequest
)
from app.websocket.handler import broadcast_bedroom_puzzle_update

router = APIRouter(prefix="/api/sessions/{session_id}/bedroom-puzzles", tags=["bedroom-puzzles"])


@router.get("/state", response_model=BedroomPuzzleStateResponse)
async def get_puzzle_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current bedroom puzzle state for a session.
    
    Returns puzzle states and LED colors.
    """
    try:
        state = BedroomPuzzleService.get_state_response(db, session_id)
        return state
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get puzzle state: {str(e)}"
        )


@router.post("/comodino/complete", response_model=BedroomPuzzleStateResponse)
async def complete_comodino(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark comodino puzzle as completed (TASTO K).
    
    Note: Questo endpoint marca la sequenza come eseguita ma non cambia LED.
    """
    result = BedroomPuzzleService.validate_comodino_complete(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comodino puzzle already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_bedroom_puzzle_update(session_id, result)
    
    return result


@router.post("/materasso/complete", response_model=BedroomPuzzleStateResponse)
async def complete_materasso(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark materasso puzzle as completed (TASTO M).
    
    Validates that materasso is active before completing.
    On success, unlocks poltrona puzzle.
    """
    result = BedroomPuzzleService.validate_materasso_complete(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Materasso puzzle is not active or already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_bedroom_puzzle_update(session_id, result)
    
    return result


@router.post("/poltrona/complete", response_model=BedroomPuzzleStateResponse)
async def complete_poltrona(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark poltrona puzzle as completed (TASTO L).
    
    Validates that poltrona is active before completing.
    On success, unlocks ventola puzzle.
    """
    result = BedroomPuzzleService.validate_poltrona_complete(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Poltrona puzzle is not active or already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_bedroom_puzzle_update(session_id, result)
    
    return result


@router.post("/ventola/complete", response_model=BedroomPuzzleStateResponse)
async def complete_ventola(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark ventola puzzle as completed (TASTO J).
    
    Validates that ventola is active before completing.
    On success, unlocks porta (door) → VITTORIA!
    """
    result = BedroomPuzzleService.validate_ventola_complete(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ventola puzzle is not active or already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_bedroom_puzzle_update(session_id, result)
    
    # 🆕 CRITICAL FIX: Broadcast game completion update when room is completed
    from app.services.game_completion_service import GameCompletionService
    from app.websocket.handler import broadcast_game_completion_update
    
    # Get updated game completion state
    completion_state = GameCompletionService.get_or_create_state(db, session_id)
    door_led_states = GameCompletionService.get_door_led_states(db, session_id)
    
    # Build response matching frontend expectations
    completion_data = {
        'session_id': completion_state.session_id,
        'rooms_status': completion_state.rooms_status,
        'door_led_states': door_led_states,
        'game_won': completion_state.game_won,
        'victory_time': completion_state.victory_time.isoformat() if completion_state.victory_time else None,
        'completed_rooms': completion_state.get_completed_rooms_count(),
        'updated_at': completion_state.updated_at.isoformat()
    }
    
    # Broadcast to all clients in the session
    await broadcast_game_completion_update(session_id, completion_data)
    
    return result


@router.post("/reset", response_model=BedroomPuzzleStateResponse)
async def reset_puzzles(
    session_id: int,
    request: ResetPuzzlesRequest,
    db: Session = Depends(get_db)
):
    """
    Reset bedroom puzzles.
    
    Supports:
    - Full reset: All puzzles back to initial state
    - Partial reset: Reset specific puzzles
    """
    try:
        result = BedroomPuzzleService.reset_puzzles(
            db, 
            session_id, 
            request.level, 
            request.puzzles_to_reset
        )
        
        # Broadcast update to all connected clients
        await broadcast_bedroom_puzzle_update(session_id, result)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset puzzles: {str(e)}"
        )


# ================= ESP32 HARDWARE CONTROL ENDPOINTS =================

@router.get("/fan-status")
async def get_fan_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get fan status for ESP32 hardware control.
    
    Returns should_run_fan=true when ventola puzzle is completed.
    ESP32 polls this endpoint every 2 seconds to control physical fan (P23).
    """
    try:
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Fan should run when ventola puzzle is done
        should_run = state.puzzle_states["ventola"]["status"] == "done"
        
        return {
            "session_id": session_id,
            "should_run_fan": should_run,
            "ventola_status": state.puzzle_states["ventola"]["status"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get fan status: {str(e)}"
        )


@router.get("/door-servo-status")
async def get_door_servo_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get door servo status for ESP32 hardware control.
    
    Returns should_open_servo=true when porta is unlocked (game won).
    ESP32 polls this endpoint every 2 seconds to control servo P25.
    """
    try:
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Door servo should open when porta is unlocked
        should_open = state.puzzle_states["porta"]["status"] == "unlocked"
        
        return {
            "session_id": session_id,
            "should_open_servo": should_open,
            "porta_status": state.puzzle_states["porta"]["status"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get door servo status: {str(e)}"
        )


@router.get("/bed-servo-status")
async def get_bed_servo_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get bed servo status for ESP32 hardware control.
    
    Returns should_lower_bed=true when materasso puzzle is completed.
    ESP32 polls this endpoint every 2 seconds to control servo P33 (slow movement).
    """
    try:
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Bed should lower when materasso puzzle is done
        should_lower = state.puzzle_states["materasso"]["status"] == "done"
        
        return {
            "session_id": session_id,
            "should_lower_bed": should_lower,
            "materasso_status": state.puzzle_states["materasso"]["status"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get bed servo status: {str(e)}"
        )