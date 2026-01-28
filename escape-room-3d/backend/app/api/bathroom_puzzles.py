"""Bathroom Puzzle API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.bathroom_puzzle_service import BathroomPuzzleService
from app.schemas.bathroom_puzzle import (
    BathroomPuzzleStateResponse,
    CompletePuzzleRequest,
    ResetPuzzlesRequest
)
from app.websocket.handler import broadcast_bathroom_update

router = APIRouter(prefix="/api", tags=["bathroom-puzzles"])


@router.get("/sessions/{session_id}/bathroom-puzzles/state", response_model=BathroomPuzzleStateResponse)
def get_bathroom_puzzle_state(session_id: int, db: Session = Depends(get_db)):
    """
    Get current bathroom puzzle state with LED colors.
    
    Returns complete state including:
    - puzzle states (locked/active/done)
    - LED colors (off/red/green)
    - timestamps
    """
    try:
        return BathroomPuzzleService.get_state_response(db, session_id)
    except ValueError as e:
        # Session doesn't exist - return 404
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get puzzle state: {str(e)}"
        )


@router.post("/sessions/{session_id}/bathroom-puzzles/complete", response_model=BathroomPuzzleStateResponse)
async def complete_bathroom_puzzle(
    session_id: int,
    request: CompletePuzzleRequest,
    db: Session = Depends(get_db)
):
    """
    Complete a bathroom puzzle (specchio, doccia, or ventola).
    
    FSM validates the sequence:
    - specchio must be active to complete
    - doccia unlocks after specchio
    - ventola unlocks after doccia
    - completing ventola marks room as done
    
    Returns updated state or 400 if invalid sequence.
    """
    puzzle_name = request.puzzle_name
    
    if puzzle_name == "specchio":
        result = BathroomPuzzleService.validate_specchio_complete(db, session_id)
    elif puzzle_name == "doccia":
        result = BathroomPuzzleService.validate_doccia_complete(db, session_id)
    elif puzzle_name == "ventola":
        result = BathroomPuzzleService.validate_ventola_complete(db, session_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown puzzle: {puzzle_name}")
    
    if result is None:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete {puzzle_name} - check puzzle sequence"
        )
    
    # 🔥 FIX: Commit changes to database before broadcasting
    db.commit()
    
    # Broadcast update via WebSocket
    await broadcast_bathroom_update(session_id, result.dict())
    
    # 🆕 FIX LED PORTA: Se ventola completato → broadcast anche game_completion_update
    if puzzle_name == "ventola" and result:
        from app.services.game_completion_service import GameCompletionService
        from app.websocket.handler import broadcast_game_completion_update
        
        # Calcola nuovi stati LED porta
        led_states = GameCompletionService.get_door_led_states(db, session_id)
        completion_state = GameCompletionService.get_or_create_state(db, session_id)
        
        # Broadcast game_completion_update per aggiornare LED porta
        await broadcast_game_completion_update(session_id, {
            "session_id": session_id,
            "door_led_states": led_states,
            "rooms_status": completion_state.rooms_status,
            "game_won": completion_state.game_won,
            "completed_rooms": sum(1 for r in completion_state.rooms_status.values() if r.get("completed")),
            "updated_at": completion_state.updated_at.isoformat() if completion_state.updated_at else None
        })
    
    return result


@router.post("/sessions/{session_id}/bathroom-puzzles/reset", response_model=BathroomPuzzleStateResponse)
async def reset_bathroom_puzzles(
    session_id: int,
    request: ResetPuzzlesRequest,
    db: Session = Depends(get_db)
):
    """
    Reset bathroom puzzles.
    
    - level="full": Reset all puzzles to initial state
    - level="partial": Reset specific puzzles only
    
    🆕 ALSO broadcasts game_completion_update to update door LED!
    """
    print(f"\n🔄 [API /reset] START - session_id={session_id}, level={request.level}, puzzles={request.puzzles_to_reset}")
    
    try:
        # STEP 1: Verifica che la sessione esista
        print(f"🔍 [API /reset] Step 1: Verifying session exists...")
        from app.models.game_session import GameSession
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            print(f"❌ [API /reset] Session {session_id} NOT FOUND")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        print(f"✅ [API /reset] Session {session_id} exists")
        
        # STEP 2: Reset puzzles
        print(f"🔍 [API /reset] Step 2: Resetting puzzles...")
        result = BathroomPuzzleService.reset_puzzles(
            db,
            session_id,
            request.level,
            request.puzzles_to_reset
        )
        print(f"✅ [API /reset] Puzzles reset successfully")
        
        # STEP 3: Broadcast puzzle state update
        print(f"🔍 [API /reset] Step 3: Broadcasting puzzle state update...")
        await broadcast_bathroom_update(session_id, result.dict())
        print(f"✅ [API /reset] Puzzle state update broadcasted")
        
        # STEP 4: Get game completion state
        print(f"🔍 [API /reset] Step 4: Getting game completion state...")
        from app.services.game_completion_service import GameCompletionService
        from app.websocket.handler import broadcast_game_completion_update
        
        # 🔧 FIX: Wrap get_door_led_states in try-except (can fail if puzzle states don't exist)
        try:
            led_states = GameCompletionService.get_door_led_states(db, session_id)
            print(f"✅ [API /reset] LED states: {led_states}")
        except Exception as led_error:
            print(f"⚠️ [API /reset] Error getting LED states: {led_error}")
            # Fallback: all doors red (initial state)
            led_states = {"cucina": "red", "camera": "red", "bagno": "red", "soggiorno": "red"}
        
        state = GameCompletionService.get_or_create_state(db, session_id)
        print(f"✅ [API /reset] Completion state: game_won={state.game_won}, rooms={state.rooms_status}")
        
        # STEP 5: Broadcast game completion update
        print(f"🔍 [API /reset] Step 5: Broadcasting game completion update...")
        completion_data = {
            "session_id": session_id,
            "rooms_status": state.rooms_status,
            "door_led_states": led_states,
            "game_won": state.game_won,
            "victory_time": state.victory_time.isoformat() if state.victory_time else None,
            "completed_rooms_count": state.get_completed_rooms_count(),
            "updated_at": state.updated_at.isoformat()
        }
        
        await broadcast_game_completion_update(session_id, completion_data)
        print(f"✅ [API /reset] Game completion update broadcasted")
        print(f"🎉 [API /reset] COMPLETED SUCCESSFULLY\n")
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ [API /reset] EXCEPTION: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset puzzles: {type(e).__name__}: {str(e)}"
        )


@router.get("/sessions/{session_id}/bathroom-puzzles/door-servo-status", tags=["bathroom-puzzles"])
async def get_door_servo_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if door servo should open
    
    Returns:
        - should_open_servo: true when game is won (all 4 rooms completed)
        - game_won: current game completion status
    
    ESP32 polls this every 2 seconds to control physical door on GPIO P26
    
    Behavior:
    - game_won = false → door closed (0°)
    - game_won = true → door opens (90°) - VITTORIA!
    """
    try:
        puzzle = BathroomPuzzleService.get_or_create(db, session_id)
        
        # Check game_won status from game_completion_service
        from app.services.game_completion_service import GameCompletionService
        completion = GameCompletionService.get_or_create_state(db, session_id)
        
        return {
            "should_open_servo": puzzle.door_servo_should_open or completion.game_won,
            "game_won": completion.game_won
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/bathroom-puzzles/window-servo-status", tags=["bathroom-puzzles"])
async def get_window_servo_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if window servo should close
    
    Returns:
        - should_close_window: true when ventola puzzle is done
        - ventola_status: current ventola puzzle status
    
    ESP32 polls this every 2 seconds to control physical window on GPIO P25
    
    Behavior:
    - ventola != done → window open (30°)
    - ventola = done → window closes (0°) - impedisce umidità!
    """
    try:
        puzzle = BathroomPuzzleService.get_or_create(db, session_id)
        ventola_status = puzzle.puzzle_states.get("ventola", {}).get("status", "locked")
        
        return {
            "should_close_window": puzzle.window_servo_should_close,
            "ventola_status": ventola_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/bathroom-puzzles/fan-status", tags=["bathroom-puzzles"])
async def get_fan_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if fan should run
    
    Returns:
        - should_run_fan: true when ventola puzzle is done
        - ventola_status: current ventola puzzle status
    
    ESP32 polls this every 2 seconds to control physical fan on GPIO P32
    
    Behavior:
    - ventola != done → fan OFF
    - ventola = done → fan ON (ventilazione attiva!)
    """
    try:
        puzzle = BathroomPuzzleService.get_or_create(db, session_id)
        ventola_status = puzzle.puzzle_states.get("ventola", {}).get("status", "locked")
        
        return {
            "should_run_fan": puzzle.fan_should_run,
            "ventola_status": ventola_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))