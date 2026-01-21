"""Gate Puzzle Schemas - Esterno"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GatePuzzleBase(BaseModel):
    """Base schema for Gate Puzzle"""
    photocell_clear: bool = False
    gates_open: bool = False
    door_open: bool = False
    roof_open: bool = False
    led_status: str = "red"
    rgb_strip_on: bool = False


class GatePuzzleCreate(GatePuzzleBase):
    """Schema for creating a new Gate Puzzle"""
    session_id: int


class GatePuzzleUpdate(BaseModel):
    """Schema for updating Gate Puzzle state"""
    photocell_clear: Optional[bool] = None
    gates_open: Optional[bool] = None
    door_open: Optional[bool] = None
    roof_open: Optional[bool] = None
    led_status: Optional[str] = None
    rgb_strip_on: Optional[bool] = None


class GatePuzzleResponse(GatePuzzleBase):
    """Schema for Gate Puzzle response"""
    id: int
    session_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GatePuzzleStateResponse(BaseModel):
    """Simplified state response for ESP32/Frontend"""
    session_id: int
    photocell_clear: bool
    gates_open: bool
    door_open: bool
    roof_open: bool
    led_status: str
    rgb_strip_on: bool
    completed: bool  # True se fotocellula è stata libera almeno una volta
    updated_at: datetime


class GatePuzzleESP32Response(BaseModel):
    """Minimal response for ESP32 polling"""
    rgb_strip_on: bool
    led_status: str
    all_rooms_complete: bool
