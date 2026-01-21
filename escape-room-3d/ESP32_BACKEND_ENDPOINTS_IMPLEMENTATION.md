# 🔌 ESP32 Backend Endpoints - Guida Implementazione

**File da modificare**: `backend/app/api/kitchen_puzzles.py`

---

## 📡 ENDPOINT DA AGGIUNGERE

### 1. GET `/api/sessions/{session_id}/kitchen-puzzles/frigo/servo-state`

**Scopo**: ESP32 polling per verificare se deve chiudere il servo frigo  
**Chiamato da**: ESP32 ogni 1 secondo quando in stato FRIGO  
**Risposta**: `{"should_close_servo": true/false}`

#### Implementazione

```python
@router.get("/{session_id}/kitchen-puzzles/frigo/servo-state")
def get_frigo_servo_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Check if fridge servo should close.
    Returns true when user has confirmed fridge closure in frontend.
    """
    try:
        puzzle = KitchenPuzzleService.get_puzzle(db, session_id)
        
        # Servo should close when frigo puzzle is completed
        should_close = puzzle.states.get("frigo", {}).get("status") == "completed"
        
        return {
            "should_close_servo": should_close,
            "frigo_status": puzzle.states.get("frigo", {}).get("status", "locked")
        }
    
    except Exception as e:
        logger.error(f"Error getting frigo servo state for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Test con curl**:
```bash
curl http://localhost:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state
# Risposta: {"should_close_servo": false, "frigo_status": "active"}

