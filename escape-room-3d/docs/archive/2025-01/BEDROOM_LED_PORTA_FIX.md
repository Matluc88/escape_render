# Fix LED Porta Camera - Blinking Bug

**Data:** 30 Dicembre 2025  
**Problema:** LED_PORTA_LETTO parte lampeggiante invece di rosso  
**UUID LED:** F228346D-C130-4F0F-A7A5-4D41EEFC8C77

## 🐛 Problema Identificato

### Sintomo
Il LED della porta nella camera da letto partiva in modalità **blinking** (lampeggiante rosso/verde) all'avvio, invece di rimanere **rosso fisso** fino al completamento di tutti gli enigmi.

### Root Cause
Il bug si trovava in `backend/app/services/game_completion_service.py`, metodo `get_door_led_states()` (riga 204-210).

**Logica ERRATA (prima del fix):**
```python
for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
    room_completed = state.rooms_status[room_name].get("completed", False)
    # ↑ Si fidava del campo cached "completed" nel database
```

Il metodo si fidava ciecamente del campo `rooms_status["camera"]["completed"]` invece di verificare lo **stato REALE** dei puzzle nel database `BedroomPuzzleState`.

### Scenario Bug
1. Database con dati inconsistenti (es. dopo reset parziale)
2. Campo `rooms_status["camera"]["completed"] = True` (dato vecchio)
3. Puzzle camera NON completati (stato reale)
4. `get_door_led_states()` → restituisce `"blinking"` invece di `"red"`
5. LED parte lampeggiante ❌

## ✅ Soluzione Applicata

### Modifica
**File:** `escape-room-3d/backend/app/services/game_completion_service.py`  
**Metodo:** `get_door_led_states()`  
**Riga:** 207

**PRIMA:**
```python
room_completed = state.rooms_status[room_name].get("completed", False)
```

**DOPO:**
```python
# 🆕 FIX: Check REAL puzzle state instead of trusting cached value
room_completed = GameCompletionService._is_room_completed(db, session_id, room_name)
```

### Logica Corretta
Ora `get_door_led_states()` chiama `_is_room_completed()` che verifica lo stato REALE:
- **Cucina:** controlla se `KitchenPuzzleState.serra.status == "done"`
- **Camera:** controlla se `BedroomPuzzleState.porta.status == "unlocked"`
- **Bagno:** TODO (sempre False)
- **Soggiorno:** TODO (sempre False)

## 🎯 Comportamento Atteso

### Stati LED Porta
| Condizione | Stato LED |
|------------|-----------|
| Enigmi NON completati | 🔴 **RED** (rosso fisso) |
| Enigmi completati, gioco NON vinto | ⚡ **BLINKING** (lampeggia rosso/verde) |
| Gioco vinto (tutte 4 stanze) | 🟢 **GREEN** (verde fisso) |

### Per la Camera da Letto
1. **Stato iniziale:** LED_PORTA_LETTO = ROSSO fisso ✅
2. **Dopo completamento enigmi:** LED_PORTA_LETTO = LAMPEGGIA ⚡
3. **Dopo vittoria globale:** LED_PORTA_LETTO = VERDE fisso 🟢

## 🧪 Test

### Come Testare

1. **Reset database (opzionale):**
```bash
cd escape-room-3d
docker-compose down -v
docker-compose up -d
```

2. **Avvia applicazione:**
```bash
npm run dev
```

3. **Accedi alla camera da letto:**
   - Crea sessione test (PIN: 1111)
   - Naviga a: http://localhost:5173/room/camera

4. **Verifica log console:**
```
✅ [PuzzleLED] Found LED: LED_PORTA_LETTO(F228346D-C130-4F0F-A7A5-4D41EEFC8C77)
🔴 [PuzzleLED] LED_PORTA_LETTO: RED (active/locked)
```
**NON deve apparire:** `⚡ [PuzzleLED] Avvio blinking`

5. **Completa enigmi camera:**
   - Premi `K` → animazione comodino
   - Premi `M` → materasso si alza, LED materasso verde
   - Premi `L` → poltrona si muove, LED poltrona verde
   - Premi `J` → ventola si attiva, LED ventola verde
   - **LED_PORTA_LETTO deve iniziare a LAMPEGGIARE** ⚡

6. **Completa tutte le stanze:**
   - Quando cucina + camera + bagno + soggiorno completate
   - **LED_PORTA_LETTO diventa VERDE fisso** 🟢

## 📊 Confronto con Cucina

| Aspetto | Cucina | Camera |
|---------|--------|--------|
| **Backend Service** | `kitchen_puzzle_service.py` | `bedroom_puzzle_service.py` |
| **Chiamata game_completion** | ✅ Riga 220 | ✅ Riga 258 |
| **Metodo finale** | `validate_serra_activated()` | `validate_ventola_complete()` |
| **Frontend hook** | `useKitchenPuzzle.js` | `useBedroomPuzzle.js` |
| **LED Porta** | `getDoorLEDColor('cucina')` | `getDoorLEDColor('camera')` |

**Entrambi funzionano identicamente dopo il fix!** ✅

## 🔍 Debug Aggiuntivo

### Verifica Stato Backend
```bash
curl http://localhost:8001/api/sessions/1/game-completion/state
```

**Output atteso (camera NON completata):**
```json
{
  "door_led_states": {
    "camera": "red",  // ✅ CORRETTO
    "cucina": "red",
    "bagno": "red",
    "soggiorno": "red"
  }
}
```

### Verifica Puzzle Camera
```bash
curl http://localhost:8001/api/sessions/1/bedroom-puzzles/state
```

**Output atteso (stato iniziale):**
```json
{
  "led_states": {
    "porta": "red",      // ✅ Porta rossa
    "materasso": "red",  // ✅ Materasso rosso (active)
    "poltrona": "off",   // Poltrona spenta (locked)
    "ventola": "off"     // Ventola spenta (locked)
  }
}
```

## 📝 Note Tecniche

### Perché il Bug Era Difficile da Trovare
1. **Separazione concerns:** Frontend usa `getDoorLEDColor()` correttamente
2. **Backend sembrava OK:** `mark_room_completed()` funzionava
3. **Cache inconsistente:** Il campo `rooms_status` non veniva sincronizzato
4. **Bug silenzioso:** Nessun errore, solo comportamento sbagliato

### Prevenzione Futura
- ✅ Usa sempre `_is_room_completed()` per verifiche critiche
- ✅ Non fidarsi mai di dati cached per logica di stato
- ✅ Testare reset parziali e scenari edge case

## 🎓 Lezioni Apprese

1. **Single Source of Truth:** Lo stato reale dei puzzle è NEL database puzzle-specific
2. **Cached Data = Unreliable:** Mai usare per decisioni critiche
3. **Verification > Trust:** Verifica sempre lo stato invece di assumere

---

**Autore:** Cline AI Assistant  
**Riferimento:** Issue LED_PORTA_LETTO blinking bug  
**Status:** ✅ RISOLTO
