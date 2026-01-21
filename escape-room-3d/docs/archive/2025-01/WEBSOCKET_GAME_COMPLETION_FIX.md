# WebSocket Game Completion Fix

## 🐛 BUG IDENTIFICATO

**Sintomo:** Il LED della porta cucina resta ROSSO anche quando tutti i puzzle sono completati (fornelli, frigo, serra).

**Dati osservati:**
- ✅ Puzzle completati correttamente (LED verdi)
- ✅ Database aggiornato correttamente (serra=done, porta=unlocked)
- ❌ LED porta resta ROSSO invece di diventare BLINKING
- ❌ Il client NON riceve mai `game_completion_update` via WebSocket

## 🔍 ROOT CAUSE

Il problema era nella **gestione async/sync** del broadcast WebSocket:

### Flusso Errato (PRIMA):
```
1. Client chiama POST /serra/complete (ASYNC)
2. Endpoint chiama validate_serra_activated() (SYNC)
3. Service chiama mark_room_completed() (SYNC)
4. mark_room_completed() tenta broadcast_game_completion_update() (ASYNC)
5. ❌ Il try/except NASCONDE l'errore del mixing async/sync
6. ❌ Il WebSocket update non viene mai inviato
7. ❌ Il client non riceve l'aggiornamento del LED porta
```

### Codice Problematico:
```python
# In game_completion_service.py - mark_room_completed() [SYNC]
try:
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.create_task(broadcast_game_completion_update(...))
    else:
        loop.run_until_complete(broadcast_game_completion_update(...))
except Exception as e:
    print(f"⚠️ Error broadcasting: {e}")  # ← SILENCIA l'errore!
```

## ✅ SOLUZIONE IMPLEMENTATA

### Flusso Corretto (DOPO):
```
1. Client chiama POST /serra/complete (ASYNC)
2. Endpoint chiama validate_serra_activated() (SYNC)
3. Service aggiorna database e ritorna (SYNC)
4. ✅ Endpoint fa broadcast_puzzle_update() (ASYNC → funziona!)
5. ✅ Endpoint fa broadcast_game_completion_update() (ASYNC → funziona!)
6. ✅ Il client riceve ENTRAMBI gli update via WebSocket
7. ✅ Il LED porta si aggiorna correttamente
```

### Files Modificati:

#### 1. `/backend/app/api/kitchen_puzzles.py`

**Aggiunto import:**
```python
from app.services.game_completion_service import GameCompletionService
from app.websocket.handler import broadcast_puzzle_update, broadcast_game_completion_update
```

**Modificato `/serra/complete`:**
```python
@router.post("/serra/complete", response_model=KitchenPuzzleStateResponse)
async def complete_serra(session_id: int, db: Session = Depends(get_db)):
    result = KitchenPuzzleService.validate_serra_activated(db, session_id)
    
    if result is None:
        raise HTTPException(status_code=400, detail="...")
    
    # Broadcast puzzle state
    await broadcast_puzzle_update(session_id, result)
    
    # 🆕 FIX: Broadcast game completion FROM HERE (async context)
    led_states = GameCompletionService.get_door_led_states(db, session_id)
    state = GameCompletionService.get_or_create_state(db, session_id)
    
    completion_data = {
        "session_id": session_id,
        "rooms_status": state.rooms_status,
        "door_led_states": led_states,
        "game_won": state.game_won,
        "victory_time": state.victory_time.isoformat() if state.victory_time else None,
        "completed_rooms_count": state.get_completed_rooms_count(),
        "updated_at": state.updated_at.isoformat()
    }
    
    await broadcast_game_completion_update(session_id, completion_data)
    print(f"🚀 [API] Broadcasted game_completion_update for session {session_id}")
    
    return result
```

**Modificato `/reset` (stesso pattern):**
```python
@router.post("/reset", response_model=KitchenPuzzleStateResponse)
async def reset_puzzles(...):
    result = KitchenPuzzleService.reset_puzzles(...)
    
    await broadcast_puzzle_update(session_id, result)
    
    # 🆕 FIX: Broadcast game completion after reset
    led_states = GameCompletionService.get_door_led_states(db, session_id)
    state = GameCompletionService.get_or_create_state(db, session_id)
    
    completion_data = {...}
    
    await broadcast_game_completion_update(session_id, completion_data)
    print(f"🔄 [API] Broadcasted game_completion_update after reset")
    
    return result
```

#### 2. `/backend/app/services/game_completion_service.py`

**Rimosso codice problematico:**
```python
# BEFORE (mark_room_completed)
db.commit()
db.refresh(state)

# ❌ REMOVED - trying to broadcast from SYNC context
# try:
#     loop = asyncio.get_event_loop()
#     ...
# except Exception as e:
#     print(f"⚠️ Error: {e}")

return state

# AFTER
db.commit()
db.refresh(state)

# ✅ WebSocket broadcast is now handled by API endpoint (async context)

return state
```

**Stesso fix per `unmark_room_completed()`**

## 🎯 VANTAGGI DELLA SOLUZIONE

1. **Separazione delle responsabilità:**
   - Service layer = logica business (SYNC)
   - API layer = orchestrazione e comunicazione (ASYNC)

2. **No più mixing async/sync pericoloso**

3. **Errori visibili:** Niente più try/except che nasconde problemi

4. **Pattern consistente:** Stesso approccio usato per `broadcast_puzzle_update`

## 🧪 TEST NECESSARI

1. **Test completo flusso cucina:**
   ```
   Tasto 5 → Fornelli (green) → Frigo chiuso (green) → Pulsante serra (green)
   ```
   ✅ Verifica LED porta diventa BLINKING

2. **Test reset:**
   ```
   Tasto 7 → Reset completo
   ```
   ✅ Verifica LED porta torna ROSSO

3. **Verifica log WebSocket:**
   ```
   🚀 [API] Broadcasted game_completion_update for session 999
   [useGameCompletion] WebSocket update received: {...}
   ```

## 📝 NOTE IMPLEMENTATIVE

- Il pattern è applicabile anche a bedroom_puzzles quando necessario
- Il WebSocket handler (`broadcast_game_completion_update`) è già implementato correttamente
- Il client (`useGameCompletion.js`) è già in ascolto del messaggio corretto

## 🔗 FILES CORRELATI

- `KITCHEN_DOOR_LED_BUG.md` - Report del bug originale
- `GAME_COMPLETION_LED_LOGIC.md` - Logica LED porta
- `backend/app/websocket/handler.py` - WebSocket handlers
- `src/hooks/useGameCompletion.js` - Client WebSocket listener
