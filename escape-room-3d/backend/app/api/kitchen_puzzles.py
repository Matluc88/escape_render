"""Kitchen Puzzles API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.kitchen_puzzle_service import KitchenPuzzleService
from app.services.game_completion_service import GameCompletionService
from app.schemas.kitchen_puzzle import (
    KitchenPuzzleStateResponse,
    PuzzleCompletionRequest,
    ResetPuzzlesRequest
)
from app.websocket.handler import broadcast_puzzle_update, broadcast_game_completion_update

router = APIRouter(prefix="/api/sessions/{session_id}/kitchen-puzzles", tags=["kitchen-puzzles"])


@router.get("/state", response_model=KitchenPuzzleStateResponse)
async def get_puzzle_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current kitchen puzzle state for a session.
    
    Returns puzzle states and LED colors.
    """
    try:
        state = KitchenPuzzleService.get_state_response(db, session_id)
        return state
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get puzzle state: {str(e)}"
        )


@router.post("/fornelli/complete", response_model=KitchenPuzzleStateResponse)
async def complete_fornelli(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark fornelli puzzle as completed.
    
    Validates that fornelli is active before completing.
    On success, unlocks frigo puzzle.
    """
    # 🔍 DEBUG: Log every call to understand who triggers it
    import traceback
    print(f"\n🔥 [API] /fornelli/complete called for session {session_id}")
    print(f"🔥 [API] Call stack:\n{''.join(traceback.format_stack())}\n")
    
    result = KitchenPuzzleService.validate_fornelli_complete(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fornelli puzzle is not active or already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_puzzle_update(session_id, result)
    
    return result


@router.get("/frigo/servo-state")
async def get_frigo_servo_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if fridge servo should close.
    Returns true when user has confirmed fridge closure in frontend.
    """
    try:
        # Get puzzle state
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        # Servo should close when frigo puzzle is "done" (completed)
        frigo_status = state.puzzle_states.get("frigo", {}).get("status", "locked")
        should_close = frigo_status == "done"
        
        return {
            "should_close_servo": should_close,
            "frigo_status": frigo_status
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/strip-led/state")
async def get_strip_led_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Get strip LED state for physical serra indicator.
    Returns true when serra puzzle is completed (serra 3D light + strip LED synchronized).
    """
    try:
        # Get puzzle state
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        # Strip LED follows serra status (synchronized virtual + physical)
        is_on = state.puzzle_states.get("strip_led", {}).get("is_on", False)
        serra_status = state.puzzle_states.get("serra", {}).get("status", "locked")
        
        return {
            "is_on": is_on,
            "serra_status": serra_status
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/frigo/complete", response_model=KitchenPuzzleStateResponse)
async def complete_frigo(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark frigo puzzle as completed.
    
    Validates that frigo is active before completing.
    On success, unlocks serra puzzle.
    """
    result = KitchenPuzzleService.validate_frigo_closed(db, session_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frigo puzzle is not active or already completed"
        )
    
    # Broadcast update to all connected clients
    await broadcast_puzzle_update(session_id, result)
    
    return result


@router.post("/fornelli/animation-trigger")
async def trigger_pentola_animation(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Trigger pentola animation on fornelli (ESP32 MAG2 sensor).
    Broadcasts animation update via WebSocket to frontend.
    Called BEFORE completing fornelli puzzle to show visual feedback.
    """
    try:
        # Verifica che session esista
        from app.models.game_session import GameSession
        session = db.query(GameSession).filter(
            GameSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Broadcast WebSocket animation update
        from datetime import datetime
        from app.websocket.handler import broadcast_to_session
        
        message_data = {
            "type": "animation_update",
            "session_id": session_id,
            "animation_type": "pentola_fornelli",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await broadcast_to_session(str(session_id), "animation_update", message_data)
        
        print(f"✅ [/fornelli/animation-trigger] Pentola animation broadcasted for session {session_id}")
        
        return {
            "status": "ok",
            "message": "Pentola animation triggered",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [/fornelli/animation-trigger] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger pentola animation: {str(e)}"
        )


@router.post("/anta/toggle")
async def toggle_anta_mobile(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Trigger anta mobile animation (ESP32 MAG1 sensor).
    Broadcasts animation update via WebSocket to frontend.
    Simple animation trigger - no puzzle state check needed.
    """
    try:
        from datetime import datetime
        from app.websocket.handler import broadcast_to_session
        
        message_data = {
            "type": "animation_update",
            "session_id": session_id,
            "animation_type": "anta_toggle",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await broadcast_to_session(str(session_id), "animation_update", message_data)
        
        print(f"✅ [/anta/toggle] Anta animation broadcasted for session {session_id}")
        
        return {
            "status": "ok",
            "message": "Anta animation triggered",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"❌ [/anta/toggle] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger anta animation: {str(e)}"
        )


@router.post("/serra/animation-trigger")
async def trigger_serra_animation(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Trigger serra neon light animation (ESP32 microphone sensor).
    Broadcasts animation update via WebSocket to frontend.
    Called BEFORE completing serra puzzle to show visual feedback.
    """
    try:
        # Verifica che session esista
        from app.models.game_session import GameSession
        session = db.query(GameSession).filter(
            GameSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Broadcast WebSocket animation update
        from datetime import datetime
        await broadcast_puzzle_update(session_id, {
            "type": "animation_update",
            "session_id": session_id,
            "data": {
                "animation_type": "serra_light",
                "state": "on",
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        return {
            "status": "ok",
            "message": "Serra neon animation triggered"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/serra/complete", response_model=KitchenPuzzleStateResponse)
async def complete_serra(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark serra puzzle as completed.
    
    Validates that serra is active before completing.
    On success, unlocks porta (door).
    
    🆕 ALSO broadcasts game_completion_update to update door LED!
    """
    print(f"\n🌿 [API /serra/complete] START for session {session_id}")
    
    try:
        result = KitchenPuzzleService.validate_serra_activated(db, session_id)
        print(f"🌿 [API /serra/complete] validate_serra_activated result: {result is not None}")
        
        if result is None:
            print(f"❌ [API /serra/complete] Serra not active or already completed")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Serra puzzle is not active or already completed"
            )
        
        # Broadcast puzzle state update to all connected clients
        print(f"📡 [API /serra/complete] Broadcasting puzzle_state_update...")
        await broadcast_puzzle_update(session_id, result)
        print(f"✅ [API /serra/complete] puzzle_state_update broadcasted")
        
        # 🆕 FIX: Broadcast game completion update FROM HERE (async context)
        # Get door LED states after room completion
        print(f"🔍 [API /serra/complete] Getting door LED states...")
        led_states = GameCompletionService.get_door_led_states(db, session_id)
        print(f"🔍 [API /serra/complete] LED states: {led_states}")
        
        state = GameCompletionService.get_or_create_state(db, session_id)
        print(f"🔍 [API /serra/complete] Completion state: rooms_status={state.rooms_status}, game_won={state.game_won}")
        
        completion_data = {
            "session_id": session_id,
            "rooms_status": state.rooms_status,
            "door_led_states": led_states,
            "game_won": state.game_won,
            "victory_time": state.victory_time.isoformat() if state.victory_time else None,
            "completed_rooms_count": state.get_completed_rooms_count(),
            "updated_at": state.updated_at.isoformat()
        }
        
        print(f"📡 [API /serra/complete] Broadcasting game_completion_update...")
        print(f"📡 [API /serra/complete] Completion data: {completion_data}")
        await broadcast_game_completion_update(session_id, completion_data)
        print(f"🚀 [API /serra/complete] game_completion_update broadcasted successfully!\n")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [API /serra/complete] EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete serra: {str(e)}"
        )


@router.post("/reset", response_model=KitchenPuzzleStateResponse)
async def reset_puzzles(
    session_id: int,
    request: ResetPuzzlesRequest,
    db: Session = Depends(get_db)
):
    """
    Reset kitchen puzzles.
    
    Supports:
    - Full reset: All puzzles back to initial state
    - Partial reset: Reset specific puzzles
    
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
        result = KitchenPuzzleService.reset_puzzles(
            db, 
            session_id, 
            request.level, 
            request.puzzles_to_reset
        )
        print(f"✅ [API /reset] Puzzles reset successfully")
        
        # STEP 3: Broadcast puzzle state update
        print(f"🔍 [API /reset] Step 3: Broadcasting puzzle state update...")
        await broadcast_puzzle_update(session_id, result)
        print(f"✅ [API /reset] Puzzle state update broadcasted")
        
        # STEP 4: Get game completion state
        print(f"🔍 [API /reset] Step 4: Getting game completion state...")
        led_states = GameCompletionService.get_door_led_states(db, session_id)
        print(f"✅ [API /reset] LED states: {led_states}")
        
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
