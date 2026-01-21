"""Game Completion State Model - Tracks global game progress across all rooms"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class GameCompletionState(Base):
    """
    Tracks overall game completion status for a session.
    
    Monitors all 4 rooms (cucina, camera, bagno, soggiorno)
    and determines when the game is won.
    """
    __tablename__ = "game_completion_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), unique=True, nullable=False)
    
    # JSONB structure:
    # {
    #   "cucina": {"completed": true, "completion_time": "2025-12-29T00:00:00"},
    #   "camera": {"completed": false},
    #   "bagno": {"completed": false},
    #   "soggiorno": {"completed": false}
    # }
    rooms_status = Column(JSONB, nullable=False)
    
    # Game won flag (all 4 rooms completed)
    game_won = Column(Boolean, default=False, nullable=False)
    
    # Victory timestamp (when all 4 rooms were completed)
    victory_time = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship back to GameSession
    session = relationship("GameSession", back_populates="game_completion")
    
    @staticmethod
    def get_initial_state():
        """
        Initial state: all rooms incomplete
        """
        return {
            "cucina": {"completed": False},
            "camera": {"completed": False},
            "bagno": {"completed": False},
            "soggiorno": {"completed": False}
        }
    
    def is_game_complete(self) -> bool:
        """Check if all 4 rooms are completed"""
        return all(
            room_status.get("completed", False)
            for room_status in self.rooms_status.values()
        )
    
    def get_completed_rooms_count(self) -> int:
        """Count how many rooms are completed"""
        return sum(
            1 for room_status in self.rooms_status.values()
            if room_status.get("completed", False)
        )
