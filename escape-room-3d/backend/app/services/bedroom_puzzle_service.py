"""Bedroom Puzzle Service - FSM and validation logic"""
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.bedroom_puzzle import BedroomPuzzleState
from app.models.game_session import GameSession
from app.schemas.bedroom_puzzle import (
    BedroomPuzzleStateResponse, 
    BedroomPuzzleStates,
    LEDStates,
    PuzzleStateDetail,
    PortaStateDetail
)


class BedroomPuzzleService:
    """
    Service for managing bedroom puzzle state machine.
    
    FSM Flow:
    START → materasso(active) → materasso(done) + poltrona(active) →
    poltrona(done) + ventola(active) → ventola(done) + porta(unlocked)
    
    Note: TASTO K prepara la sequenza ma non cambia stati LED
    """
    
    @staticmethod
    def _get_led_states(puzzle_states: Dict[str, Any]) -> LEDStates:
        """
        Convert puzzle states to LED colors.
        
        Rules:
        - locked → off (per comodino, poltrona, ventola)
        - locked → red (per materasso e porta - stati iniziali)
        - active → red
        - done → green
        - porta locked → red, unlocked → green
        """
        return LEDStates(
            porta="green" if puzzle_states["porta"]["status"] == "unlocked" else "red",
            materasso="green" if puzzle_states["materasso"]["status"] == "done" else 
                     "red" if puzzle_states["materasso"]["status"] == "active" else "red",  # Red anche se locked (stato iniziale)
            poltrona="green" if puzzle_states["poltrona"]["status"] == "done" else 
                    "red" if puzzle_states["poltrona"]["status"] == "active" else "off",
            ventola="green" if puzzle_states["ventola"]["status"] == "done" else 
                   "red" if puzzle_states["ventola"]["status"] == "active" else "off"
        )
    
    @staticmethod
    def _puzzle_states_to_schema(puzzle_states: Dict[str, Any]) -> BedroomPuzzleStates:
        """Convert raw dict to Pydantic schema"""
        return BedroomPuzzleStates(
            comodino=PuzzleStateDetail(**puzzle_states["comodino"]),
            materasso=PuzzleStateDetail(**puzzle_states["materasso"]),
            poltrona=PuzzleStateDetail(**puzzle_states["poltrona"]),
            ventola=PuzzleStateDetail(**puzzle_states["ventola"]),
            porta=PortaStateDetail(**puzzle_states["porta"])
        )
    
    @staticmethod
    def get_or_create_state(db: Session, session_id: int) -> BedroomPuzzleState:
        """
        Get existing puzzle state or create new one with initial state.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            BedroomPuzzleState instance
        """
        # Try to get existing state
        state = db.query(BedroomPuzzleState).filter(
            BedroomPuzzleState.session_id == session_id
        ).first()
        
        if state:
            return state
        
        # 🔒 VALIDATE: Check if session exists before creating state
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found. Cannot create bedroom puzzle state.")
        
        # Create new state with initial configuration
        state = BedroomPuzzleState(
            session_id=session_id,
            room_name="camera",
            puzzle_states=BedroomPuzzleState.get_initial_state()
        )
        db.add(state)
        db.commit()
        db.refresh(state)
        return state
    
    @staticmethod
    def get_state_response(db: Session, session_id: int) -> BedroomPuzzleStateResponse:
        """
        Get current puzzle state with LED colors.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            BedroomPuzzleStateResponse with current state
        """
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        return BedroomPuzzleStateResponse(
            session_id=state.session_id,
            room_name=state.room_name,
            states=BedroomPuzzleService._puzzle_states_to_schema(state.puzzle_states),
            led_states=BedroomPuzzleService._get_led_states(state.puzzle_states),
            updated_at=state.updated_at
        )
    
    @staticmethod
    def validate_comodino_complete(db: Session, session_id: int) -> Optional[BedroomPuzzleStateResponse]:
        """
        Mark comodino puzzle as completed (TASTO K).
        
        Note: Questo puzzle prepara la sequenza ma non sblocca nulla.
        È solo un marker per indicare che la sequenza comodino è stata eseguita.
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Atomic update - marca come done senza sbloccare altro
        state.puzzle_states["comodino"]["status"] = "done"
        state.puzzle_states["comodino"]["completed_at"] = datetime.utcnow().isoformat()
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BedroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_materasso_complete(db: Session, session_id: int) -> Optional[BedroomPuzzleStateResponse]:
        """
        Validate and complete materasso puzzle (TASTO M).
        
        Atomic operation:
        1. Check materasso is 'active'
        2. Mark materasso as 'done' (LED verde)
        3. Unlock poltrona (set to 'active', LED rosso)
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if materasso is active
        if state.puzzle_states["materasso"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["materasso"]["status"] = "done"
        state.puzzle_states["materasso"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["poltrona"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BedroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_poltrona_complete(db: Session, session_id: int) -> Optional[BedroomPuzzleStateResponse]:
        """
        Validate and complete poltrona puzzle (TASTO L).
        
        Atomic operation:
        1. Check poltrona is 'active'
        2. Mark poltrona as 'done' (LED verde)
        3. Unlock ventola (set to 'active', LED rosso)
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if poltrona is active
        if state.puzzle_states["poltrona"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["poltrona"]["status"] = "done"
        state.puzzle_states["poltrona"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["ventola"]["status"] = "active"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BedroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def validate_ventola_complete(db: Session, session_id: int) -> Optional[BedroomPuzzleStateResponse]:
        """
        Validate and complete ventola puzzle (TASTO J).
        
        Atomic operation:
        1. Check ventola is 'active'
        2. Mark ventola as 'done' (LED verde)
        3. Unlock porta (set to 'unlocked', LED verde) → VITTORIA!
        
        Args:
            db: Database session
            session_id: Game session ID
            
        Returns:
            Updated state if successful, None if invalid
        """
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        # Guard: Check if ventola is active
        if state.puzzle_states["ventola"]["status"] != "active":
            return None  # Ignore double trigger or wrong sequence
        
        # Atomic update
        state.puzzle_states["ventola"]["status"] = "done"
        state.puzzle_states["ventola"]["completed_at"] = datetime.utcnow().isoformat()
        state.puzzle_states["porta"]["status"] = "unlocked"
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        # 🆕 Notifica game completion che camera è completata
        from app.services.game_completion_service import GameCompletionService
        GameCompletionService.mark_room_completed(db, session_id, "camera")
        
        return BedroomPuzzleService.get_state_response(db, session_id)
    
    @staticmethod
    def reset_puzzles(db: Session, session_id: int, level: str = "full", puzzles_to_reset: Optional[list] = None) -> BedroomPuzzleStateResponse:
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
        state = BedroomPuzzleService.get_or_create_state(db, session_id)
        
        if level == "full":
            # Full reset - back to initial state
            state.puzzle_states = BedroomPuzzleState.get_initial_state()
            
            # 🆕 IMPORTANTE: Resetta ANCHE game_completion per questa stanza
            # Altrimenti c'è inconsistenza tra bedroom_puzzles e game_completion
            from app.services.game_completion_service import GameCompletionService
            GameCompletionService.unmark_room_completed(db, session_id, "camera")
            
        elif level == "partial" and puzzles_to_reset:
            # Partial reset - reset specific puzzles
            initial = BedroomPuzzleState.get_initial_state()
            for puzzle_name in puzzles_to_reset:
                if puzzle_name in state.puzzle_states:
                    state.puzzle_states[puzzle_name] = initial[puzzle_name]
        
        state.updated_at = datetime.utcnow()
        
        # Flag as modified for SQLAlchemy to detect JSONB changes
        flag_modified(state, "puzzle_states")
        
        db.commit()
        db.refresh(state)
        
        return BedroomPuzzleService.get_state_response(db, session_id)