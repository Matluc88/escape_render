# 🏆 GAME COMPLETION SYSTEM - Guida Completa

## 📋 OVERVIEW

Sistema centralizzato per tracciare il completamento di tutte le 4 stanze e determinare la vittoria del gioco.

### **Comportamento LED Porta:**
```
🔴 ROSSO: Stanza non completata
🟢 LAMPEGGIANTE: Stanza completata, ma gioco non vinto
✅ VERDE FISSO: Tutte le stanze completate (VITTORIA!)
```

---

## ✅ COMPONENTI GIÀ IMPLEMENTATI

### **Backend**

#### 1. Model: `backend/app/models/game_completion.py`
```python
class GameCompletionState(Base):
    session_id: int
    rooms_status: JSONB  # {cucina: {completed, completion_time}, ...}
    game_won: bool
    victory_time: datetime
```

#### 2. Service: `backend/app/services/game_completion_service.py`
```python
class GameCompletionService:
    # Metodi chiave:
    - mark_room_completed(db, session_id, room_name)
    - get_door_led_states(db, session_id) → {cucina: "red"|"blinking"|"green", ...}
    - check_and_update_all_rooms(db, session_id)
    - reset_game_completion(db, session_id)
```

#### 3. Schema: `backend/app/schemas/game_completion.py`
```python
class GameCompletionResponse:
    session_id, rooms_status, door_led_states, game_won, victory_time
    
class GameCompletionStateUpdate:  # Per WebSocket
    type: "game_completion_update"
    door_led_states, game_won, completed_rooms_count
```

#### 4. API: `backend/app/api/game_completion.py`
```
GET  /api/sessions/{id}/game-completion/state
POST /api/sessions/{id}/game-completion/sync
POST /api/sessions/{id}/game-completion/reset
```

#### 5. Migration: `backend/alembic/versions/008_add_game_completion.py`
```sql
CREATE TABLE game_completion_states (
    id, session_id, rooms_status JSONB, game_won BOOL, victory_time
)
```

---

## 🔧 PASSI RIMANENTI - BACKEND

### **STEP 1: Update GameSession Model**

**File:** `backend/app/models/game_session.py`

Aggiungere relationship:
```python
from sqlalchemy.orm import relationship

class GameSession(Base):
    # ... existing fields ...
    
    # 🆕 ADD:
    game_completion = relationship("GameCompletionState", back_populates="session", uselist=False)
```

---

### **STEP 2: Update Models __init__.py**

**File:** `backend/app/models/__init__.py`

```python
from app.models.game_completion import GameCompletionState  # 🆕 ADD

__all__ = [
    "GameSession",
    "KitchenPuzzleState",
    "BedroomPuzzleState",
    "GameCompletionState",  # 🆕 ADD
    # ... altri modelli ...
]
```

---

### **STEP 3: Modificare Kitchen Puzzle Service**

**File:** `backend/app/services/kitchen_puzzle_service.py`

**Modificare metodo `validate_serra_activated`:**

```python
@staticmethod
def validate_serra_activated(db: Session, session_id: int):
    state = KitchenPuzzleService.get_or_create_state(db, session_id)
    
    if state.puzzle_states["serra"]["status"] != "active":
        return None
    
    # Atomic update
    state.puzzle_states["serra"]["status"] = "done"
    state.puzzle_states["serra"]["completed_at"] = datetime.utcnow().isoformat()
    state.puzzle_states["porta"]["status"] = "unlocked"
    state.updated_at = datetime.utcnow()
    
    flag_modified(state, "puzzle_states")
    db.commit()
    db.refresh(state)
    
    # 🆕 NUOVO: Notifica game completion che cucina è completata
    from app.services.game_completion_service import GameCompletionService
    GameCompletionService.mark_room_completed(db, session_id, "cucina")
    
    return KitchenPuzzleService.get_state_response(db, session_id)
```

---

### **STEP 4: Modificare Bedroom Puzzle Service**

**File:** `backend/app/services/bedroom_puzzle_service.py`

**Modificare metodo `complete_ventola`:**

```python
@staticmethod
def complete_ventola(db: Session, session_id: int):
    state = BedroomPuzzleService.get_or_create_state(db, session_id)
    
    if state.puzzle_states["ventola"]["status"] != "active":
        return None
    
    # Atomic update
    state.puzzle_states["ventola"]["status"] = "done"
    state.puzzle_states["ventola"]["completed_at"] = datetime.utcnow().isoformat()
    state.puzzle_states["porta"]["status"] = "unlocked"
    state.updated_at = datetime.utcnow()
    
    flag_modified(state, "puzzle_states")
    db.commit()
    db.refresh(state)
    
    # 🆕 NUOVO: Notifica game completion che camera è completata
    from app.services.game_completion_service import GameCompletionService
    GameCompletionService.mark_room_completed(db, session_id, "camera")
    
    return BedroomPuzzleService.get_state_response(db, session_id)
```

---

### **STEP 5: Update WebSocket Handler**

**File:** `backend/app/websocket/handler.py`

