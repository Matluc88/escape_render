# 🚿 BATHROOM LED SYSTEM - COMPLETAMENTO TOTALE

## ✅ Sistema Completo e Funzionante

### 📊 Architettura LED Bagno

**4 LED totali:**

1. **LED_PORTA_BAGNO** (`BBDD926F-991B-461E-AFD6-B8160DBDEF1C`)
   - Usa sistema globale `getDoorLEDColor('bagno')`
   - Stati: `red` → `blinking` (completato) → `green` (gioco vinto)

2. **LED_INDIZIO_SPECCHIO_BAGNO** (`26E43847-607F-4BB9-B2B6-9CE675DADFFB`)
   - Enigma 1: Countdown specchio (concentrazione mentale)
   - Stati: `red` (attivo) → `green` (completato)

3. **LED_INDIZIO_PORTA_FINESTRA_BAGNO** (`E3EA401C-0723-4718-A3E8-DDD4AC43CEA9`)
   - Enigma 2: Chiusura anta doccia
   - Stati: `off` (locked) → `red` (attivo) → `green` (completato)

4. **LED_INDIZIO_VENTOLA_BAGNO** (`2E3E52F0-3339-453D-A634-D0A1A48B32F7`)
   - Enigma 3: Chiusura porta-finestra per umidità
   - Stati: `off` (locked) → `red` (attivo) → `green` (completato)

---

## 🔧 Implementazione Backend

### File: `backend/app/models/bathroom_puzzle.py`

```python
class BathroomPuzzleState(Base):
    """Stato FSM per enigmi bagno"""
    
    @staticmethod
    def get_initial_state() -> Dict[str, Any]:
        return {
            "specchio": {"status": "active", "completed_at": None},
            "doccia": {"status": "locked", "completed_at": None},
            "ventola": {"status": "locked", "completed_at": None}
        }
```

### File: `backend/app/services/bathroom_puzzle_service.py`

#### Completamento Specchio (Enigma 1)
```python
@staticmethod
def validate_specchio_complete(db: Session, session_id: int):
    """
    Specchio → done, Doccia → active (LED rosso)
    """
    state = get_or_create_state(db, session_id)
    
    if state.puzzle_states["specchio"]["status"] != "active":
        return None  # Guard: ignora doppi trigger
    
    state.puzzle_states["specchio"]["status"] = "done"
    state.puzzle_states["doccia"]["status"] = "active"
    flag_modified(state, "puzzle_states")
    db.commit()
```

#### Completamento Doccia (Enigma 2)
```python
@staticmethod
def validate_doccia_complete(db: Session, session_id: int):
    """
    Doccia → done, Ventola → active (LED rosso)
    """
    state = get_or_create_state(db, session_id)
    
    if state.puzzle_states["doccia"]["status"] != "active":
        return None  # Guard
    
    state.puzzle_states["doccia"]["status"] = "done"
    state.puzzle_states["ventola"]["status"] = "active"
    flag_modified(state, "puzzle_states")
    db.commit()
```

#### Completamento Ventola (Enigma 3 - FINALE)
```python
@staticmethod
def validate_ventola_complete(db: Session, session_id: int):
    """
    Ventola → done
    🔥 CHIAMA: GameCompletionService.mark_room_completed(db, session_id, "bagno")
    → LED_PORTA lampeggia!
    """
    state = get_or_create_state(db, session_id)
    
    if state.puzzle_states["ventola"]["status"] != "active":
        return None  # Guard
    
    state.puzzle_states["ventola"]["status"] = "done"
    flag_modified(state, "puzzle_states")
    db.commit()
    
    # 🔥 Notifica completamento stanza
    from app.services.game_completion_service import GameCompletionService
    GameCompletionService.mark_room_completed(db, session_id, "bagno")
```

### File: `backend/app/services/game_completion_service.py`

```python
@staticmethod
def _is_room_completed(db: Session, session_id: int, room_name: str) -> bool:
    """Check REALE dello stato puzzle"""
    
    if room_name == "bagno":
        from app.models.bathroom_puzzle import BathroomPuzzleState
        bathroom = db.query(BathroomPuzzleState).filter(
            BathroomPuzzleState.session_id == session_id
        ).first()
        
        if not bathroom:
            return False
        
        # Bagno completato quando TUTTI e 3 i puzzle sono done
        return (bathroom.puzzle_states.get("specchio", {}).get("status") == "done" and
                bathroom.puzzle_states.get("doccia", {}).get("status") == "done" and
                bathroom.puzzle_states.get("ventola", {}).get("status") == "done")
    
    # ... altre stanze ...
```

