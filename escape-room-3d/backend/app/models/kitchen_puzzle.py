"""Kitchen Puzzle State Model"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class KitchenPuzzleState(Base):
    """
    Tracks the state of kitchen puzzles for each game session.
    
    Schema for puzzle_states JSONB:
    {
        "fornelli": {"status": "active" | "locked" | "done", "completed_at": "ISO timestamp" | null},
        "frigo": {"status": "active" | "locked" | "done", "completed_at": "ISO timestamp" | null},
        "serra": {"status": "active" | "locked" | "done", "completed_at": "ISO timestamp" | null},
        "porta": {"status": "locked" | "unlocked"},
        "strip_led": {"is_on": bool}  # Sincronizzato con stato serra
    }
    """
    __tablename__ = "kitchen_puzzle_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    room_name = Column(String(50), nullable=False, default="cucina")
    puzzle_states = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship
    session = relationship("GameSession", back_populates="kitchen_puzzle_state")
    
    @staticmethod
    def get_initial_state():
        """
        Returns the initial puzzle state for a new game session.
        
        State Machine:
        - fornelli starts as 'active' (first puzzle available)
        - All others start as 'locked'
        - Progression: fornelli → frigo → serra → porta
        """
        return {
            "fornelli": {
                "status": "active",
                "completed_at": None
            },
            "frigo": {
                "status": "locked",
                "completed_at": None
            },
            "serra": {
                "status": "locked",
                "completed_at": None
            },
            "porta": {
                "status": "locked"
            },
            "strip_led": {
                "is_on": False
            }
        }