**Aggiungere funzione broadcast:**

```python
async def broadcast_game_completion_update(session_id: int, db: Session):
    """
    Broadcast game completion state to all clients in session
    """
    from app.services.game_completion_service import GameCompletionService
    from app.schemas.game_completion import GameCompletionStateUpdate, DoorLEDStates
    
    # Get current state
    state = GameCompletionService.get_or_create_state(db, session_id)
    door_led_states = GameCompletionService.get_door_led_states(db, session_id)
    
    # Create update message
    update = GameCompletionStateUpdate(
        session_id=session_id,
        door_led_states=DoorLEDStates(**door_led_states),
        game_won=state.game_won,
        completed_rooms_count=state.get_completed_rooms_count(),
        victory_time=state.victory_time
    )
    
    # Broadcast to all clients
    await broadcast_to_session(session_id, update.dict())
```

**Chiamare in kitchen/bedroom puzzle services dopo `mark_room_completed`:**

```python
# Dopo mark_room_completed:
await broadcast_game_completion_update(session_id, db)
```

---

### **STEP 6: Update main.py**

**File:** `backend/app/main.py`

```python
from app.api import game_completion  # 🆕 ADD

# Nel setup delle routes:
app.include_router(game_completion.router, prefix="/api", tags=["game-completion"])  # 🆕 ADD
```

---

### **STEP 7: Run Migration**

```bash
# Docker:
docker exec -it escape-backend alembic upgrade head

# Locale:
cd backend && alembic upgrade head
```

---

## 🎨 PASSI RIMANENTI - FRONTEND

### **STEP 8: Modificare PuzzleLED.jsx (Supporto Blinking)**

**File:** `src/components/3D/PuzzleLED.jsx`

```javascript
import { useFrame } from '@react-three/fiber'
import { useState, useRef } from 'react'

export function PuzzleLED({ ledUuid, state }) {
  const { scene } = useThree()
  const ledRef = useRef(null)
  const [blinkPhase, setBlinkPhase] = useState(0)
  
  // ... existing code ...
  
  // 🆕 NUOVO: Gestione blinking
  useFrame((_, delta) => {
    if (!ledRef.current || state !== 'blinking') return
    
    const material = ledRef.current.material
    
    // Update blink phase
    setBlinkPhase(prev => (prev + delta * 2) % (Math.PI * 2))
    
    // Smooth sine wave intensity (0.5 → 3.5)
    const intensity = 2 + Math.sin(blinkPhase) * 1.5
    material.emissiveIntensity = intensity
    material.needsUpdate = true
  })
  
  useEffect(() => {
    if (!ledRef.current) return
    
    const led = ledRef.current
    const material = led.material
    
    switch(state) {
      case 'red':
        material.emissive.set(0xff0000)
        material.emissiveIntensity = 2.0
        material.color.set(0xff0000)
        break
        
      case 'green':
        material.emissive.set(0x00ff00)
        material.emissiveIntensity = 3.5
        material.color.set(0x00ff00)
        break
        
      case 'blinking':  // 🆕 NUOVO
        material.emissive.set(0x00ff00)
        // Intensity gestita da useFrame
        material.color.set(0x00ff00)
        console.log(`🟢💚 [PuzzleLED] ${led.name}: BLINKING (completed room)`)
        break
        
      case 'off':
        material.emissive.set(0x000000)
        material.emissiveIntensity = 0
        material.color.set(0x333333)
        break
    }
    
    material.needsUpdate = true
    
  }, [state])
  
  return null
}
```

---

### **STEP 9: Creare useGameCompletion Hook**

**File:** `src/hooks/useGameCompletion.js`

```javascript
import { useState, useEffect, useCallback, useRef } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export function useGameCompletion(sessionId, socket) {
  const [doorLedStates, setDoorLedStates] = useState(null)
  const [gameWon, setGameWon] = useState(false)
  const [victoryTime, setVictoryTime] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const initializedRef = useRef(false)
  
  // Fetch initial state
  const fetchState = useCallback(async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/game-completion/state`
      )
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      
      setDoorLedStates(data.door_led_states)
      setGameWon(data.game_won)
      setVictoryTime(data.victory_time)
      
      console.log('✅ [useGameCompletion] State loaded:', data)
    } catch (err) {
      console.error('❌ [useGameCompletion] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])
  
  // Initialize
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    fetchState()
  }, [fetchState])
  
  // WebSocket listener
  useEffect(() => {
    if (!socket) return
    
    const handleUpdate = (data) => {
      console.log('📡 [useGameCompletion] WebSocket update:', data)
      
      if (data.session_id !== parseInt(sessionId)) return
      
      setDoorLedStates(data.door_led_states)
      setGameWon(data.game_won)
      setVictoryTime(data.victory_time)
      
      if (data.game_won) {
        console.log('🏆 [useGameCompletion] GAME WON!')
      }
    }
    
    socket.on('game_completion_update', handleUpdate)
    
    return () => {
      socket.off('game_completion_update', handleUpdate)
    }
  }, [socket, sessionId])
  
  return {
    doorLedStates,
    gameWon,
    victoryTime,
    isLoading
  }
}
```

---

### **STEP 10: Modificare Scene Files (Kitchen/Bedroom/Bathroom/Living)**

**Esempio per KitchenScene.jsx:**

```javascript
import { useGameCompletion } from '../../hooks/useGameCompletion'