# Dopo aver completato frigo:
curl http://localhost:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state
# Risposta: {"should_close_servo": true, "frigo_status": "completed"}
```

---

### 2. POST `/api/sessions/{session_id}/kitchen-puzzles/anta/toggle`

**Scopo**: Trigger animazione anta mobile nel frontend  
**Chiamato da**: ESP32 quando MAG1 cambia stato (aperto/chiuso)  
**Effetto**: WebSocket broadcast → Frontend anima anta 3D

#### Implementazione

```python
@router.post("/{session_id}/kitchen-puzzles/anta/toggle")
async def toggle_anta_mobile(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Trigger anta mobile animation (ESP32 MAG1 sensor).
    Broadcasts animation update via WebSocket to frontend.
    """
    try:
        # Verifica che session esista
        session = db.query(GameSession).filter(
            GameSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Broadcast WebSocket animation update
        await broadcast_message({
            "type": "animation_update",
            "session_id": session_id,
            "data": {
                "animation_type": "anta_toggle",
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        logger.info(f"Session {session_id}: Anta mobile toggle triggered")
        
        return {
            "status": "ok",
            "message": "Anta animation triggered"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling anta for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Test con curl**:
```bash
curl -X POST http://localhost:8001/api/sessions/999/kitchen-puzzles/anta/toggle
# Risposta: {"status": "ok", "message": "Anta animation triggered"}
```

---

### 3. POST `/api/sessions/{session_id}/kitchen-puzzles/serra/animation-trigger`

**Scopo**: Trigger animazione neon serra nel frontend  
**Chiamato da**: ESP32 quando microfono rileva battito  
**Effetto**: WebSocket broadcast → Frontend accende neon serra

#### Implementazione

```python
@router.post("/{session_id}/kitchen-puzzles/serra/animation-trigger")
async def trigger_serra_animation(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Trigger serra neon light animation (ESP32 microphone sensor).
    Broadcasts animation update via WebSocket to frontend.
    Called BEFORE completing serra puzzle to show visual feedback.
    """
    try:
        # Verifica che session esista
        session = db.query(GameSession).filter(
            GameSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Broadcast WebSocket animation update
        await broadcast_message({
            "type": "animation_update",
            "session_id": session_id,
            "data": {
                "animation_type": "serra_light",
                "state": "on",
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        logger.info(f"Session {session_id}: Serra neon animation triggered")
        
        return {
            "status": "ok",
            "message": "Serra neon animation triggered"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering serra animation for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Test con curl**:
```bash
curl -X POST http://localhost:8001/api/sessions/999/kitchen-puzzles/serra/animation-trigger
# Risposta: {"status": "ok", "message": "Serra neon animation triggered"}
```

---

## 🔄 FUNZIONE BROADCAST WEBSOCKET

Se non esiste già, aggiungi questa funzione helper:

```python
from app.websocket.handler import manager

async def broadcast_message(message: dict):
    """
    Broadcast message to all WebSocket connections.
    """
    try:
        await manager.broadcast(message)
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
```

**Nota**: Assicurati che il WebSocket manager supporti il broadcast. Se necessario, aggiungi in `backend/app/websocket/handler.py`:

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def broadcast(self, message: dict):
        """Send message to all active connections"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to connection: {e}")
```

---

## 📋 IMPORTS NECESSARI

Aggiungi in cima a `kitchen_puzzles.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database import get_db
from app.models.game_session import GameSession
from app.services.kitchen_puzzle_service import KitchenPuzzleService
from app.websocket.handler import manager

logger = logging.getLogger(__name__)
router = APIRouter()
```

---

## 🧪 TEST SEQUENZA COMPLETA

### 1. Test Frigo Servo State
```bash
# Prima: Frigo non completato
curl http://localhost:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state
# Output: {"should_close_servo": false, "frigo_status": "active"}

# Completa frigo dal frontend o con:
curl -X POST http://localhost:8001/api/sessions/999/kitchen-puzzles/frigo/complete

# Dopo: Frigo completato
curl http://localhost:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state
# Output: {"should_close_servo": true, "frigo_status": "completed"}
```

### 2. Test Anta Animation
```bash
# Trigger animazione anta
curl -X POST http://localhost:8001/api/sessions/999/kitchen-puzzles/anta/toggle

# Frontend dovrebbe ricevere via WebSocket:
# {
#   "type": "animation_update",
#   "session_id": 999,
#   "data": {
#     "animation_type": "anta_toggle",
#     "timestamp": "2026-01-08T12:00:00"
#   }
# }
```

### 3. Test Serra Animation
```bash
# Trigger animazione serra
curl -X POST http://localhost:8001/api/sessions/999/kitchen-puzzles/serra/animation-trigger

# Frontend dovrebbe ricevere via WebSocket:
# {
#   "type": "animation_update",
#   "session_id": 999,
#   "data": {
#     "animation_type": "serra_light",
#     "state": "on",
#     "timestamp": "2026-01-08T12:00:00"
#   }
# }
```

---

## 🔍 VERIFICA IMPLEMENTAZIONE

### Checklist Backend
- [ ] Endpoint `/frigo/servo-state` risponde con JSON corretto
- [ ] Endpoint `/anta/toggle` esiste e risponde 200
- [ ] Endpoint `/serra/animation-trigger` esiste e risponde 200
- [ ] WebSocket manager implementa `broadcast()`
- [ ] Logger configurato correttamente
- [ ] Test con curl tutti superati

### Checklist ESP32
- [ ] ESP32 chiama `/frigo/servo-state` ogni 1s quando in stato FRIGO
- [ ] ESP32 chiama `/anta/toggle` quando MAG1 cambia
- [ ] ESP32 chiama `/serra/animation-trigger` quando MIC rileva picco
- [ ] Serial Monitor mostra "✅ HTTP 200 OK" per tutte le chiamate

### Checklist Frontend
- [ ] WebSocket listener per `animation_update` implementato
- [ ] Animazione anta reagisce a `anta_toggle`
- [ ] Neon serra reagisce a `serra_light`
- [ ] Stati LED sincronizzati con backend

---

## 📚 FILE CORRELATI

- **Backend API**: `backend/app/api/kitchen_puzzles.py`
- **Service**: `backend/app/services/kitchen_puzzle_service.py`
- **WebSocket**: `backend/app/websocket/handler.py`
- **Frontend Hook**: `src/hooks/useKitchenPuzzle.js`
- **Frontend Scene**: `src/components/scenes/KitchenScene.jsx`

---

## 🚀 DEPLOYMENT

### Dev Environment
```bash
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml restart backend
```

### Production
```bash
cd escape-room-3d
docker-compose restart backend
```

### Verifica Logs
```bash
docker logs -f escape-room-3d-backend-1 | grep "kitchen"
```

---

## 💡 NOTE IMPLEMENTATIVE

### Perché GET per `/frigo/servo-state`?
- **ESP32 polling**: GET è più appropriato per operazioni di lettura ripetute
- **No side effects**: Non modifica stato, solo legge
- **Cache-friendly**: Può essere cachato se necessario

### Perché POST per `/anta/toggle` e `/serra/animation-trigger`?
- **Trigger actions**: Causano side effects (WebSocket broadcast)
- **Not idempotent**: Ogni chiamata invia un nuovo messaggio
- **RESTful semantics**: POST per azioni che modificano stato o triggherano eventi

### Sicurezza
- ✅ Tutti gli endpoint verificano esistenza session
- ✅ Error handling con try/except
- ✅ Logging per debug e audit
- ⚠️ **TODO**: Aggiungere autenticazione ESP32 (API key?)

---

**Endpoints production-ready! 🎯**
