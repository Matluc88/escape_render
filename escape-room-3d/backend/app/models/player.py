from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    nickname = Column(String, nullable=False)
    current_room = Column(String, default="lobby")  # lobby, esterno, cucina, soggiorno, bagno, camera
    status = Column(String, default="waiting")  # waiting, playing, finished
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    socket_id = Column(String, nullable=True)

    session = relationship("GameSession", back_populates="players")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "nickname": self.nickname,
            "current_room": self.current_room,
            "status": self.status,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "socket_id": self.socket_id
        }
