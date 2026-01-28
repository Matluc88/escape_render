"""Game Completion Service - Coordinates all room completions"""
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from typing import Dict
from app.models.game_completion import GameCompletionState
from app.models.kitchen_puzzle import KitchenPuzzleState
from app.models.bedroom_puzzle import BedroomPuzzleState
from app.models.bathroom_puzzle import BathroomPuzzleState
from app.models.livingroom_puzzle import LivingRoomPuzzleState


class GameCompletionService:
    """
    Central service for game completion logic.
    
    Monitors all 4 rooms and determines:
    - Door LED states (red/blinking/green)
    - Game won status
    """
    
    @staticmethod
    def get_or_create_state(db: Session, session_id: int) -> GameCompletionState:
        """
        Get existing state or create new one
        
        Raises:
            ValueError: If session doesn't exist
        """
        state = db.query(GameCompletionState).filter(
            GameCompletionState.session_id == session_id
        ).first()
        
        if state:
            return state
        
        # 🔒 VALIDATE: Check if session exists before creating state
        from app.models.game_session import GameSession
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found. Cannot create game completion state.")
        
        # Create new state
        state = GameCompletionState(
            session_id=session_id,
            rooms_status=GameCompletionState.get_initial_state(),
            game_won=False
        )
        db.add(state)
        db.commit()
        db.refresh(state)
        return state
    
    @staticmethod
    def _is_room_completed(db: Session, session_id: int, room_name: str) -> bool:
        """
        Check if a specific room's puzzles are all completed.
        
        Logic per stanza:
        - cucina: serra.status == "done"
        - camera: porta.status == "unlocked"  
        - bagno: TODO (placeholder - always False)
        - soggiorno: TODO (placeholder - always False)
        """
        if room_name == "cucina":
            kitchen = db.query(KitchenPuzzleState).filter(
                KitchenPuzzleState.session_id == session_id
            ).first()
            
            if not kitchen:
                return False
            
            # Cucina completata quando serra è done
            return kitchen.puzzle_states.get("serra", {}).get("status") == "done"
        
        elif room_name == "camera":
            bedroom = db.query(BedroomPuzzleState).filter(
                BedroomPuzzleState.session_id == session_id
            ).first()
            
            if not bedroom:
                return False
            
            # Camera completata quando porta è unlocked
            return bedroom.puzzle_states.get("porta", {}).get("status") == "unlocked"
        
        elif room_name == "bagno":
            bathroom = db.query(BathroomPuzzleState).filter(
                BathroomPuzzleState.session_id == session_id
            ).first()
            
            if not bathroom:
                return False
            
            # Bagno completato quando tutti e 3 i puzzle sono done
            return (bathroom.puzzle_states.get("specchio", {}).get("status") == "done" and
                    bathroom.puzzle_states.get("doccia", {}).get("status") == "done" and
                    bathroom.puzzle_states.get("ventola", {}).get("status") == "done")
        
        elif room_name == "soggiorno":
            livingroom = db.query(LivingRoomPuzzleState).filter(
                LivingRoomPuzzleState.session_id == session_id
            ).first()
            
            if not livingroom:
                return False
            
            # Soggiorno completato quando tutti e 3 i puzzle sono completed
            return (livingroom.tv_status == "completed" and
                    livingroom.pianta_status == "completed" and
                    livingroom.condizionatore_status == "completed")
        
        return False
    
    @staticmethod
    def mark_room_completed(db: Session, session_id: int, room_name: str):
        """
        Mark a room as completed and check for game victory.
        
        This is called by individual room puzzle services when
        their final puzzle is solved.
        """
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        # Update room status
        if room_name not in state.rooms_status:
            return  # Invalid room name
        
        state.rooms_status[room_name] = {
            "completed": True,
            "completion_time": datetime.utcnow().isoformat()
        }
        
        # Check if game is now won (all 4 rooms completed)
        if state.is_game_complete() and not state.game_won:
            state.game_won = True
            state.victory_time = datetime.utcnow()
            print(f"🏆 [GameCompletion] Session {session_id} - GAME WON!")
        
        state.updated_at = datetime.utcnow()
        flag_modified(state, "rooms_status")
        
        db.commit()
        db.refresh(state)
        
        # ✅ WebSocket broadcast is now handled by the API endpoint (async context)
        # No longer trying to broadcast from this SYNC service method
        
        return state
    
    @staticmethod
    def unmark_room_completed(db: Session, session_id: int, room_name: str):
        """
        Unmark a room as completed (for reset).
        
        This is called when resetting puzzles to ensure
        game_completion state stays in sync.
        """
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        # Update room status
        if room_name not in state.rooms_status:
            return  # Invalid room name
        
        state.rooms_status[room_name] = {
            "completed": False,
            "completion_time": None
        }
        
        # If game was won, reset it
        if state.game_won:
            state.game_won = False
            state.victory_time = None
            print(f"🔄 [GameCompletion] Session {session_id} - Game victory reset")
        
        state.updated_at = datetime.utcnow()
        flag_modified(state, "rooms_status")
        
        db.commit()
        db.refresh(state)
        
        # ✅ WebSocket broadcast is now handled by the API endpoint (async context)
        # No longer trying to broadcast from this SYNC service method
        
        return state
    
    @staticmethod
    def get_door_led_states(db: Session, session_id: int) -> Dict[str, str]:
        """
        Calculate LED states for all 4 door LEDs.
        
        Returns:
            Dict with keys: cucina, camera, bagno, soggiorno
            Values: "red" | "blinking" | "green"
            
        Logic (PER-ROOM with GLOBAL victory):
        - Room not completed → "red"
        - Room completed, game not won → "blinking" (only this room)
        - Game won (all 4 completed) → "green" (all rooms)
        """
        print(f"\n🔍 [get_door_led_states] Calculating for session {session_id}")
        state = GameCompletionService.get_or_create_state(db, session_id)
        print(f"🔍 [get_door_led_states] game_won={state.game_won}, rooms_status={state.rooms_status}")
        
        led_states = {}
        
        for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
            # 🆕 FIX: Check REAL puzzle state instead of trusting cached value
            room_completed = GameCompletionService._is_room_completed(db, session_id, room_name)
            print(f"🔍 [get_door_led_states] {room_name}: room_completed={room_completed}")
            
            if state.game_won:
                # Game won → all doors green (GLOBAL)
                led_states[room_name] = "green"
            elif room_completed:
                # Room completed but game not won → blinking (PER-ROOM)
                led_states[room_name] = "blinking"
            else:
                # Room not completed → red (PER-ROOM)
                led_states[room_name] = "red"
            
            print(f"🔍 [get_door_led_states] {room_name}: LED = {led_states[room_name]}")
        
        print(f"🔍 [get_door_led_states] Final LED states: {led_states}\n")
        return led_states
    
    @staticmethod
    def check_and_update_all_rooms(db: Session, session_id: int) -> GameCompletionState:
        """
        Check actual puzzle state for all rooms and sync completion state.
        
        This is useful for:
        - Recovery after server restart
        - Admin dashboard sync
        - Debug verification
        """
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        # Check each room's actual puzzle status
        for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
            is_completed = GameCompletionService._is_room_completed(db, session_id, room_name)
            
            current_status = state.rooms_status[room_name].get("completed", False)
            
            # Update if changed
            if is_completed and not current_status:
                state.rooms_status[room_name] = {
                    "completed": True,
                    "completion_time": datetime.utcnow().isoformat()
                }
        
        # Check for game victory
        if state.is_game_complete() and not state.game_won:
            state.game_won = True
            state.victory_time = datetime.utcnow()
            print(f"🏆 [GameCompletion] Session {session_id} - GAME WON (synced)!")
        
        state.updated_at = datetime.utcnow()
        flag_modified(state, "rooms_status")
        
        db.commit()
        db.refresh(state)
        
        return state
    
    @staticmethod
    def reset_game_completion(db: Session, session_id: int):
        """Reset game completion state (for new game)"""
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        state.rooms_status = GameCompletionState.get_initial_state()
        state.game_won = False
        state.victory_time = None
        state.updated_at = datetime.utcnow()
        
        flag_modified(state, "rooms_status")
        
        db.commit()
        db.refresh(state)
        
        return state