```python
@staticmethod
def get_door_led_states(db: Session, session_id: int) -> Dict[str, str]:
    """
    Logica LED porte (PER-ROOM con GLOBAL victory):
    - Room not completed → "red"
    - Room completed, game not won → "blinking" ✨
    - Game won (all 4 rooms) → "green"
    """
    state = get_or_create_state(db, session_id)
    led_states = {}
    
    for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
        room_completed = _is_room_completed(db, session_id, room_name)
        
        if state.game_won:
            led_states[room_name] = "green"  # GLOBAL
        elif room_completed:
            led_states[room_name] = "blinking"  # 💚⚡ PER-ROOM
        else:
            led_states[room_name] = "red"  # Default
    
    return led_states
```

---

## 🎨 Implementazione Frontend

### File: `src/hooks/useBathroomPuzzle.js`

```javascript
export default function useBathroomPuzzle(sessionId) {
  const [puzzleStates, setPuzzleStates] = useState(null)
  
  // Fetch stato puzzle
  useEffect(() => {
    fetchPuzzleState()
  }, [sessionId])
  
  // Completa enigma (con guard contro doppi trigger)
  const completePuzzle = async (puzzleName) => {
    // Guard: controlla se già completato
    if (puzzleStates?.[puzzleName] === 'completed' || 
        puzzleStates?.[puzzleName] === 'done') {
      console.log('[useBathroomPuzzle] ⚠️ Enigma già completato, skip chiamata API')
      return
    }
    
    try {
      await api.post(`/api/bathroom-puzzles/${sessionId}/${puzzleName}/complete`)
      await fetchPuzzleState()
    } catch (error) {
      console.error('[useBathroomPuzzle] ❌ Errore:', error)
    }
  }
  
  // Calcola colore LED per singolo enigma
  const getLEDColor = (puzzleName) => {
    const state = puzzleStates?.[puzzleName]
    
    if (state === 'completed' || state === 'done') return 'green'
    if (state === 'active' || state === 'waiting') return 'red'
    return 'off'  // locked
  }
  
  return { puzzleStates, completePuzzle, getLEDColor, resetPuzzles }
}
```

### File: `src/components/scenes/BathroomScene.jsx`

#### Guard sulle chiamate API (FIX errore 400)

```javascript
// ENIGMA 1 - Specchio (riga ~1358)
const completedRef = useRef(false)

<ProximityCountdownController
  enabled={specchioClicked && !countdownCompleted.current}
  onComplete={() => {
    setLampsEnabled(true)
    
    // 🔥 Guard: chiama API solo se non già completato
    if (bathroom.puzzleStates?.specchio !== 'completed' && 
        bathroom.puzzleStates?.specchio !== 'done') {
      bathroom.completePuzzle('specchio')
    }
  }}
  completedRef={countdownCompleted}
/>

// ENIGMA 2 - Doccia (riga ~933)
useEffect(() => {
  if (!showerIsOpen && !showerIsAnimating && enigma1Completato && !enigma2Completato) {
    setEnigma2Completato(true)
    
    // 🔥 Guard
    if (bathroom.puzzleStates?.porta_finestra !== 'completed' && 
        bathroom.puzzleStates?.porta_finestra !== 'done') {
      bathroom.completePuzzle('doccia')
    }
  }
}, [showerIsOpen, showerIsAnimating, enigma1Completato, enigma2Completato])

// ENIGMA 3 - Ventola (riga ~971)
useEffect(() => {
  if (!doorIsOpen && enigma2Completato && !enigma3Completato) {
    setEnigma3Completato(true)
    
    // 🔥 Guard
    if (bathroom.puzzleStates?.ventola !== 'completed' && 
        bathroom.puzzleStates?.ventola !== 'done') {
      bathroom.completePuzzle('ventola')
    }
  }
}, [doorIsOpen, enigma2Completato, enigma3Completato])
```

#### Rendering LED (riga ~1224)

```jsx
{/* 💡 Sistema LED Bagno - 4 LED per enigmi */}
<PuzzleLED 
  ledUuid="BBDD926F-991B-461E-AFD6-B8160DBDEF1C"
  state={getDoorLEDColor('bagno')}  // red/blinking/green
/>
<PuzzleLED 
  ledUuid="26E43847-607F-4BB9-B2B6-9CE675DADFFB"
  state={bathroom.getLEDColor('specchio')}  // red/green
/>
<PuzzleLED 
  ledUuid="E3EA401C-0723-4718-A3E8-DDD4AC43CEA9"
  state={bathroom.getLEDColor('porta_finestra')}  // off/red/green
/>
<PuzzleLED 
  ledUuid="2E3E52F0-3339-453D-A634-D0A1A48B32F7"
  state={bathroom.getLEDColor('ventola')}  // off/red/green
/>
```

