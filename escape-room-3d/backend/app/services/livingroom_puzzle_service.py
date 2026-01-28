"""
Living Room Puzzle Service

FSM (Finite State Machine) for Living Room puzzles:
- TV (Tasto M): locked → completed
- Pianta (Tasto G): locked → active → completed
- Condizionatore (Click): locked → active → completed

When condizionatore completed → Triggers game_completion.update_room_completion('soggiorno')
"""

from sqlalchemy.orm import Session
from typing import Dict
import logging

from app.models.livingroom_puzzle import LivingRoomPuzzleState
from app.models.game_session import GameSession

logger = logging.getLogger(__name__)


class LivingRoomPuzzleService:
    """Service for managing Living Room puzzle state machine"""
    
    @staticmethod
    def get_or_create(db: Session, session_id: int) -> LivingRoomPuzzleState:
        """
        Get existing puzzle state or create new one with default values
        """
        puzzle = db.query(LivingRoomPuzzleState).filter(
            LivingRoomPuzzleState.session_id == session_id
        ).first()
        
        if not puzzle:
            # 🔒 VALIDATE: Check if session exists before creating state
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                logger.error(f"[LivingRoomPuzzle] ❌ Session {session_id} not found")
                raise ValueError(f"Session {session_id} not found. Cannot create livingroom puzzle state.")
            
            logger.info(f"[LivingRoomPuzzle] Creating new puzzle state for session {session_id}")
            puzzle = LivingRoomPuzzleState(
                session_id=session_id,
                tv_status="active",  # ✅ TV è il primo puzzle - accessibile subito!
                pianta_status="locked",
                condizionatore_status="locked"
            )
            db.add(puzzle)
            db.commit()
            db.refresh(puzzle)
            logger.info(f"[LivingRoomPuzzle] ✅ Puzzle state created: {puzzle}")
        
        return puzzle
    
    @staticmethod
    def calculate_led_states(puzzle: LivingRoomPuzzleState) -> Dict[str, str]:
        """
        Calculate LED states based on puzzle stati
        
        LED Logic:
        - Pianta: locked=off, active=red, completed=green
        - Condizionatore: locked=off, active=red, completed=green
        
        Note: Porta LED is managed by game_completion system (blinking logic)
        """
        led_states = {}
        
        # Pianta LED
        if puzzle.pianta_status == "locked":
            led_states["pianta"] = "off"
        elif puzzle.pianta_status == "active":
            led_states["pianta"] = "red"
        else:  # completed
            led_states["pianta"] = "green"
        
        # Condizionatore LED
        if puzzle.condizionatore_status == "locked":
            led_states["condizionatore"] = "off"
        elif puzzle.condizionatore_status == "active":
            led_states["condizionatore"] = "red"
        else:  # completed
            led_states["condizionatore"] = "green"
        
        return led_states
    
    @staticmethod
    async def complete_tv(db: Session, session_id: int) -> Dict:
        """
        Complete TV puzzle (Tasto M)
        
        Transition: tv: active → completed
        Side effect: pianta: locked → active (LED rosso)
        """
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        # Validate FSM transition
        if puzzle.tv_status == "completed":
            logger.warning(f"[LivingRoomPuzzle] TV already completed for session {session_id}")
            return LivingRoomPuzzleService._build_response(puzzle)
        
        if puzzle.tv_status != "active":
            logger.warning(
                f"[LivingRoomPuzzle] Invalid TV transition: {puzzle.tv_status} → completed. "
                f"Must be 'active'. Session {session_id}"
            )
            return LivingRoomPuzzleService._build_response(puzzle)
        
        # Apply transition
        logger.info(f"[LivingRoomPuzzle] Session {session_id}: Completing TV puzzle")
        puzzle.tv_status = "completed"
        puzzle.pianta_status = "active"  # Sblocca prossimo enigma
        
        db.commit()
        db.refresh(puzzle)
        
        logger.info(
            f"[LivingRoomPuzzle] ✅ TV completed! "
            f"Session {session_id}: tv=completed, pianta=active"
        )
        
        response = LivingRoomPuzzleService._build_response(puzzle)
        
        # Broadcast WebSocket update
        await LivingRoomPuzzleService._broadcast_update(session_id, response)
        
        return response
    
    @staticmethod
    async def complete_pianta(db: Session, session_id: int) -> Dict:
        """
        Complete Pianta puzzle (Tasto G)
        
        Transition: pianta: active → completed
        Side effect: condizionatore: locked → active (LED rosso)
        """
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        # Validate FSM transition
        if puzzle.pianta_status == "completed":
            logger.warning(f"[LivingRoomPuzzle] Pianta already completed for session {session_id}")
            return LivingRoomPuzzleService._build_response(puzzle)
        
        if puzzle.pianta_status != "active":
            logger.warning(
                f"[LivingRoomPuzzle] Invalid pianta transition: {puzzle.pianta_status} → completed. "
                f"Must be 'active'. Session {session_id}"
            )
            return LivingRoomPuzzleService._build_response(puzzle)
        
        # Apply transition
        logger.info(f"[LivingRoomPuzzle] Session {session_id}: Completing pianta puzzle")
        puzzle.pianta_status = "completed"
        puzzle.condizionatore_status = "active"  # Sblocca ultimo enigma
        
        db.commit()
        db.refresh(puzzle)
        
        logger.info(
            f"[LivingRoomPuzzle] ✅ Pianta completed! "
            f"Session {session_id}: pianta=completed, condizionatore=active"
        )
        
        response = LivingRoomPuzzleService._build_response(puzzle)
        
        # Broadcast WebSocket update
        await LivingRoomPuzzleService._broadcast_update(session_id, response)
        
        return response
    
    @staticmethod
    async def complete_condizionatore(db: Session, session_id: int) -> Dict:
        """
        Complete Condizionatore puzzle (Click + porta chiusa)
        
        Transition: condizionatore: active → completed
        Side effect: ✨ Triggers game_completion.update_room_completion('soggiorno')
        
        This unlocks the door LED (managed globally by game_completion)
        """
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        # Validate FSM transition
        if puzzle.condizionatore_status == "completed":
            logger.warning(f"[LivingRoomPuzzle] Condizionatore already completed for session {session_id}")
            return LivingRoomPuzzleService._build_response(puzzle)
        
        if puzzle.condizionatore_status != "active":
            logger.warning(
                f"[LivingRoomPuzzle] Invalid condizionatore transition: {puzzle.condizionatore_status} → completed. "
                f"Must be 'active'. Session {session_id}"
            )
            return LivingRoomPuzzleService._build_response(puzzle)
        
        # Apply transition
        logger.info(f"[LivingRoomPuzzle] Session {session_id}: Completing condizionatore puzzle")
        puzzle.condizionatore_status = "completed"
        
        # 🚪 ACTIVATE DOOR SERVO - Physical door will close via ESP32 P32
        puzzle.door_servo_should_close = True
        logger.info(f"[LivingRoomPuzzle] 🚪 Door servo activated (P32 will close door)")
        
        # 🌀 ACTIVATE FAN - Physical fan will start via ESP32 P26
        puzzle.fan_should_run = True
        logger.info(f"[LivingRoomPuzzle] 🌀 Fan activated (P26 will start running)")
        
        db.commit()
        db.refresh(puzzle)
        
        logger.info(
            f"[LivingRoomPuzzle] ✅ Condizionatore completed! "
            f"Session {session_id}: ALL PUZZLES DONE! 🎉"
        )
        
        response = LivingRoomPuzzleService._build_response(puzzle)
        
        # Broadcast WebSocket update
        await LivingRoomPuzzleService._broadcast_update(session_id, response)
        
        # ✨ TRIGGER GAME COMPLETION (soggiorno completed!)
        try:
            from app.services.game_completion_service import GameCompletionService
            
            logger.info(f"[LivingRoomPuzzle] 🏆 Notifying game_completion: soggiorno completed!")
            GameCompletionService.mark_room_completed(db, session_id, "soggiorno")
            logger.info(f"[LivingRoomPuzzle] ✅ Game completion notified successfully")
            
        except Exception as e:
            logger.error(f"[LivingRoomPuzzle] ❌ Error notifying game_completion: {e}")
            # Non bloccare il puzzle, anche se game_completion fallisce
        
        return response
    
    @staticmethod
    async def reset_puzzles(db: Session, session_id: int, level: str = "full") -> Dict:
        """
        Reset puzzle state
        
        Args:
            level: 'full' = reset tutto, 'partial' = mantieni alcuni progressi
        """
        puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
        
        logger.info(f"[LivingRoomPuzzle] Resetting puzzles for session {session_id} (level={level})")
        
        # Full reset - TV torna "active" (primo puzzle disponibile)
        puzzle.tv_status = "active"
        puzzle.pianta_status = "locked"
        puzzle.condizionatore_status = "locked"
        
        # 🚪 RESET DOOR SERVO - Physical door will reopen to 45° via ESP32 P32
        puzzle.door_servo_should_close = False
        logger.info(f"[LivingRoomPuzzle] 🚪 Door servo reset (P32 will reopen door to 45°)")
        
        # 🌀 RESET FAN - Physical fan will stop via ESP32 P26
        puzzle.fan_should_run = False
        logger.info(f"[LivingRoomPuzzle] 🌀 Fan stopped (P26 will turn off)")
        
        db.commit()
        db.refresh(puzzle)
        
        logger.info(f"[LivingRoomPuzzle] ✅ Puzzles reset: {puzzle}")
        
        response = LivingRoomPuzzleService._build_response(puzzle)
        
        # Broadcast WebSocket update
        await LivingRoomPuzzleService._broadcast_update(session_id, response)
        
        return response
    
    @staticmethod
    def _build_response(puzzle: LivingRoomPuzzleState) -> Dict:
        """Build response dict with puzzle states and LED states"""
        return {
            "session_id": puzzle.session_id,
            "states": {
                "tv": {"status": puzzle.tv_status},
                "pianta": {"status": puzzle.pianta_status},
                "condizionatore": {"status": puzzle.condizionatore_status}
            },
            "led_states": LivingRoomPuzzleService.calculate_led_states(puzzle)
        }
    
    @staticmethod
    async def _broadcast_update(session_id: int, response: Dict):
        """Broadcast puzzle state update via WebSocket"""
        try:
            from app.websocket.handler import broadcast_to_session
            
            await broadcast_to_session(
                session_id=session_id,
                event="puzzle_state_update",
                data=response
            )
            logger.info(f"[LivingRoomPuzzle] 📡 WebSocket broadcast sent to session {session_id}")
            
        except Exception as e:
            logger.error(f"[LivingRoomPuzzle] ❌ WebSocket broadcast error: {e}")
            # Non bloccare l'operazione se WebSocket fallisce