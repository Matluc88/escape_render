"""Game Completion Schemas - Pydantic models for API responses"""
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime


class RoomStatusDetail(BaseModel):
    """Status of a single room"""
    completed: bool
    completion_time: Optional[str] = None  # ISO format datetime string


class DoorLEDStates(BaseModel):
    """LED states for all 4 door LEDs"""
    cucina: str  # "red" | "blinking" | "green"
    camera: str
    bagno: str
    soggiorno: str


class GameCompletionResponse(BaseModel):
    """Full game completion state response"""
    session_id: int
    rooms_status: Dict[str, RoomStatusDetail]
    door_led_states: DoorLEDStates
    game_won: bool
    victory_time: Optional[datetime] = None
    completed_rooms_count: int
    updated_at: datetime
    
    class Config:
        from_attributes = True  # For SQLAlchemy model compatibility


class GameCompletionStateUpdate(BaseModel):
    """Schema for game completion updates broadcast via WebSocket"""
    type: str = "game_completion_update"
    session_id: int
    door_led_states: DoorLEDStates
    game_won: bool
    completed_rooms_count: int
    victory_time: Optional[datetime] = None
