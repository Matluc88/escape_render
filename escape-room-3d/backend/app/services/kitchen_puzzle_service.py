"""Kitchen Puzzle Service - FSM and validation logic"""
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.kitchen_puzzle import KitchenPuzzleState
from app.models.game_session import GameSession
from app.schemas.kitchen_puzzle import (
    KitchenPuzzleStateResponse, 
    KitchenPuzzleStates,
    LEDStates,
    PuzzleStateDetail,
    PortaStateDetail
)


class KitchenPuzzleService:
    """
    Service for managing kitchen puzzle state machine.
    
    FSM Flow:
    START → fornelli(active) → fornelli(done) + frigo(active) →
    frigo(done) + serra(active) → serra(done) + porta(unlocked)
    """
    
    @staticmethod
    def _get_led_states(puzzle_states: Dict[str, Any], db: Session, session_id: int) -> LEDStates:
        """
        Convert puzzle states to LED colors.
        
        Rules:
        - locked → off
        - active → red
        - done → green
        - porta: consulta game_completion per logica blinking
        """
        # Consulta game_completion per stato LED porta
        from app.services.game_completion_service import GameCompletionService
        door_led_states = GameCompletionService.get_door_led_states(db, session_id)
        
        return LEDStates(
            fornelli="green" if puzzle_states["fornelli"]["status"] == "done" else 
                    "red" if puzzle_states["fornelli"]["status"] == "active" else "off",
            frigo="green" if puzzle_states["frigo"]["status"] == "done" else 
                 "red" if puzzle_states["frigo"]["status"] == "active" else "off",
            serra="green" if puzzle_states["serra"]["status"] == "done" else 
                 "red" if puzzle_states["serra"]["status"] == "active" else "off",
            porta=door_led_states.get("cucina", "red")  # Usa logica game_completion
        )
    
    @staticmethod
    def _puzzle_states_to_schema(puzzle_states: Dict[str, Any]) -> KitchenPuzzleStates:
        """Convert raw dict to Pydantic schema"""
        return KitchenPuzzleStates(
            fornelli=PuzzleStateDetail(**puzzle_states["fornelli"]),
            frigo=PuzzleStateDetail(**puzzle_states["frigo"]),
            serra=PuzzleStateDetail(**puzzle_states["serra"]),
            porta=PortaStateDetail(**puzzle_states["porta"])
        )
    
    @staticmethod
    def get_or_create_state(db: Session, session_id: int) -> KitchenPuzzleState:
        """
        Get existing puzzle state or create new one with initial state.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            KitchenPuzzleState instance
        """
        # Try to get existing state
        state = db.query(KitchenPuzzleState).filter(
            KitchenPuzzleState.session_id == session_id
        ).first()
        
        if state:
            return state
        
        # Create new state with initial configuration
        state = KitchenPuzzleState(
            session_id=session_id,
            room_name="cucina",
            puzzle_states=KitchenPuzzleState.get_initial_state()
        )
        db.add(state)
        db.commit()
        db.refresh(state)
        return state
    
    @staticmethod
    def get_state_response(db: Session, session_id: int) -> KitchenPuzzleStateResponse:
        """
        Get current puzzle state with LED colors.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            KitchenPuzzleStateResponse with current state
        """
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        return KitchenPuzzleStateResponse(
            session_id=state.session_id,
            room_name=state.room_name,
            states=KitchenPuzzleService._puzzle_states_to_schema(state.puzzle_states),
            led_states=KitchenPuzzleService._get_led_states(state.puzzle_states, db, session_id),
            updated_at=state.updated_at
        )
    
    @staticmethod
    def validate_fornelli_complete(db: Session, session_id: int) -> Optional[KitchenPuzzleStateResponse]:
        """
        Validate and complete fornelli puzzle.
        
        Atomic operation:
        1. Check fornelli is 'active'
        2. Mark fornelli as 'done'
        3. Unlock frigo (set to 'active')
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if fornelli is active
        if state.puzzle_states["fornelli"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["fornelli"]["status"] = "done"
        state.puzzle_states["fornelli"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["frigo"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return KitchenPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_frigo_closed(db: Session, session_id: int) -> Optional[KitchenPuzzleStateResponse]:
        """
        Validate and complete frigo puzzle.
        
        Atomic operation:
        1. Check frigo is 'active'
        2. Mark frigo as 'done'
        3. Unlock serra (set to 'active')
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if frigo is active
        if state.puzzle_states["frigo"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["frigo"]["status"] = "done"
        state.puzzle_states["frigo"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["serra"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return KitchenPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_serra_activated(db: Session, session_id: int) -> Optional[KitchenPuzzleStateResponse]:
        """
        Validate and complete serra puzzle.
        
        Atomic operation:
        1. Check serra is 'active'
        2. Mark serra as 'done'
        3. Unlock porta (set to 'unlocked')
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if serra is active
        if state.puzzle_states["serra"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["serra"]["status"] = "done"
        state.puzzle_states["serra"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["porta"]["status"] = "unlocked"
        
        # 🆕 Sincronizza strip LED fisica con serra virtuale
        state.puzzle_states["strip_led"]["is_on"] = True
        
        state.updated_at = datetime.utcnow()
        
        # ✅ FIX: Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        # 🆕 Notifica game completion che cucina è completata
        # IMPORTANTE: Passa la db session per garantire che il commit sia sincronizzato
        from app.services.game_completion_service import GameCompletionService
        completion_state = GameCompletionService.mark_room_completed(db, session_id, "cucina")
        
        # 🔥 FIX: Forza un flush per assicurarci che il database sia aggiornato
        db.flush()
        
        return KitchenPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def reset_puzzles(db: Session, session_id: int, level: str = "full", puzzles_to_reset: Optional[list] = None) -> KitchenPuzzleStateResponse:
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
        state = KitchenPuzzleService.get_or_create_state(db, session_id)
        
        if level == "full":
            # Full reset - back to initial state
            state.puzzle_states = KitchenPuzzleState.get_initial_state()
            
            # 🆕 IMPORTANTE: Resetta ANCHE game_completion per questa stanza
            # Altrimenti c'è inconsistenza tra kitchen_puzzles e game_completion
            from app.services.game_completion_service import GameCompletionService
            GameCompletionService.unmark_room_completed(db, session_id, "cucina")
            
        elif level == "partial" and puzzles_to_reset:
            # Partial reset - reset specific puzzles
            initial = KitchenPuzzleState.get_initial_state()
            for puzzle_name in puzzles_to_reset:
                if puzzle_name in state.puzzle_states:
                    state.puzzle_states[puzzle_name] = initial[puzzle_name]
            # Solo per partial reset serve flag_modified
            flag_modified(state, "puzzle_states")
        
        state.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(state)
        
        return KitchenPuzzleService.get_state_response(db, session_id)