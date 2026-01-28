"""Bathroom Puzzle Service - FSM and validation logic"""
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.bathroom_puzzle import BathroomPuzzleState
from app.schemas.bathroom_puzzle import (
    BathroomPuzzleStateResponse,
    BathroomPuzzleStates,
    LEDStates,
    PuzzleStateDetail
)


class BathroomPuzzleService:
    """
    Service for managing bathroom puzzle state machine.
    
    FSM Flow:
    START → specchio(active) → specchio(done) + doccia(active) →
    doccia(done) + ventola(active) → ventola(done) → ROOM COMPLETED
    """
    
    @staticmethod
    def _get_led_states(puzzle_states: Dict[str, Any]) -> LEDStates:
        """
        Convert puzzle states to LED colors.
        
        Rules:
        - locked → off (per doccia e ventola)
        - active → red
        - done → green
        - specchio_white → on when specchio done (LED bianco P33)
        """
        specchio_done = puzzle_states["specchio"]["status"] == "done"
        
        return LEDStates(
            specchio="green" if specchio_done else "red",
            specchio_white="on" if specchio_done else "off",
            porta_finestra="green" if puzzle_states["doccia"]["status"] == "done" else 
                          "red" if puzzle_states["doccia"]["status"] == "active" else "off",
            ventola="green" if puzzle_states["ventola"]["status"] == "done" else 
                   "red" if puzzle_states["ventola"]["status"] == "active" else "off"
        )
    
    @staticmethod
    def _puzzle_states_to_schema(puzzle_states: Dict[str, Any]) -> BathroomPuzzleStates:
        """Convert raw dict to Pydantic schema"""
        return BathroomPuzzleStates(
            specchio=PuzzleStateDetail(**puzzle_states["specchio"]),
            doccia=PuzzleStateDetail(**puzzle_states["doccia"]),
            ventola=PuzzleStateDetail(**puzzle_states["ventola"])
        )
    
    @staticmethod
    def get_or_create(db: Session, session_id: int) -> BathroomPuzzleState:
        """
        Get existing puzzle state or create new one with initial state.
        (Alias per compatibilità con endpoint API)
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            BathroomPuzzleState instance
        """
        return BathroomPuzzleService.get_or_create_state(db, session_id)
    
    @staticmethod
    def get_or_create_state(db: Session, session_id: int) -> BathroomPuzzleState:
        """
        Get existing puzzle state or create new one with initial state.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            BathroomPuzzleState instance
        """
        # Try to get existing state
        state = db.query(BathroomPuzzleState).filter(
            BathroomPuzzleState.session_id == session_id
        ).first()
        
        if state:
            return state
        
        # 🔒 VALIDATE: Check if session exists before creating state
        from app.models.game_session import GameSession
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found. Cannot create bathroom puzzle state.")
        
        # Create new state with initial configuration
        state = BathroomPuzzleState(
            session_id=session_id,
            room_name="bagno",
            puzzle_states=BathroomPuzzleState.get_initial_state(),
            door_servo_should_open=False,      # Porta chiusa inizialmente
            window_servo_should_close=False,   # Finestra aperta inizialmente
            fan_should_run=False               # Ventola spenta inizialmente
        )
        db.add(state)
        db.commit()
        db.refresh(state)
        return state
    
    @staticmethod
    def get_state_response(db: Session, session_id: int) -> BathroomPuzzleStateResponse:
        """
        Get current puzzle state with LED colors.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            BathroomPuzzleStateResponse with current state
        """
        state = BathroomPuzzleService.get_or_create_state(db, session_id)
        
        return BathroomPuzzleStateResponse(
            session_id=state.session_id,
            room_name=state.room_name,
            states=BathroomPuzzleService._puzzle_states_to_schema(state.puzzle_states),
            led_states=BathroomPuzzleService._get_led_states(state.puzzle_states),
            updated_at=state.updated_at
        )
    
    @staticmethod
    def validate_specchio_complete(db: Session, session_id: int) -> Optional[BathroomPuzzleStateResponse]:
        """
        Validate and complete specchio puzzle (countdown luci).
        
        Atomic operation:
        1. Check specchio is 'active'
        2. Mark specchio as 'done' (LED verde)
        3. Unlock doccia (set to 'active', LED rosso)
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BathroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if specchio is active
        if state.puzzle_states["specchio"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["specchio"]["status"] = "done"
        state.puzzle_states["specchio"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["doccia"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes (only if already persisted)
        if state.id is not None:
            flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BathroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_doccia_complete(db: Session, session_id: int) -> Optional[BathroomPuzzleStateResponse]:
        """
        Validate and complete doccia puzzle (chiusura anta per spazio).
        
        Atomic operation:
        1. Check doccia is 'active'
        2. Mark doccia as 'done' (LED verde)
        3. Unlock ventola (set to 'active', LED rosso)
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BathroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if doccia is active
        if state.puzzle_states["doccia"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["doccia"]["status"] = "done"
        state.puzzle_states["doccia"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["ventola"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes (only if already persisted)
        if state.id is not None:
            flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BathroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_ventola_complete(db: Session, session_id: int) -> Optional[BathroomPuzzleStateResponse]:
        """
        Validate and complete ventola puzzle (chiusura porta-finestra per umidità).
        
        Atomic operation:
        1. Check ventola is 'active'
        2. Mark ventola as 'done' (LED verde)
        3. Mark room as completed → LED_PORTA lampeggia!
        4. 🔧 Attiva hardware: window_servo_should_close + fan_should_run
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BathroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if ventola is active
        if state.puzzle_states["ventola"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["ventola"]["status"] = "done"
        state.puzzle_states["ventola"]["completed_at"] = datetime.utcnow().isoformat()
        state.updated_at = datetime.utcnow()
        
        # 🔧 Attiva hardware fisico quando ventola completata
        state.window_servo_should_close = True   # Finestra si chiude (P25: 30° → 0°)
        state.fan_should_run = True              # Ventola si attiva (P32: LOW → HIGH)
        
        # Flag as modified for SQLAlchemy to detect JSONB changes (only if already persisted)
        if state.id is not None:
            flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        # 🆕 Notifica game completion che bagno è completato
        from app.services.game_completion_service import GameCompletionService
        GameCompletionService.mark_room_completed(db, session_id, "bagno")
        
        # 🔥 FIX: Forza un flush per assicurarci che il database sia aggiornato
        db.flush()
        
        return BathroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def reset_puzzles(db: Session, session_id: int, level: str = "full", puzzles_to_reset: Optional[list] = None) -> BathroomPuzzleStateResponse:
        """
        Reset puzzle states.
        
        Args:
            db: Database session
            session_id: Game session ID
            level: 'full' or 'partial'
            puzzles_to_reset: List of puzzle names for partial reset
            
        Returns:
            Updated state after reset
        """
        state = BathroomPuzzleService.get_or_create_state(db, session_id)
        
        if level == "full":
            # Full reset - back to initial state
            state.puzzle_states = BathroomPuzzleState.get_initial_state()
            
            # 🔧 Reset hardware flags
            state.door_servo_should_open = False       # Porta chiusa (0°)
            state.window_servo_should_close = False    # Finestra aperta (30°)
            state.fan_should_run = False               # Ventola spenta
            
            # 🆕 IMPORTANTE: Resetta ANCHE game_completion per questa stanza
            from app.services.game_completion_service import GameCompletionService
            GameCompletionService.unmark_room_completed(db, session_id, "bagno")
            
        elif level == "partial" and puzzles_to_reset:
            # Partial reset - reset specific puzzles
            initial = BathroomPuzzleState.get_initial_state()
            for puzzle_name in puzzles_to_reset:
                if puzzle_name in state.puzzle_states:
                    state.puzzle_states[puzzle_name] = initial[puzzle_name]
                    
            # 🔧 Se resettiamo ventola, resettiamo anche hardware
            if "ventola" in puzzles_to_reset:
                state.window_servo_should_close = False
                state.fan_should_run = False
        
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes (only if already persisted)
        if state.id is not None:
            flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BathroomPuzzleService.get_state_response(db, session_id)