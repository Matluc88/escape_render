"""Bathroom Puzzle State Model"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class BathroomPuzzleState(Base):
    """
    Tracks the state of bathroom puzzles for each game session.
    
    Schema for puzzle_states JSONB:
    {
        "specchio": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "doccia": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null},
        "ventola": {"status": "locked" | "active" | "done", "completed_at": "ISO timestamp" | null}
    }
    
    FSM Flow:
    specchio (active) → doccia (locked) → ventola (locked)
    ↓
    specchio (done) → doccia (active) → ventola (locked)
    ↓
    specchio (done) → doccia (done) → ventola (active)
    ↓
    specchio (done) → doccia (done) → ventola (done) → ROOM COMPLETED
    
    Hardware Control (ESP32):
    - door_servo_should_open: Si apre quando game_won = True (vittoria globale)
    - window_servo_should_close: Si chiude quando ventola = done (apertura finestra)
    - fan_should_run: Ventola fisica si attiva quando ventola = done
    """
    __tablename__ = "bathroom_puzzle_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    room_name = Column(String(50), nullable=False, default="bagno")
    puzzle_states = Column(JSONB, nullable=False)
    
    # 🔧 Hardware control flags (ESP32 polling)
    door_servo_should_open = Column(Boolean, nullable=False, default=False)      # Porta bagno si apre alla vittoria
    window_servo_should_close = Column(Boolean, nullable=False, default=False)   # Finestra si chiude quando ventola done
    fan_should_run = Column(Boolean, nullable=False, default=False)              # Ventola fisica si attiva quando ventola done
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship
    session = relationship("GameSession", back_populates="bathroom_puzzle_state")
    
    @staticmethod
    def get_initial_state():
        """
        Returns the initial puzzle state for a new game session.
        
        State Machine:
        - Specchio è il primo attivo (countdown luci)
        - Doccia bloccato (chiusura anta per spazio)
        - Ventola bloccato (chiusura porta-finestra per umidità)
        
        LED States:
        - specchio: red (active - primo puzzle)
        - doccia: off (locked)
        - ventola: off (locked)
        
        Hardware State:
        - door_servo_should_open: False (porta chiusa inizialmente)
        - window_servo_should_close: False (finestra aperta inizialmente)
        - fan_should_run: False (ventola spenta inizialmente)
        """
        return {
            "specchio": {
                "status": "active",
                "completed_at": None
            },
            "doccia": {
                "status": "locked",
                "completed_at": None
            },
            "ventola": {
                "status": "locked",
                "completed_at": None
            }
        }