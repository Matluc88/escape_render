from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.room_service import RoomService
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse, SpawnDataUpdate, SpawnDataResponse

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=List[RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    service = RoomService(db)
    return service.get_all()


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db)):
    service = RoomService(db)
    room = service.get_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("", response_model=RoomResponse, status_code=201)
def create_room(room_data: RoomCreate, db: Session = Depends(get_db)):
    service = RoomService(db)
    existing = service.get_by_name(room_data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Room with this name already exists")
    return service.create(room_data)


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, room_data: RoomUpdate, db: Session = Depends(get_db)):
    service = RoomService(db)
    room = service.update(room_id, room_data)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    service = RoomService(db)
    if not service.delete(room_id):
        raise HTTPException(status_code=404, detail="Room not found")


# Mapping nomi italiani → inglesi (per compatibilità con frontend)
ROOM_NAME_MAPPING = {
    "camera": "bedroom",
    "cucina": "kitchen",
    "bagno": "bathroom",
    "soggiorno": "livingroom",
    "esterno": "gate",  # o "greenhouse" se necessario
}

@router.get("/{room_name}/spawn", response_model=SpawnDataResponse)
def get_room_spawn(room_name: str, db: Session = Depends(get_db)):
    """Get spawn position and rotation for a specific room by name"""
    # Traduci nome italiano → inglese se necessario
    mapped_name = ROOM_NAME_MAPPING.get(room_name.lower(), room_name)
    
    service = RoomService(db)
    room = service.get_by_name(mapped_name)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_name}' not found")
    
    if not room.spawn_data:
        raise HTTPException(status_code=404, detail=f"No spawn data configured for room '{room_name}'")
    
    # Parse JSON spawn_data to SpawnDataResponse
    try:
        return SpawnDataResponse(
            position=room.spawn_data["position"],
            yaw=room.spawn_data["yaw"]
        )
    except (KeyError, TypeError) as e:
        raise HTTPException(status_code=500, detail=f"Invalid spawn data format: {str(e)}")


@router.post("/{room_name}/spawn", response_model=SpawnDataResponse)
def update_room_spawn(room_name: str, spawn_data: SpawnDataUpdate, db: Session = Depends(get_db)):
    """Update spawn position and rotation for a specific room by name"""
    # Traduci nome italiano → inglese se necessario
    mapped_name = ROOM_NAME_MAPPING.get(room_name.lower(), room_name)
    
    service = RoomService(db)
    room = service.get_by_name(mapped_name)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_name}' not found")
    
    # Convert Pydantic model to dict for JSON storage
    spawn_dict = {
        "position": {
            "x": spawn_data.position.x,
            "y": spawn_data.position.y,
            "z": spawn_data.position.z
        },
        "yaw": spawn_data.yaw
    }
    
    # Update room with new spawn_data
    room.spawn_data = spawn_dict
    db.commit()
    db.refresh(room)
    
    return SpawnDataResponse(
        position=spawn_data.position,
        yaw=spawn_data.yaw
    )
