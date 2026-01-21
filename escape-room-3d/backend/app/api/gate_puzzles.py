"""Gate Puzzle API Endpoints - Esterno"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.gate_puzzle_service import GatePuzzleService
from app.schemas.gate_puzzle import (
    GatePuzzleResponse,
    GatePuzzleStateResponse,
    GatePuzzleESP32Response
)

router = APIRouter(prefix="/api", tags=["gate-puzzles"])


@router.get("/sessions/{session_id}/gate-puzzles/state", response_model=GatePuzzleStateResponse)
def get_gate_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current gate/esterno puzzle state.
    
    Used by:
    - Frontend to show 🏠 Esterno 0/1 or 1/1
    - ESP32 to sync animations
    
    Returns:
        - photocell_clear: fotocellula libera (TRUE) o occupata (FALSE)
        - gates_open: cancelli aperti
        - door_open: porta ingresso aperta
        - roof_open: tetto serra aperto
        - led_status: "red" o "green"
        - rgb_strip_on: strip RGB festa (solo se all rooms complete)
        - completed: True se fotocellula è stata libera almeno una volta
    """
    try:
        puzzle = GatePuzzleService.get_state(db, session_id)
        
        return GatePuzzleStateResponse(
            session_id=puzzle.session_id,
            photocell_clear=puzzle.photocell_clear,
            gates_open=puzzle.gates_open,
            door_open=puzzle.door_open,
            roof_open=puzzle.roof_open,
            led_status=puzzle.led_status,
            rgb_strip_on=puzzle.rgb_strip_on,
            completed=(puzzle.completed_at is not None),
            updated_at=puzzle.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/gate-puzzles/photocell/update")
async def update_photocell(
    session_id: int,
    is_clear: bool,
    db: Session = Depends(get_db)
):
    """
    Update photocell state (chiamato da ESP32).
    
    Args:
        is_clear: True = LIBERA (HIGH), False = OCCUPATA (LOW)
    
    This endpoint:
    - Updates gate puzzle state in DB
    - Triggers animations (gates, door, roof)
    - Updates LED status
    - Checks game completion for RGB strip
    - Marks puzzle as completed if first time clear
    - Publishes state to MQTT for frontend sync
    
    Returns:
        Updated state
    """
    try:
        puzzle = await GatePuzzleService.update_photocell_state_async(db, session_id, is_clear)
        
        return {
            "success": True,
            "session_id": session_id,
            "photocell_clear": puzzle.photocell_clear,
            "gates_open": puzzle.gates_open,
            "door_open": puzzle.door_open,
            "roof_open": puzzle.roof_open,
            "led_status": puzzle.led_status,
            "rgb_strip_on": puzzle.rgb_strip_on,
            "completed": (puzzle.completed_at is not None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/gate-puzzles/esp32-state", response_model=GatePuzzleESP32Response)
def get_esp32_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Minimal endpoint for ESP32 polling.
    
    ESP32 chiama questo ogni 2 secondi per:
    - Controllare se attivare strip RGB festa
    - Sincronizzare stato LED
    
    Returns:
        {
            "rgb_strip_on": bool,
            "led_status": "red"|"green",
            "all_rooms_complete": bool
        }
    """
    try:
        state = GatePuzzleService.get_esp32_state(db, session_id)
        return GatePuzzleESP32Response(**state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/gate-puzzles/reset")
def reset_gate_puzzle(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Reset gate puzzle to initial state.
    
    Resets:
    - photocell_clear → False
    - All animations → closed
    - LED → red
    - RGB strip → off
    - completed_at → None
    """
    try:
        puzzle = GatePuzzleService.reset(db, session_id)
        
        return {
            "success": True,
            "message": "Gate puzzle reset successfully",
            "session_id": session_id,
            "photocell_clear": puzzle.photocell_clear,
            "completed": (puzzle.completed_at is not None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))