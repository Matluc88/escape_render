# 🐛 BUG: LED Porta Camera rimane ROSSO dopo completamento

## 📋 Problema

Dopo aver completato TUTTI e 3 gli enigmi della camera da letto (materasso, poltrona, ventola), il **LED della porta rimane ROSSO** invece di diventare **VERDE/BLINKING**.

## 🔍 Evidenze dai Log

```
✅ [useBedroomPuzzle] Ventola completed → PORTA UNLOCKED!
🎨 [useBedroomPuzzle] LED updated immediately from API response
🟢 [PuzzleLED] LED_INDIZIO_VENTOLA: GREEN (completed)
🟢 [PuzzleLED] LED_INDIZIO_MATERASSO: GREEN (completed)
🔴 [PuzzleLED] LED_PORTA_LETTO: RED (active/locked) ← ❌ DOVREBBE essere GREEN/BLINKING!
```

## 🔬 Analisi Backend

Nel file `backend/app/services/bedroom_puzzle_service.py`, funzione `validate_ventola_complete()`:

```python
# Atomic update
state.puzzle_states["ventola"]["status"] = "done"
state.puzzle_states["ventola"]["completed_at"] = datetime.utcnow().isoformat()
state.puzzle_states["porta"]["status"] = "unlocked"  # ✅ Questo funziona
state.updated_at = datetime.utcnow()

# 🆕 Notifica game completion che camera è completata
from app.services.game_completion_service import GameCompletionService
GameCompletionService.mark_room_completed(db, session_id, "camera")  # ⚠️ Questo NON aggiorna il LED
```

## 🎯 Causa Probabile

Il sistema `useGameCompletion` nel frontend:
1. ✅ Carica correttamente `door_led_states` all'avvio
2. ✅ Fornisce `getDoorLEDColor('camera')` 
3. ❌ NON si aggiorna quando arriva un evento WebSocket di completamento stanza

## 🔧 Soluzione Proposta

**Opzione 1: WebSocket Broadcast** (PREFERITA)
- Quando `GameCompletionService.mark_room_completed()` viene chiamato, deve:
  1. Aggiornare il database `game_completion`
  2. Emettere evento WebSocket `game_completion_update` con i nuovi `door_led_states`
  3. Frontend `useGameCompletion` ascolta questo evento e aggiorna lo stato

**Opzione 2: Polling**
- `useGameCompletion` ricarica periodicamente i dati (ogni 5 secondi)
- Meno efficiente ma più semplice

**Opzione 3: Trigger dopo ventola**
- Quando `bedroomPuzzle.completeVentola()` ha successo, chiamare manualmente:
  ```javascript
  gameCompletion.refreshCompletion() // Force reload
  ```

## 📝 File da Modificare

1. **Backend WebSocket** (`backend/app/websocket/handler.py`)
   - Aggiungere evento `game_completion_update`

2. **Backend Service** (`backend/app/services/game_completion_service.py`)
   - Emettere WebSocket dopo `mark_room_completed()`

3. **Frontend Hook** (`src/hooks/useGameCompletion.js`)
   - Ascoltare evento `game_completion_update` e aggiornare stato locale

## ✅ Workaround Temporaneo

Nel file `BedroomScene.jsx`, dopo `bedroomPuzzle.completeVentola()`:
```javascript
// Force reload game completion dopo ventola
setTimeout(() => {
  gameCompletion.refreshCompletion()
}, 1000)
```

## 🎯 Task Separato

Questo bug è SEPARATO dal task originale "Blocco messaggi enigmi completati" che è già stato completato con successo.

---
**Status**: 🔴 Open  
**Priorità**: Alta  
**Impatto**: Il giocatore non vede visualmente che la stanza è completata
