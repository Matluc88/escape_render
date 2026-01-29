"""
Protected admin endpoints for critical operations
These endpoints require JWT authentication
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.admin_user import AdminUser
from app.core.security import get_current_admin
from app.services.session_service import SessionService
from app.services.puzzle_service import PuzzleService
from app.schemas.game_session import GameSessionResponse

router = APIRouter(prefix="/api/admin", tags=["Admin Protected"])


@router.get("/sessions", response_model=List[GameSessionResponse])
async def get_all_sessions(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get all sessions (admin only)
    Requires authentication
    """
    service = SessionService(db)
    return service.get_all()


@router.post("/sessions/{session_id}/end")
async def force_end_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Force end a specific session (admin only)
    Requires authentication
    """
    service = SessionService(db)
    session = service.get(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    service.end(session_id)
    
    return {
        "message": f"Sessione {session_id} terminata con successo",
        "ended_by": admin.username
    }


@router.post("/puzzles/reset-all")
async def reset_all_puzzles_admin(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Reset all puzzles for active session (admin only)
    Requires authentication
    """
    from app.api.puzzles import reset_all_puzzles
    
    result = await reset_all_puzzles(db)
    result["reset_by"] = admin.username
    
    return result


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Delete a session from database (admin only)
    Requires authentication
    """
    service = SessionService(db)
    session = service.get(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    service.delete(session_id)
    
    return {
        "message": f"Sessione {session_id} eliminata",
        "deleted_by": admin.username
    }


@router.get("/system/stats")
async def get_system_stats(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get system statistics (admin only)
    """
    from app.models.game_session import GameSession
    from app.models.element import Element
    from app.models.event import Event
    
    total_sessions = db.query(GameSession).count()
    active_sessions = db.query(GameSession).filter(GameSession.end_time.is_(None)).count()
    total_elements = db.query(Element).count()
    total_events = db.query(Event).count()
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "total_elements": total_elements,
        "total_events": total_events,
        "admin": admin.username
    }