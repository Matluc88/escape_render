"""Game Completion API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.game_completion_service import GameCompletionService
from app.schemas.game_completion import (
    GameCompletionResponse,
    RoomStatusDetail,
    DoorLEDStates
)

router = APIRouter(prefix="/api", tags=["game-completion"])


@router.get("/sessions/{session_id}/game-completion/state", response_model=GameCompletionResponse)
def get_game_completion_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current game completion state for a session.
    
    Returns:
    - rooms_status: Completion status for each room
    - door_led_states: LED states (red/blinking/green) for door LEDs
    - game_won: True if all 4 rooms completed
    - victory_time: Timestamp of victory (if game won)
    """
    try:
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        # 🔧 FIX: Wrap get_door_led_states in try-except (can fail if puzzle states don't exist)
        try:
            door_led_states = GameCompletionService.get_door_led_states(db, session_id)
        except Exception as led_error:
            print(f"⚠️ [game-completion/state] Error getting LED states: {led_error}")
            # Fallback: all doors red (initial state)
            door_led_states = {"cucina": "red", "camera": "red", "bagno": "red", "soggiorno": "red"}
        
        # Convert rooms_status dict to typed schema
        rooms_status_typed = {
            room: RoomStatusDetail(**status)
            for room, status in state.rooms_status.items()
        }
        
        return GameCompletionResponse(
            session_id=state.session_id,
            rooms_status=rooms_status_typed,
            door_led_states=DoorLEDStates(**door_led_states),
            game_won=state.game_won,
            victory_time=state.victory_time,
            completed_rooms_count=state.get_completed_rooms_count(),
            updated_at=state.updated_at
        )
    except ValueError as e:
        # Session doesn't exist
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"❌ [game-completion/state] Fatal error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/sessions/{session_id}/game-completion/sync")
def sync_game_completion(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Synchronize game completion state by checking all puzzle states.
    
    Useful for:
    - Recovery after server restart
    - Admin verification
    - Debug sync
    """
    try:
        state = GameCompletionService.check_and_update_all_rooms(db, session_id)
        door_led_states = GameCompletionService.get_door_led_states(db, session_id)
        
        rooms_status_typed = {
            room: RoomStatusDetail(**status)
            for room, status in state.rooms_status.items()
        }
        
        return GameCompletionResponse(
            session_id=state.session_id,
            rooms_status=rooms_status_typed,
            door_led_states=DoorLEDStates(**door_led_states),
            game_won=state.game_won,
            victory_time=state.victory_time,
            completed_rooms_count=state.get_completed_rooms_count(),
            updated_at=state.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/game-completion/reset")
def reset_game_completion(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Reset game completion state (for new game attempt).
    
    Resets:
    - All rooms to not completed
    - game_won to False
    - victory_time to None
    """
    try:
        state = GameCompletionService.reset_game_completion(db, session_id)
        door_led_states = GameCompletionService.get_door_led_states(db, session_id)
        
        rooms_status_typed = {
            room: RoomStatusDetail(**status)
            for room, status in state.rooms_status.items()
        }
        
        return GameCompletionResponse(
            session_id=state.session_id,
            rooms_status=rooms_status_typed,
            door_led_states=DoorLEDStates(**door_led_states),
            game_won=state.game_won,
            victory_time=state.victory_time,
            completed_rooms_count=state.get_completed_rooms_count(),
            updated_at=state.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/game-completion/status")
def get_game_completion_status_esp32(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Simplified endpoint for ESP32 polling.
    
    Returns minimal JSON:
    {
        "kitchen_complete": true/false,
        "bedroom_complete": true/false,
        "livingroom_complete": true/false,
        "bathroom_complete": true/false,
        "all_rooms_complete": true/false
    }
    """
    try:
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        return {
            "kitchen_complete": state.rooms_status.get("cucina", {}).get("completed", False),
            "bedroom_complete": state.rooms_status.get("camera", {}).get("completed", False),
            "livingroom_complete": state.rooms_status.get("soggiorno", {}).get("completed", False),
            "bathroom_complete": state.rooms_status.get("bagno", {}).get("completed", False),
            "all_rooms_complete": state.game_won
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/game-completion/door-leds")
def get_door_leds_global(db: Session = Depends(get_db)):
    """
    ✨ ENDPOINT GLOBALE per ESP32 - Auto-resolve sessione attiva
    
    Questo endpoint:
    - NON richiede session_id hardcoded
    - Auto-risolve la sessione attiva corrente
    - Restituisce SOLO gli stati dei LED porta
    
    Ideale per ESP32 che non devono essere riconfigurati
    ad ogni nuova partita.
    
    Returns:
    {
        "cucina": "red" | "blinking_green" | "green",
        "camera": "red" | "blinking_green" | "green",
        "bagno": "red" | "blinking_green" | "green",
        "soggiorno": "red" | "blinking_green" | "green"
    }
    
    Se nessuna sessione attiva:
    - Restituisce tutti LED rossi (stato iniziale)
    """
    try:
        from app.services.session_service import SessionService
        
        # Auto-resolve sessione attiva
        session_service = SessionService(db)
        active_session = session_service.get_active()
        
        if not active_session:
            # Nessuna sessione attiva - Restituisci stato iniziale (tutti rossi)
            return {
                "cucina": "red",
                "camera": "red",
                "bagno": "red",
                "soggiorno": "red"
            }
        
        # Ottieni door_led_states della sessione attiva
        door_led_states = GameCompletionService.get_door_led_states(db, active_session.id)
        
        return {
            "cucina": door_led_states.get("cucina", "red"),
            "camera": door_led_states.get("camera", "red"),
            "bagno": door_led_states.get("bagno", "red"),
            "soggiorno": door_led_states.get("soggiorno", "red")
        }
        
    except Exception as e:
        # In caso di errore, restituisci stato sicuro (tutti rossi)
        return {
            "cucina": "red",
            "camera": "red",
            "bagno": "red",
            "soggiorno": "red"
        }