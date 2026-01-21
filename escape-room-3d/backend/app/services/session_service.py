from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.game_session import GameSession
from app.schemas.game_session import GameSessionCreate, GameSessionUpdate
import logging
import secrets
import string

logger = logging.getLogger(__name__)


class SessionService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[GameSession]:
        return self.db.query(GameSession).all()

    def get_by_id(self, session_id: int) -> Optional[GameSession]:
        return self.db.query(GameSession).filter(GameSession.id == session_id).first()

    def get_active(self) -> Optional[GameSession]:
        return self.db.query(GameSession).filter(GameSession.end_time == None).first()

    def get_active_by_room(self, room_id: int) -> Optional[GameSession]:
        return self.db.query(GameSession).filter(
            GameSession.room_id == room_id,
            GameSession.end_time == None
        ).first()

    def create(self, session_data: GameSessionCreate) -> GameSession:
        session = GameSession(**session_data.model_dump())
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        logger.info(f"Created game session: {session.id} for room {session.room_id}")
        return session

    def update(self, session_id: int, session_data: GameSessionUpdate) -> Optional[GameSession]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        
        update_data = session_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(session, field, value)
        
        self.db.commit()
        self.db.refresh(session)
        logger.info(f"Updated game session: {session.id}")
        return session

    def end_session(self, session_id: int) -> Optional[GameSession]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        
        session.end_time = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        logger.info(f"Ended game session: {session.id}")
        return session

    def increment_players(self, session_id: int) -> Optional[GameSession]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        
        session.connected_players += 1
        self.db.commit()
        self.db.refresh(session)
        return session

    def decrement_players(self, session_id: int) -> Optional[GameSession]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        
        if session.connected_players > 0:
            session.connected_players -= 1
            self.db.commit()
            self.db.refresh(session)
        return session

    def generate_unique_pin(self) -> str:
        """Genera un PIN univoco di 4 cifre usando secrets (crittograficamente sicuro)"""
        max_attempts = 100
        for _ in range(max_attempts):
            # Usa secrets.choice per ogni cifra - più sicuro e veramente random
            pin = ''.join(secrets.choice(string.digits) for _ in range(4))
            existing = self.db.query(GameSession).filter(GameSession.pin == pin).first()
            if not existing:
                return pin
        raise Exception("Unable to generate unique PIN after maximum attempts")

    def get_by_pin(self, pin: str) -> Optional[GameSession]:
        """Ottiene una sessione tramite PIN"""
        return self.db.query(GameSession).filter(GameSession.pin == pin).first()

    def validate_pin(self, pin: str) -> bool:
        """Verifica se un PIN è valido e la sessione è attiva - USA psycopg2 RAW per lettura fresh"""
        import psycopg2
        import os
        
        # RAW connection per lettura fresh dello status
        db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/escape_room')
        
        try:
            conn = psycopg2.connect(db_url)
            conn.set_session(autocommit=True)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT id, status, end_time FROM game_sessions WHERE pin = %s", 
                (pin,)
            )
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not result:
                return False
            
            session_id, status, end_time = result
            
            # Verifica che la sessione non sia terminata
            if end_time is not None:
                return False
            
            # Verifica che il gioco non sia già iniziato (solo status=waiting accetta nuovi player)
            if status != "waiting":
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating PIN with psycopg2: {e}")
            return False