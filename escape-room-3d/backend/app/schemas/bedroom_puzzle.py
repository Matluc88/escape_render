"""Pydantic schemas for Bedroom Puzzle State"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# Status types for puzzles
PuzzleStatus = Literal["locked", "active", "done"]
PortaStatus = Literal["locked", "unlocked"]
LEDColor = Literal["red", "green", "off", "blinking"]


class PuzzleStateDetail(BaseModel):
    """Detail of a single puzzle state"""
    status: PuzzleStatus
    completed_at: Optional[datetime] = None


class PortaStateDetail(BaseModel):
    """Detail of porta (door) state"""
    status: PortaStatus


class BedroomPuzzleStates(BaseModel):
    """Complete bedroom puzzle states"""
    comodino: PuzzleStateDetail
    materasso: PuzzleStateDetail
    poltrona: PuzzleStateDetail
    ventola: PuzzleStateDetail
    porta: PortaStateDetail


class LEDStates(BaseModel):
    """LED states for visual feedback"""
    porta: LEDColor
    materasso: LEDColor
    poltrona: LEDColor
    ventola: LEDColor


class BedroomPuzzleStateResponse(BaseModel):
    """Response schema for puzzle state"""
    session_id: int
    room_name: str = "camera"
    states: BedroomPuzzleStates
    led_states: LEDStates
    updated_at: datetime

    class Config:
        from_attributes = True


class PuzzleCompletionRequest(BaseModel):
    """Request to mark a puzzle as completed"""
    puzzle_name: Literal["comodino", "materasso", "poltrona", "ventola"]


class ResetPuzzlesRequest(BaseModel):
    """Request to reset puzzles"""
    level: Literal["full", "partial"] = "full"
    puzzles_to_reset: Optional[list[str]] = None  # For partial reset


class WebSocketPuzzleUpdate(BaseModel):
    """WebSocket broadcast message for puzzle state updates"""
    type: Literal["puzzle_state_update"] = "puzzle_state_update"
    session_id: int
    room: str = "camera"
    states: BedroomPuzzleStates
    led_states: LEDStates
