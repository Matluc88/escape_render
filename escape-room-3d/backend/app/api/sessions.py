from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.services.session_service import SessionService
from app.services.room_service import RoomService
from app.schemas.game_session import GameSessionCreate, GameSessionUpdate, GameSessionResponse
from app.models.game_session import GameSession

# Schema per accettare parametri opzionali nel body
class SimpleSessionCreate(BaseModel):
    room_id: Optional[int] = 1
    expected_players: Optional[int] = 1

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=List[GameSessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    service = SessionService(db)
    return service.get_all()


@router.get("/active", response_model=Optional[GameSessionResponse])
def get_active_session(db: Session = Depends(get_db)):
    service = SessionService(db)
    session = service.get_active()
    return session


@router.get("/{session_id}", response_model=GameSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    service = SessionService(db)
    session = service.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/start", response_model=GameSessionResponse, status_code=201)
def start_session(session_data: GameSessionCreate, db: Session = Depends(get_db)):
    room_service = RoomService(db)
    room = room_service.get_by_id(session_data.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    session_service = SessionService(db)
    existing = session_service.get_active_by_room(session_data.room_id)
    if existing:
        raise HTTPException(status_code=400, detail="An active session already exists for this room")
    
    # Crea sessione e genera PIN
    session = session_service.create(session_data)
    pin = session_service.generate_unique_pin()
    session.pin = pin
    db.commit()
    db.refresh(session)
    
    return session


@router.post("", response_model=GameSessionResponse, status_code=201)
@router.post("/", response_model=GameSessionResponse, status_code=201)
def create_simple_session(body: SimpleSessionCreate = SimpleSessionCreate(), db: Session = Depends(get_db)):
    """Crea nuova sessione senza room check - per sistema PIN"""
    session_service = SessionService(db)
    
    # 🆕 AUTO-TERMINA TUTTE le sessioni non terminate (waiting, countdown, playing)
    # Questo garantisce che solo l'ultimo PIN creato sia valido
    # e che i giocatori con sessioni vecchie vengano espulsi
    old_sessions = db.query(GameSession).filter(
        GameSession.end_time == None
    ).all()
    
    for old_session in old_sessions:
        session_service.end_session(old_session.id)
    
    # Usa room_id dal body o 1 di default
    session_data = GameSessionCreate(room_id=body.room_id, expected_players=body.expected_players)
    session = session_service.create(session_data)
    
    # Genera PIN univoco
    pin = session_service.generate_unique_pin()
    session.pin = pin
    db.commit()
    db.refresh(session)
    
    return session


@router.post("/validate-pin")
def validate_pin(pin: str, db: Session = Depends(get_db)):
    """Valida un PIN e restituisce la sessione se valida"""
    session_service = SessionService(db)
    
    if not session_service.validate_pin(pin):
        raise HTTPException(status_code=404, detail="PIN non valido o sessione scaduta")
    
    session = session_service.get_by_pin(pin)
    return {
        "valid": True,
        "sessionId": session.id,
        "pin": session.pin,
        "status": session.status
    }


@router.get("/by-pin/{pin}", response_model=GameSessionResponse)
def get_session_by_pin(pin: str, db: Session = Depends(get_db)):
    """Ottiene una sessione tramite PIN se valida"""
    session_service = SessionService(db)
    session = session_service.get_by_pin(pin)
    
    if not session:
        raise HTTPException(status_code=404, detail="PIN non valido")
    
    # Verifica se la sessione è terminata
    if session.end_time is not None:
        raise HTTPException(status_code=410, detail="Sessione terminata")
    
    # Verifica se il gioco è già iniziato (status != waiting)
    if session.status != "waiting":
        raise HTTPException(status_code=403, detail="Gioco già iniziato, troppo tardi!")
    
    return session


@router.post("/end", response_model=GameSessionResponse)
def end_session(db: Session = Depends(get_db)):
    service = SessionService(db)
    active_session = service.get_active()
    if not active_session:
        raise HTTPException(status_code=404, detail="No active session found")
    
    return service.end_session(active_session.id)


@router.post("/{session_id}/end", response_model=GameSessionResponse)
def end_specific_session(session_id: int, db: Session = Depends(get_db)):
    service = SessionService(db)
    session = service.end_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=GameSessionResponse)
def update_session(session_id: int, session_data: GameSessionUpdate, db: Session = Depends(get_db)):
    service = SessionService(db)
    session = service.update(session_id, session_data)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session