# 🐛 BUG CRITICO: LED PORTA CUCINA NON DIVENTA VERDE

**Data:** 30/12/2025 18:33
**Sessione Test:** 999
**Scenario:** Test completamento cucina

## 🎯 PROBLEMA

Con **TUTTI E 3 i puzzle della cucina completati**, la porta rimane **ROSSA** invece di diventare **VERDE**.

### ✅ Puzzle Completati

```
🟢 LED_INDIZIO_FORNELLI: GREEN (completed)
🟢 LED_INDIZIO_FRIGO: GREEN (completed)  
🟢 LED_INDIZIO_SERRA: GREEN (completed)
```

### ❌ Porta Cucina

```
🔴 LED_PORTA_CUCINA: RED (dovrebbe essere GREEN!)
```

## 📊 EVIDENZE DAI LOG

```javascript
// Tutti i puzzle completati con successo:
✅ [useKitchenPuzzle] Fornelli completed: { fornelli_completed: true }
✅ [useKitchenPuzzle] Frigo completed: { frigo_completed: true }
✅ [useKitchenPuzzle] Serra completed: { serra_completed: true }

// LED indizi tutti verdi:
🟢 [PuzzleLED] LED_INDIZIO_FORNELLI: GREEN (completed)
🟢 [PuzzleLED] LED_INDIZIO_FRIGO: GREEN (completed)
🟢 [PuzzleLED] LED_INDIZIO_SERRA: GREEN (completed)

// MA la porta rimane rossa:
🔴 [useGameCompletion] 🎨 getDoorLEDColor(cucina): "red" (from door_led_states)
🔴 [useGameCompletion] 🎨 getDoorLEDColor(cucina): "red" (from door_led_states)
🔴 [useGameCompletion] 🎨 getDoorLEDColor(cucina): "red" (from door_led_states)
// ... continua all'infinito
```

## 🔍 ANALISI

### Sequenza Corretta dei Test

1. **TASTO 5** → Pentola sui fornelli ✅
   - `fornelli_completed: true`
   - LED Fornelli: VERDE ✅

2. **TASTO 4** → Chiusura sportello frigo ✅
   - `frigo_completed: true`  
   - LED Frigo: VERDE ✅

3. **TASTO Z** → Serra accesa ✅
   - `serra_completed: true`
   - LED Serra: VERDE ✅

### Logica Attesa

Quando **TUTTI** i puzzle di una stanza sono completati:
```javascript
// In useGameCompletion.js dovrebbe calcolare:
if (fornelli_completed && frigo_completed && serra_completed) {
  room_completed = true
  door_led_color = "green"
}
```

### Comportamento Reale

La porta **NON** diventa verde anche con tutti i puzzle completati.

Il log mostra sempre:
```
[useGameCompletion] 🎨 getDoorLEDColor(cucina): "red" (from door_led_states)
```

## 🚨 IPOTESI SUL BUG

### 1. **Logica di Completamento Errata**

Il file `useGameCompletion.js` probabilmente non sta controllando correttamente lo stato dei 3 puzzle:

```javascript
// POTREBBE ESSERE:
const isRoomComplete = checkRoomCompletion(roomName, puzzles)

// INVECE DI guardare direttamente:
const { fornelli_completed, frigo_completed, serra_completed } = kitchenPuzzle
const isKitchenComplete = fornelli_completed && frigo_completed && serra_completed
```

### 2. **WebSocket Update Non Propaga**

Il completamento dei singoli puzzle viene ricevuto via WebSocket:
```javascript
🎨 WebSocket: Received puzzle_state_update
📡 [useKitchenPuzzle] WebSocket update received
✅ [useKitchenPuzzle] States updated from WebSocket
```

Ma forse `useGameCompletion` non rileva questo cambio di stato per calcolare il completamento della stanza.

### 3. **Race Condition**

Possibile che:
1. I puzzle vengono completati singolarmente
2. Ogni completamento aggiorna il backend
3. MA il calcolo del "room_completed" richiede un aggiornamento esplicito
4. Che non viene mai triggerato

## 🔧 AZIONI NECESSARIE

### 1. Verificare `useGameCompletion.js`

Controllare come viene calcolato il completamento:
```javascript
// Cercare la funzione che determina il colore della porta
const getDoorLEDColor = (roomName) => {
  // Verificare questa logica
}
```

### 2. Verificare `backend/app/services/kitchen_puzzle_service.py`

Dopo il completamento dell'ultimo puzzle, il backend dovrebbe:
```python
# Dopo ogni completamento puzzle
if all([fornelli_completed, frigo_completed, serra_completed]):
    # Triggerare completamento stanza
    await game_completion_service.complete_room(session_id, "cucina")
```

### 3. Aggiungere Log di Debug

In `useGameCompletion.js`:
```javascript
useEffect(() => {
  if (roomName === 'cucina') {
    console.log('[DEBUG] Kitchen puzzle states:', {
      fornelli: kitchenPuzzle?.fornelli_completed,
      frigo: kitchenPuzzle?.frigo_completed,
      serra: kitchenPuzzle?.serra_completed,
      roomComplete: isRoomComplete('cucina')
    })
  }
}, [kitchenPuzzle])
```

## 📋 PRIORITÀ

**CRITICA** - Questo blocca il completamento della stanza cucina in produzione!

## 🎯 NEXT STEPS

1. [ ] Leggere `useGameCompletion.js` e identificare la logica errata
2. [ ] Verificare `kitchen_puzzle_service.py` 
3. [ ] Implementare fix
4. [ ] Testare di nuovo la sequenza completa
5. [ ] Documentare la soluzione

---

**Status:** 🔴 BUG APERTO
**Impatto:** CRITICO - Blocca gameplay cucina
**Riproducibilità:** 100% - Si verifica sempre
