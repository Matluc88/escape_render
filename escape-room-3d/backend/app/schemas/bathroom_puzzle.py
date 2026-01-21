"""Bathroom Puzzle State Schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PuzzleStateDetail(BaseModel):
    """Detail of a single puzzle state"""
    status: str  # "locked" | "active" | "done"
    completed_at: Optional[str] = None


class BathroomPuzzleStates(BaseModel):
    """All bathroom puzzle states"""
    specchio: PuzzleStateDetail
    doccia: PuzzleStateDetail
    ventola: PuzzleStateDetail


class LEDStates(BaseModel):
    """LED colors for bathroom puzzles
    
    Rules:
    - locked → off (per doccia e ventola)
    - locked → red (per specchio - stato iniziale active)
    - active → red
    - done → green
    - specchio_white → on when specchio done (LED bianco P33)
    """
    specchio: str  # "red" | "green"
    specchio_white: str  # "off" | "on" - LED bianco P33
    porta_finestra: str  # "off" | "red" | "green"
    ventola: str  # "off" | "red" | "green"


class BathroomPuzzleStateResponse(BaseModel):
    """Response schema for bathroom puzzle state"""
    session_id: int
    room_name: str
    states: BathroomPuzzleStates
    led_states: LEDStates
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CompletePuzzleRequest(BaseModel):
    """Request to complete a puzzle"""
    puzzle_name: str  # "specchio" | "doccia" | "ventola"


class ResetPuzzlesRequest(BaseModel):
    """Request to reset puzzles"""
    level: str = "full"  # "full" | "partial"
    puzzles_to_reset: Optional[list[str]] = None