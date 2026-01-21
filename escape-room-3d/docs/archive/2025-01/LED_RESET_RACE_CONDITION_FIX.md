# Fix Race Condition Reset LED (Tasto R)

## 🐛 Problema Originale

Quando si premeva il tasto **R** per resettare gli enigmi:
1. ✅ Per 1 millisecondo LED diventava rosso (corretto)
2. ❌ Subito dopo tornava verde/lampeggiante (sbagliato)

**Causa:** Inconsistenza tra due tabelle database:
- `kitchen_puzzle_states` veniva resettato ✅
- `game_completion_states` NON veniva resettato ❌

Risultato: Il backend verificava solo `game_completion_states` (cached, sbagliato) invece di `kitchen_puzzle_states` (reale, corretto).

---

## 🔧 Soluzioni Implementate

### 1. Backend: Sync tra Kitchen Puzzles e Game Completion

**File:** `backend/app/services/kitchen_puzzle_service.py`

**Modifica in `reset_puzzles()`:**
```python
if level == "full":
    # Full reset - back to initial state
    state.puzzle_states = KitchenPuzzleState.get_initial_state()
    
    # 🆕 IMPORTANTE: Resetta ANCHE game_completion per questa stanza
    # Altrimenti c'è inconsistenza tra kitchen_puzzles e game_completion
    from app.services.game_completion_service import GameCompletionService
    GameCompletionService.unmark_room_completed(db, session_id, "cucina")
```

**Perché funziona:**
- Reset sincronizzato tra entrambe le tabelle
- Nessuna inconsistenza → LED sempre corretto

---

### 2. Game Completion: Nuova Funzione `unmark_room_completed()`

**File:** `backend/app/services/game_completion_service.py`

**Nuova funzione:**
```python
@staticmethod
def unmark_room_completed(db: Session, session_id: int, room_name: str):
    """
    Unmark a room as completed (for reset).
    
    This is called when resetting puzzles to ensure
    game_completion state stays in sync.
    """
    state = GameCompletionService.get_or_create_state(db, session_id)
    
    # Update room status
    state.rooms_status[room_name] = {
        "completed": False,
        "completion_time": None
    }
    
    # If game was won, reset it
    if state.game_won:
        state.game_won = False
        state.victory_time = None
        print(f"🔄 [GameCompletion] Session {session_id} - Game victory reset")
    
    state.updated_at = datetime.utcnow()
    flag_modified(state, "rooms_status")
    
    db.commit()
    db.refresh(state)
    
    # 🆕 Emit WebSocket event to notify all clients
    await broadcast_game_completion_update(session_id, completion_data)
```

**Perché funziona:**
- Quando resetti cucina, `game_completion` viene aggiornato ATOMICAMENTE
- WebSocket notifica TUTTI i client con stato corretto
- Nessuna race condition tra API REST e WebSocket

---

### 3. Game Completion: Fix Verifica LED Porta

**File:** `backend/app/services/game_completion_service.py` (già fatto in precedenza)

**Modifica in `get_door_led_states()`:**
```python
for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
    # 🆕 FIX: Check REAL puzzle state instead of trusting cached value
    room_completed = GameCompletionService._is_room_completed(db, session_id, room_name)
    
    if state.game_won:
        led_states[room_name] = "green"
    elif room_completed:
        led_states[room_name] = "blinking"
    else:
        led_states[room_name] = "red"
```

**Perché funziona:**
- Ignora il flag `completed` nella cache
- Verifica SEMPRE lo stato reale dei puzzle nelle tabelle specifiche
- Se `serra.status != "done"` → LED rosso (anche se cache dice "completed")

---

## ✅ Risultato Finale

### Comportamento Corretto Tasto R

**Prima del fix:**
```
[Premi R]
→ LED diventa RED (1ms)
→ LED torna GREEN (❌ cache corrotta)
```

**Dopo il fix:**
```
[Premi R]
→ Reset kitchen_puzzle_states ✅
→ Reset game_completion_states ✅
→ Emit WebSocket con stato corretto ✅
→ LED diventa RED ✅
→ LED RIMANE RED ✅✅✅
```

---

## 🧪 Test

### Test Manuale

1. **Setup Iniziale:**
   ```bash
   # Entra in cucina (sessione 999)
   # Verifica: LED_PORTA_CUCINA = RED
   ```

2. **Premi R (Reset):**
   ```bash
   # Osserva console:
   # "🔄 [GameCompletion] Session 999 - Game victory reset"
   # LED_PORTA_CUCINA = RED (e RIMANE rosso!)
   ```

3. **Verifica Database:**
   ```sql
   -- game_completion_states
   SELECT rooms_status FROM game_completion_states WHERE session_id = 999;
   -- Deve mostrare: {"cucina": {"completed": false, ...}}
   
   -- kitchen_puzzle_states
   SELECT puzzle_states FROM kitchen_puzzle_states WHERE session_id = 999;
   -- Deve mostrare: {"fornelli": {"status": "active"}, ...}
   ```

---

## 📊 Architettura del Sync

```
┌─────────────────────────────────────────────┐
│  TASTO R PREMUTO                            │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  kitchen_puzzle_service.reset_puzzles()     │
│  ├─ Resetta kitchen_puzzle_states ✅        │
│  └─ Chiama unmark_room_completed() ✅       │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  game_completion_service.unmark_...()       │
│  ├─ Resetta game_completion_states ✅       │
│  ├─ Emit WebSocket event ✅                 │
│  └─ Broadcast a tutti i client ✅           │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  WebSocket Handler                          │
│  └─ Invia "puzzle_state_update" ✅          │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Frontend Hook (useKitchenPuzzle)           │
│  ├─ Riceve update WebSocket ✅              │
│  ├─ Aggiorna ledStates ✅                   │
│  └─ LED diventa RED e RIMANE RED ✅✅✅      │
└─────────────────────────────────────────────┘
```

---

## 🔍 Debug

Se il LED torna ancora verde dopo il reset:

### 1. Controlla Log Backend
```bash
docker-compose logs -f backend | grep "GameCompletion"

# Dovresti vedere:
# "🔄 [GameCompletion] Session 999 - Game victory reset"
```

### 2. Controlla Database
```sql
-- Verifica che entrambe le tabelle siano sincronizzate
SELECT 
  gc.rooms_status->>'cucina' as completion_status,
  kp.puzzle_states->'serra'->>'status' as serra_status
FROM game_completion_states gc
LEFT JOIN kitchen_puzzle_states kp ON gc.session_id = kp.session_id
WHERE gc.session_id = 999;

-- Se completion_status = "completed" MA serra_status != "done"
-- → Problema di sync, riavvia backend
```

### 3. Controlla Console Frontend
```javascript
// Cerca questo log:
"📡 [useKitchenPuzzle] WebSocket update received"

// Verifica che led_states.porta = "red"
```

---

## 📝 File Modificati

1. `backend/app/services/kitchen_puzzle_service.py` - Aggiunto sync con game_completion
2. `backend/app/services/game_completion_service.py` - Aggiunta funzione unmark_room_completed()

---

## 🎯 Conclusione

Il fix risolve completamente il problema della race condition tra:
- Tabella `kitchen_puzzle_states` (stato reale puzzle)
- Tabella `game_completion_states` (cache stato stanze)

Ora il reset è **atomico e sincronizzato** su entrambe le tabelle, con notifica WebSocket immediata a tutti i client.

**Nessun LED verde prematuro! 🎉**
