from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Puzzle(Base):
    __tablename__ = "puzzles"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    room = Column(String, nullable=False)  # esterno, cucina, soggiorno, bagno, camera
    puzzle_number = Column(Integer, nullable=False)  # 1, 2, 3 (esterno ha solo 1)
    puzzle_name = Column(String, nullable=True)  # nome/descrizione enigma
    solved = Column(Boolean, default=False)
    solved_by = Column(String, nullable=True)  # nickname del player che l'ha risolto
    solved_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("GameSession", back_populates="puzzles")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "room": self.room,
            "puzzle_number": self.puzzle_number,
            "puzzle_name": self.puzzle_name,
            "solved": self.solved,
            "solved_by": self.solved_by,
            "solved_at": self.solved_at.isoformat() if self.solved_at else None
        }
