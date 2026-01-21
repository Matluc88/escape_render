from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    pin = Column(String(4), unique=True, index=True, nullable=True)  # PIN 4 cifre per join
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    expected_players = Column(Integer, default=1)
    connected_players = Column(Integer, default=0)
    status = Column(String, default="waiting")  # waiting, countdown, playing, completed

    room = relationship("Room", back_populates="game_sessions")
    events = relationship("Event", back_populates="session", cascade="all, delete-orphan")
    players = relationship("Player", back_populates="session", cascade="all, delete-orphan")
    puzzles = relationship("Puzzle", back_populates="session", cascade="all, delete-orphan")
    kitchen_puzzle_state = relationship("KitchenPuzzleState", back_populates="session", uselist=False, cascade="all, delete-orphan")
    bedroom_puzzle_state = relationship("BedroomPuzzleState", back_populates="session", uselist=False, cascade="all, delete-orphan")
    bathroom_puzzle_state = relationship("BathroomPuzzleState", back_populates="session", uselist=False, cascade="all, delete-orphan")
    livingroom_puzzle = relationship("LivingRoomPuzzleState", back_populates="session", uselist=False, cascade="all, delete-orphan")
    game_completion = relationship("GameCompletionState", back_populates="session", uselist=False, cascade="all, delete-orphan")
