"""
Pydantic schemas for Living Room Puzzle API validation
"""

from pydantic import BaseModel
from typing import Dict


class PuzzleState(BaseModel):
    """Individual puzzle state"""
    status: str  # locked | active | completed


class LivingRoomPuzzleStateResponse(BaseModel):
    """Response model for puzzle state"""
    session_id: int
    states: Dict[str, PuzzleState]  # tv, pianta, condizionatore
    led_states: Dict[str, str]  # pianta, condizionatore → off/red/green
    
    class Config:
        from_attributes = True


class ResetRequest(BaseModel):
    """Request model for reset endpoint"""
    level: str = "full"  # full | partial
