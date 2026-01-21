"""Gate Puzzle Model - Esterno (cancello d'ingresso)"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class GatePuzzle(Base):
    """
    Modello per il puzzle dell'esterno/cancello.
    
    L'esterno ha 1 enigma principale:
    - Fotocellula libera → cancelli/porta si aprono
    
    Quando photocell_clear=True, l'enigma è risolto.
    """
    __tablename__ = "gate_puzzles"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False, unique=True)
    
    # ===== STATO FOTOCELLULA =====
    photocell_clear = Column(Boolean, default=False, nullable=False)
    # True = LIBERA (HIGH), False = OCCUPATA (LOW)
    
    # ===== STATO ANIMAZIONI =====
    gates_open = Column(Boolean, default=False, nullable=False)
    # True = cancelli aperti, False = cancelli chiusi
    
    door_open = Column(Boolean, default=False, nullable=False)
    # True = porta ingresso aperta, False = porta chiusa
    
    roof_open = Column(Boolean, default=False, nullable=False)
    # True = tetto serra aperto, False = tetto chiuso
    
    # ===== LED STATO =====
    led_status = Column(String, default="red", nullable=False)
    # "red" = occupato, "green" = libero
    
    # ===== RGB STRIP (festa) =====
    rgb_strip_on = Column(Boolean, default=False, nullable=False)
    # True solo se ALL 4 stanze completate (game_won=True)
    
    # ===== TIMESTAMPS =====
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # Timestamp quando fotocellula diventa libera per prima volta

    def __repr__(self):
        return f"<GatePuzzle(session_id={self.session_id}, photocell_clear={self.photocell_clear}, gates_open={self.gates_open})>"