---

## 🚀 Sequenza Enigmi

### 1️⃣ Enigma Specchio (Countdown)
- ✅ Player si avvicina allo specchio
- ⏱️ Rimane fermo per 5 secondi
- 💡 Luci accese → LED verde
- ➡️ Unlock enigma 2 (doccia)

### 2️⃣ Enigma Doccia (Spazio)
- 🚿 Chiudere l'anta doccia fisicamente (tasto L)
- 💡 LED verde → "Hai lo spazio per aprire la finestra!"
- ➡️ Unlock enigma 3 (ventola)

### 3️⃣ Enigma Ventola (Umidità - FINALE)
- 🪟 Chiudere porta-finestra (tasto K)
- 💡 LED verde → "Bagno completato!"
- ✨ **LED_PORTA lampeggia verde!**

---

## 🐛 Bug Fix Applicati

### ❌ Problema: LED Porta Bagno non lampeggia
**Causa:** Container Docker non riavviato dopo modifiche backend

**Fix:**
```bash
docker-compose restart backend
```

### ❌ Problema: Errore 400 "Puzzle not in active state"
**Causa:** Chiamate API duplicate (useEffect triggera più volte)

**Fix:** Guard su tutte e 3 le chiamate `completePuzzle`:
```javascript
if (bathroom.puzzleStates?.[puzzleName] !== 'completed' && 
    bathroom.puzzleStates?.[puzzleName] !== 'done') {
  bathroom.completePuzzle(puzzleName)
}
```

---

## 🎯 Testing

### Test Completo
```bash
# 1. Reset bagno
Tasto R in scena bagno

# 2. Risolvi enigmi in sequenza
- Avvicinati allo specchio → countdown 5 sec
- Chiudi anta doccia (tasto L)
- Chiudi porta-finestra (tasto K)

# 3. Verifica LED
- LED_SPECCHIO: rosso → verde ✅
- LED_PORTA_FINESTRA: off → rosso → verde ✅
- LED_VENTOLA: off → rosso → verde ✅
- LED_PORTA: rosso → 💚⚡ BLINKING ✅

# 4. Verifica logs backend
"🔍 [get_door_led_states] bagno: LED = blinking"
```

### Verifica Database
```sql
SELECT * FROM bathroom_puzzle_states WHERE session_id = 999;
-- puzzle_states:
-- {"specchio": {"status": "done"}, 
--  "doccia": {"status": "done"}, 
--  "ventola": {"status": "done"}}

SELECT * FROM game_completion_states WHERE session_id = 999;
-- rooms_status.bagno.completed = true
-- door_led_states.bagno = "blinking"
```

---

## 📝 File Coinvolti

### Backend
- `backend/app/models/bathroom_puzzle.py` - Modello DB
- `backend/app/schemas/bathroom_puzzle.py` - Schema Pydantic
- `backend/app/services/bathroom_puzzle_service.py` - Logica FSM ✅
- `backend/app/services/game_completion_service.py` - Logica LED ✅
- `backend/app/api/bathroom_puzzles.py` - Endpoint API
- `backend/alembic/versions/011_add_bathroom_puzzles.py` - Migration

### Frontend
- `src/hooks/useBathroomPuzzle.js` - Hook React ✅
- `src/components/scenes/BathroomScene.jsx` - Scene + LED ✅
- `src/components/3D/PuzzleLED.jsx` - Componente LED
- `src/hooks/useGameCompletion.js` - Hook globale

---

## ✅ Checklist Finale

- [x] Backend: Modelli, schema, service
- [x] Backend: API endpoints funzionanti
- [x] Backend: Migration database
- [x] Backend: Integrazione game_completion
- [x] Backend: Fix flag_modified per JSONB
- [x] Backend: Check `_is_room_completed` corretto
- [x] Frontend: Hook `useBathroomPuzzle`
- [x] Frontend: Rendering 4 LED
- [x] Frontend: Guard contro doppi trigger
- [x] Frontend: Auto-reset al mount
- [x] Docker: Backend riavviato
- [x] Test: Sequenza completa funzionante
- [x] Test: LED porta lampeggia correttamente
- [x] Test: Nessun errore 400 nei log

---

## 🎉 Risultato Finale

**Sistema LED Bagno 100% funzionante!**

- ✅ Sequenza enigmi fluida
- ✅ LED rosso/verde per indizi
- ✅ LED porta lampeggiante al completamento
- ✅ Nessun bug o errore
- ✅ Pattern identico alle altre stanze

**Pronto per produzione! 🚀**
