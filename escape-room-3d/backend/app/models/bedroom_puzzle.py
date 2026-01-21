"""Bedroom Puzzle State Model"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class BedroomPuzzleState(Base):
    """
    Tracks the state of bedroom puzzles for each game session.
    
    Schema for puzzle_states JSONB:
    {
        "comodino": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "materasso": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "poltrona": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "ventola": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "porta": {"status": "locked" | "unlocked"}
    }
    """
    __tablename__ = "bedroom_puzzle_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    room_name = Column(String(50), nullable=False, default="camera")
    puzzle_states = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship
    session = relationship("GameSession", back_populates="bedroom_puzzle_state")
    
    @staticmethod
    def get_initial_state():
        """
        Returns the initial puzzle state for a new game session.
        
        State Machine:
        - TASTO K prepara la sequenza (comodino rimane locked inizialmente)
        - TASTO M (materasso) è il primo attivo
        - Progression: materasso → poltrona → ventola → porta
        
        LED States:
        - porta: red (locked)
        - materasso: red (active - primo puzzle)
        - poltrona: off (locked)
        - ventola: off (locked)
        """
        return {
            "comodino": {
                "status": "locked",
                "completed_at": None
            },
            "materasso": {
                "status": "active",
                "completed_at": None
            },
            "poltrona": {
                "status": "locked",
                "completed_at": None
            },
            "ventola": {
                "status": "locked",
                "completed_at": None
            },
            "porta": {
                "status": "locked"
            }
        }
