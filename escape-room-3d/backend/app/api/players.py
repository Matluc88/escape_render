from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services.player_service import PlayerService
from app.services.room_distribution_service import RoomDistributionService
from pydantic import BaseModel


router = APIRouter(prefix="/players", tags=["players"])


class PlayerCreate(BaseModel):
    session_id: int
    nickname: str


class PlayerResponse(BaseModel):
    id: int
    session_id: int
    nickname: str
    current_room: str
    status: str
    connected_at: str = None
    socket_id: str = None


class RoomDistributionResponse(BaseModel):
    distribution: dict
    message: str


@router.get("/session/{session_id}", response_model=List[PlayerResponse])
def get_session_players(session_id: int, db: Session = Depends(get_db)):
    """Ottiene tutti i giocatori di una sessione"""
    service = PlayerService(db)
    players = service.get_players_by_session(session_id)
    return [PlayerResponse(**p.to_dict()) for p in players]


@router.get("/session/{session_id}/nicknames")
def get_session_nicknames(session_id: int, db: Session = Depends(get_db)):
    """Ottiene la lista dei nickname di tutti i giocatori"""
    service = PlayerService(db)
    nicknames = service.get_all_nicknames(session_id)
    return {"nicknames": nicknames, "count": len(nicknames)}


@router.get("/session/{session_id}/room/{room}", response_model=List[PlayerResponse])
def get_room_players(session_id: int, room: str, db: Session = Depends(get_db)):
    """Ottiene tutti i giocatori in una stanza specifica"""
    service = PlayerService(db)
    players = service.get_players_by_room(session_id, room)
    return [PlayerResponse(**p.to_dict()) for p in players]


@router.post("/session/{session_id}/distribute", response_model=RoomDistributionResponse)
def distribute_players_to_rooms(session_id: int, db: Session = Depends(get_db)):
    """Distribuisce i giocatori nelle 4 stanze dopo l'enigma dell'esterno"""
    service = RoomDistributionService(db)
    distribution = service.distribute_players(session_id)
    
    return RoomDistributionResponse(
        distribution=distribution,
        message=f"Giocatori distribuiti in {len(distribution)} stanze"
    )


@router.get("/session/{session_id}/distribution")
def get_current_distribution(session_id: int, db: Session = Depends(get_db)):
    """Ottiene la distribuzione corrente dei giocatori nelle stanze"""
    service = RoomDistributionService(db)
    distribution = service.get_current_distribution(session_id)
    return {"distribution": distribution}
