from sqlalchemy import Column, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    spawn_data = Column(JSON, nullable=True, comment="Spawn position and rotation: {position: {x, y, z}, yaw: float}")

    elements = relationship("Element", back_populates="room", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="room", cascade="all, delete-orphan")
