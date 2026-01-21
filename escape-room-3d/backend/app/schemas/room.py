from pydantic import BaseModel
from typing import Optional, Dict, Any


class Position3D(BaseModel):
    """3D Position coordinates"""
    x: float
    y: float
    z: float


class SpawnData(BaseModel):
    """Spawn position and rotation data"""
    position: Position3D
    yaw: float  # Rotation in radians


class RoomBase(BaseModel):
    name: str
    description: Optional[str] = None
    spawn_data: Optional[Dict[str, Any]] = None  # JSON field


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    spawn_data: Optional[Dict[str, Any]] = None


class RoomResponse(RoomBase):
    id: int

    class Config:
        from_attributes = True


class SpawnDataUpdate(BaseModel):
    """Schema for updating spawn data"""
    position: Position3D
    yaw: float


class SpawnDataResponse(BaseModel):
    """Schema for spawn data response"""
    position: Position3D
    yaw: float
