"""
Living Room Puzzle State Model

Tracks puzzle completion for Living Room (Soggiorno):
- TV (Tasto M)
- Pianta (Tasto G)
- Condizionatore (Click + porta chiusa)

Door LED is managed by game_completion system (global blinking logic)
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class LivingRoomPuzzleState(Base):
    __tablename__ = "livingroom_puzzle_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), unique=True, nullable=False, index=True)
    
    # Puzzle stati - FSM: locked → active → completed
    tv_status = Column(String, default="locked", nullable=False)          # Tasto M - TV accesa verde
    pianta_status = Column(String, default="locked", nullable=False)      # Tasto G - Pianta movimento
    condizionatore_status = Column(String, default="locked", nullable=False)  # Click - Condizionatore
    
    # 🚪 Servo control - Physical door on GPIO P32
    door_servo_should_close = Column(Boolean, default=False, nullable=False)  # ESP32 polling flag
    
    # 🌀 Fan control - Physical fan on GPIO P26
    fan_should_run = Column(Boolean, default=False, nullable=False)  # ESP32 polling flag
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship
    session = relationship("GameSession", back_populates="livingroom_puzzle")
    
    def __repr__(self):
        return (
            f"<LivingRoomPuzzleState("
            f"session_id={self.session_id}, "
            f"tv={self.tv_status}, "
            f"pianta={self.pianta_status}, "
            f"condizionatore={self.condizionatore_status}, "
            f"door_servo={self.door_servo_should_close}, "
            f"fan={self.fan_should_run}"
            f")>"
        )