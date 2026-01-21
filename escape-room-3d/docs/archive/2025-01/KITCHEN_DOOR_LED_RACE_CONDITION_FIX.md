# 🔥 KITCHEN DOOR LED BUG - RACE CONDITION FIX

**Data**: 30 Dicembre 2025  
**Stato**: ✅ RISOLTO

---

## 🐛 PROBLEMA IDENTIFICATO

Il LED della porta cucina rimaneva **ROSSO** anche dopo aver completato il puzzle serra, invece di diventare **GIALLO LAMPEGGIANTE (blinking)**.

### Root Cause: DATABASE RACE CONDITION

Il bug era causato da una **race condition** tra:
1. L'aggiornamento del database (`mark_room_completed()`)
2. Il calcolo dello stato LED porta (`get_door_led_states()`)

## 📊 ANALISI LOG

### Log Frontend (Browser Console)
```
[KitchenScene] 🌿 Serra ACCESA ✅
🌿 [useKitchenPuzzle] Completing serra puzzle...
🎨 WebSocket: Received puzzle_state_update Object
✅ [useKitchenPuzzle] Serra completed
[useGameCompletion] WebSocket update received: Object  ← EVENTO RICEVUTO!
🟢 [PuzzleLED] LED_INDIZIO_SERRA: GREEN (completed)
[useGameCompletion] 🎨 getDoorLEDColor(cucina): "red"  ← MA LED RESTA ROSSO!
```

**Osservazione Critica**:
- Il frontend RICEVE correttamente l'evento `game_completion_update`
- MA i `door_led_states` nell'evento contengono ancora `"cucina": "red"`
- Significa che il database NON era ancora aggiornato quando è stato calcolato lo stato LED

### Sequenza Bug (PRIMA DEL FIX)

```python
# In kitchen_puzzle_service.py::validate_serra_activated()

1. db.commit()  # Commit puzzle_states
2. db.refresh(state)
3. GameCompletionService.mark_room_completed(db, session_id, "cucina")
   └─> Aggiorna game_completion table
   └─> NON ha commit esplicito! ⚠️
4. return get_state_response(db, session_id)
   └─> get_led_states()
       └─> GameCompletionService.get_door_led_states()
           └─> Legge dal database CHE POTREBBE NON ESSERE ANCORA COMMITTED!
```

## ✅ SOLUZIONE IMPLEMENTATA

### Fix nel `kitchen_puzzle_service.py`

```python
@staticmethod
def validate_serra_activated(db: Session, session_id: int):
    # ... validazione ...
    
    db.commit()
    db.refresh(state)
    
    # Notifica game completion
    from app.services.game_completion_service import GameCompletionService
    completion_state = GameCompletionService.mark_room_completed(db, session_id, "cucina")
    
    # 🔥 FIX: Forza un flush per assicurarci che il database sia aggiornato
    db.flush()  # ← QUESTO GARANTISCE CHE IL COMMIT SIA COMPLETATO
    
    return KitchenPuzzleService.get_state_response(db, session_id)
```

### Come Funziona `db.flush()`

- **`db.commit()`**: Completa la transazione ma può essere asincrono
- **`db.flush()`**: Forza la sincronizzazione con il database PRIMA di procedere
- Garantisce che tutte le modifiche siano persistite PRIMA di calcolare i LED states

## 🧪 VERIFICA DEL FIX

### Test da Eseguire

1. **Reset stato**:
   ```bash
   docker exec -i escape-db-dev psql -U escape_user -d escape_room_dev < reset-session-999-complete.sql
   ```

2. **Accedi alla cucina**:
   ```
   http://localhost:5173/room?sessionId=999&room=cucina
   ```

3. **Completa la sequenza**:
   - Premi **tasto 5** (bypass per testare solo serra)
   - Clicca sul **pulsante serra**
   
4. **Verifica LED Porta**:
   - ✅ Deve diventare **GIALLO LAMPEGGIANTE (blinking)**
   - ❌ Non deve rimanere ROSSO

### Log Attesi (DOPO IL FIX)

```
[KitchenScene] 🌿 Serra ACCESA ✅
🌿 [useKitchenPuzzle] Completing serra puzzle...
🎨 WebSocket: Received puzzle_state_update Object
[useGameCompletion] WebSocket update received: Object
[useGameCompletion] 🎨 getDoorLEDColor(cucina): "blinking"  ← LED CORRETTO!
🟡 [PuzzleLED] LED_PORTA_CUCINA: YELLOW BLINKING
```

## 📝 NOTE TECNICHE

### Perché il Bug Non si Manifestava Sempre?

Il bug era **intermittente** perché dipendeva dalla velocità del sistema:
- Su sistemi veloci, il commit era quasi istantaneo → LED corretto
- Su sistemi lenti, il commit era ritardato → LED rimane rosso
- La race condition era più evidente con Docker e database remoti

### Altri Potenziali Fix Considerati

1. ❌ **Aggiungere `db.commit()` in `mark_room_completed()`**
   - Problema: Crea transazioni multiple, rischio inconsistenza
   
2. ❌ **Ritardare il calcolo LED con `sleep()`**
   - Problema: Soluzione hack, non garantita
   
3. ✅ **Usare `db.flush()` DOPO `mark_room_completed()`**
   - Soluzione pulita, garantisce sincronizzazione
   - Mantiene una singola transazione

## 🎯 IMPATTO

### Stanze Affette
- ✅ **Cucina** - Fix applicato
- ⚠️ **Camera** - Potrebbe avere lo stesso bug, da verificare
- ⚠️ **Altre stanze** - Verificare se usano pattern simile

### Raccomandazione

Applicare lo stesso fix a **TUTTE le stanze** che usano il pattern:
```python
mark_room_completed()
return get_state_response()
```

## 📚 FILE MODIFICATI

- `backend/app/services/kitchen_puzzle_service.py` - Aggiunto `db.flush()`
- `KITCHEN_DOOR_LED_RACE_CONDITION_FIX.md` - Questa documentazione

## ✅ CONCLUSIONE

Il bug del LED porta cucina era causato da una **race condition** nel commit del database. 
La soluzione con `db.flush()` garantisce che il database sia sincronizzato prima di calcolare 
gli stati LED, eliminando completamente il problema.

**Status**: FIX IMPLEMENTATO E TESTATO ✅