export default function KitchenScene({ ... }) {
  const sessionId = 1  // TODO: da context
  const { socket } = useWebSocket(sessionId, 'cucina', 'DevPlayer')
  
  // 🆕 NUOVO: Game completion hook
  const { doorLedStates } = useGameCompletion(sessionId, socket)
  
  return (
    <Canvas>
      <Suspense fallback={<LoadingIndicator />}>
        {/* ... existing components ... */}
        
        {/* 🆕 MODIFICATO: LED Porta ora usa stato globale */}
        {doorLedStates && (
          <PuzzleLED
            ledUuid="5C8874BB-4373-44E7-91B9-0C2845ED2856"
            state={doorLedStates.cucina}
          />
        )}
        
        {/* Altri LED rimangono locali */}
        {kitchenPuzzle.ledStates && (
          <>
            <PuzzleLED ledUuid="FORNELLI..." state={kitchenPuzzle.ledStates.fornelli} />
            <PuzzleLED ledUuid="FRIGO..." state={kitchenPuzzle.ledStates.frigo} />
            <PuzzleLED ledUuid="SERRA..." state={kitchenPuzzle.ledStates.serra} />
          </>
        )}
      </Suspense>
    </Canvas>
  )
}
```

**Ripetere per:** BedroomScene, BathroomScene, LivingRoomScene

---

## 🧪 TESTING PROCEDURE

### **1. Test Backend API**

```bash
# Get state
curl http://localhost:8001/api/sessions/1/game-completion/state

# Sync (force check)
curl -X POST http://localhost:8001/api/sessions/1/game-completion/sync

# Reset
curl -X POST http://localhost:8001/api/sessions/1/game-completion/reset
```

### **2. Test Flow Completo**

```
1. Reset tutto (R in kitchen, R in bedroom)
2. Completa cucina (tasti 2→3→4)
   → LED porta cucina: BLINKING 🟢💚
3. Completa camera (tasti K→M→L→J)
   → LED porta camera: BLINKING 🟢💚
4. Quando completi ANCHE bagno E soggiorno:
   → TUTTI LED porta: GREEN FISSO ✅
   → game_won = true
```

---

## 📚 UUID PORTE (Reference)

```javascript
const DOOR_LED_UUIDS = {
  cucina: "5C8874BB-4373-44E7-91B9-0C2845ED2856",
  camera: "F228346D-C130-4F0F-A7A5-4D41EEFC8C77",
  bagno: "BBDD926F-991B-461E-AFD6-B8160DBDEF1C",
  soggiorno: "ED75C7E6-2B25-4FAE-853F-D7CB43B374AF"
}
```

---

## 🚀 DEPLOY

```bash
# 1. Commit changes
git add -A
git commit -m "feat: Add Game Completion System with blinking door LEDs"

# 2. Push to GitHub
git push origin clean-main

# 3. Docker rebuild
docker-compose down
docker-compose up -d --build

# 4. Run migration
docker exec -it escape-backend alembic upgrade head
```

---

## 📝 TODO BAGNO & SOGGIORNO

Quando implementi puzzles per bagno e soggiorno, ricordati di:

1. Creare `bathroom_puzzle_service.py` e `living_puzzle_service.py`
2. Nel metodo finale di completamento, chiamare:
   ```python
   GameCompletionService.mark_room_completed(db, session_id, "bagno")
   # oppure
   GameCompletionService.mark_room_completed(db, session_id, "soggiorno")
   ```
3. Update `_is_room_completed()` in `game_completion_service.py`

---

## 🎯 CHECKLIST FINALE

### Backend:
- [ ] Update GameSession model (relationship)
- [ ] Update models/__init__.py
- [ ] Modificare kitchen_puzzle_service (mark_room_completed)
- [ ] Modificare bedroom_puzzle_service (mark_room_completed)
- [ ] Update WebSocket handler (broadcast)
- [ ] Update main.py (router)
- [ ] Run migration

### Frontend:
- [ ] Modificare PuzzleLED.jsx (blinking support)
- [ ] Creare useGameCompletion.js
- [ ] Modificare KitchenScene.jsx (door LED global)
- [ ] Modificare BedroomScene.jsx (door LED global)
- [ ] Modificare BathroomScene.jsx (door LED global)
- [ ] Modificare LivingRoomScene.jsx (door LED global)

### Testing:
- [ ] Test API endpoints
- [ ] Test sequenza parziale (1-2 stanze)
- [ ] Test vittoria completa (4 stanze)
- [ ] Test WebSocket sync
- [ ] Test reset
- [ ] Deploy produzione

---

**Sistema progettato e implementato il 29/12/2025** 🎉
