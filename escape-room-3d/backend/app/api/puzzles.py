from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services.puzzle_service import PuzzleService
from pydantic import BaseModel


router = APIRouter(prefix="/api/puzzles", tags=["puzzles"])


class PuzzleResponse(BaseModel):
    id: int
    session_id: int
    room: str
    puzzle_number: int
    puzzle_name: str = None
    solved: bool
    solved_by: str = None
    solved_at: str = None


class PuzzleSolveRequest(BaseModel):
    solved_by: str


class RoomProgressResponse(BaseModel):
    room: str
    total: int
    solved: int
    percentage: float
    puzzles: List[dict]


class SessionProgressResponse(BaseModel):
    total_puzzles: int
    solved_puzzles: int
    percentage: float
    all_solved: bool


@router.post("/session/{session_id}/initialize")
def initialize_puzzles(session_id: int, db: Session = Depends(get_db)):
    """Inizializza tutti gli enigmi per una sessione (13 totali)"""
    service = PuzzleService(db)
    puzzles = service.initialize_puzzles_for_session(session_id)
    return {
        "message": "Enigmi inizializzati con successo",
        "total": len(puzzles),
        "puzzles": [p.to_dict() for p in puzzles]
    }


@router.post("/session/{session_id}/reset")
def reset_puzzles(session_id: int, db: Session = Depends(get_db)):
    """Resetta tutti gli enigmi di una sessione (soft reset)
    Imposta solved=False per tutti gli enigmi senza eliminarli.
    """
    service = PuzzleService(db)
    
    # Verifica se esistono enigmi per questa sessione
    puzzles = service.get_puzzles_by_session(session_id)
    if not puzzles:
        raise HTTPException(status_code=404, detail="Nessun enigma trovato per questa sessione")
    
    # Resetta gli enigmi
    reset_count = service.reset_puzzles_for_session(session_id)
    
    # Ottieni il progresso aggiornato
    progress = service.get_session_progress(session_id)
    
    return {
        "message": f"Reset completato! {reset_count} enigmi resettati.",
        "reset_count": reset_count,
        "total_puzzles": len(puzzles),
        "progress": progress
    }


@router.get("/session/{session_id}", response_model=List[PuzzleResponse])
def get_session_puzzles(session_id: int, db: Session = Depends(get_db)):
    """Ottiene tutti gli enigmi di una sessione"""
    service = PuzzleService(db)
    puzzles = service.get_puzzles_by_session(session_id)
    return [PuzzleResponse(**p.to_dict()) for p in puzzles]


@router.get("/session/{session_id}/room/{room}", response_model=List[PuzzleResponse])
def get_room_puzzles(session_id: int, room: str, db: Session = Depends(get_db)):
    """Ottiene tutti gli enigmi di una stanza"""
    service = PuzzleService(db)
    puzzles = service.get_puzzles_by_room(session_id, room)
    return [PuzzleResponse(**p.to_dict()) for p in puzzles]


@router.post("/session/{session_id}/room/{room}/puzzle/{puzzle_number}/solve")
def solve_puzzle(
    session_id: int, 
    room: str, 
    puzzle_number: int,
    request: PuzzleSolveRequest,
    db: Session = Depends(get_db)
):
    """Segna un enigma come risolto"""
    service = PuzzleService(db)
    
    # Verifica se l'enigma esiste
    puzzle = service.get_puzzle(session_id, room, puzzle_number)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Enigma non trovato")
    
    # Verifica se è già stato risolto
    if puzzle.solved:
        return {
            "message": "Questo enigma è già stato risolto",
            "puzzle": puzzle.to_dict(),
            "already_solved": True
        }
    
    # Risolvi l'enigma
    solved_puzzle = service.solve_puzzle(session_id, room, puzzle_number, request.solved_by)
    
    # Verifica condizione di vittoria
    victory = service.check_victory_condition(session_id)
    
    return {
        "message": f"Enigma risolto da {request.solved_by}!",
        "puzzle": solved_puzzle.to_dict(),
        "victory": victory,
        "already_solved": False
    }


@router.get("/session/{session_id}/room/{room}/progress", response_model=RoomProgressResponse)
def get_room_progress(session_id: int, room: str, db: Session = Depends(get_db)):
    """Ottiene il progresso degli enigmi in una stanza"""
    service = PuzzleService(db)
    progress = service.get_room_progress(session_id, room)
    return RoomProgressResponse(**progress)


@router.get("/session/{session_id}/progress", response_model=SessionProgressResponse)
def get_session_progress(session_id: int, db: Session = Depends(get_db)):
    """Ottiene il progresso totale della sessione"""
    service = PuzzleService(db)
    progress = service.get_session_progress(session_id)
    return SessionProgressResponse(**progress)


@router.get("/session/{session_id}/victory")
def check_victory(session_id: int, db: Session = Depends(get_db)):
    """Verifica se tutti gli enigmi sono stati risolti"""
    service = PuzzleService(db)
    victory = service.check_victory_condition(session_id)
    progress = service.get_session_progress(session_id)
    
    return {
        "victory": victory,
        "progress": progress
    }


@router.get("/session/{session_id}/room/{room}/next")
def get_next_puzzle(session_id: int, room: str, db: Session = Depends(get_db)):
    """Ottiene il prossimo enigma non risolto in una stanza"""
    service = PuzzleService(db)
    next_puzzle = service.get_next_puzzle(session_id, room)
    
    if not next_puzzle:
        return {
            "message": "Tutti gli enigmi di questa stanza sono stati risolti!",
            "completed": True,
            "puzzle": None
        }
    
    return {
        "message": f"Prossimo enigma: {next_puzzle.puzzle_name}",
        "completed": False,
        "puzzle": next_puzzle.to_dict()
    }