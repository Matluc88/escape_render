# 🍳 Kitchen Puzzle System - Guida Integrazione

Sistema completo di gestione enigmi cucina con FSM (Finite State Machine), backend persistente e sincronizzazione multiplayer real-time.

---

## 📊 **ARCHITETTURA IMPLEMENTATA**

```
┌────────────────────────────────────────────────────────┐
│                  SISTEMA COMPLETO                       │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ BACKEND (PostgreSQL + FastAPI + WebSocket)        │
│  ├─ Migration 006_add_kitchen_puzzles                 │
│  ├─ Model: KitchenPuzzleState                         │
│  ├─ Service: KitchenPuzzleService (FSM atomico)       │
│  ├─ API: /kitchen-puzzles/* endpoints                 │
│  └─ WebSocket: broadcast_puzzle_update()              │
│                                                         │
│  ✅ FRONTEND (React + Three.js)                        │
│  ├─ Hook: useKitchenPuzzle                            │
│  ├─ Component: PuzzleLED                               │
│  └─ Integration: KitchenScene.jsx (da completare)     │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 **FSM (State Machine) - Flusso Enigmi**

```
INIZIO GIOCO
│
├─ fornelli: active  ← Primo enigma disponibile
├─ frigo: locked
├─ serra: locked
└─ porta: locked
│
▼ Pentola completata (animazione finita)
│
├─ fornelli: done ✅
├─ frigo: active  ← Si sblocca
├─ serra: locked
└─ porta: locked
│
▼ Frigo chiuso (anta chiusa)
│
├─ fornelli: done ✅
├─ frigo: done ✅
├─ serra: active  ← Si sblocca
└─ porta: locked
│
▼ Serra accesa (luce attivata)
│
├─ fornelli: done ✅
├─ frigo: done ✅
├─ serra: done ✅
└─ porta: unlocked ✅  ← CUCINA COMPLETATA!
```

---

## 🔧 **STEP 1: Modificare KitchenScene.jsx**

### **1.1 Import necessari**

Aggiungi questi import all'inizio del file:

```javascript
import { useKitchenPuzzle } from '../../hooks/useKitchenPuzzle'
import { PuzzleLED, LED_UUIDS } from '../3D/PuzzleLED'
```

### **1.2 Estrarre sessionId e socket**

Dentro il componente `KitchenScene`, aggiungi:

```javascript
export default function KitchenScene({ 
  onObjectClick, 
  onLookAtChange, 
  mobileInput, 
  isMobile = false 
}) {
  // Estrai sessionId dall'URL (esempio: /play/123/cucina)
  const sessionId = window.location.pathname.split('/')[2]
  
  // Ottieni socket da useWebSocket (già presente nel progetto)
  const { socket } = useWebSocket()
  
  // Hook puzzle system
  const { 
    puzzleStates, 
    ledStates, 
    completeFornelli, 
    closeFrigo, 
    activateSerra 
  } = useKitchenPuzzle(sessionId, socket)
  
  // ... resto del codice
}
```

### **1.3 Modificare stato iniziale frigo**

Trova questa linea:

```javascript
const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false)
```

Cambia in:

```javascript
const [fridgeDoorOpen, setFridgeDoorOpen] = useState(true) // ← APERTA all'inizio
```

### **1.4 Collegare evento completamento pentola**

Aggiungi questo useEffect per monitorare quando l'animazione pentola finisce:

```javascript
// Monitora completamento animazione pentola
useEffect(() => {
  // Assumendo che hai una variabile che indica la fine dell'animazione
  // (esempio: pentolaSuiFornelli e animazione completata)
  
  // Questo è un ESEMPIO - adattalo al tuo sistema di animazioni
  if (pentolaAnimationComplete && puzzleStates.fornelli === 'active') {
    completeFornelli()
  }
}, [pentolaAnimationComplete, puzzleStates.fornelli, completeFornelli])
```

### **1.5 Collegare evento chiusura frigo**

Aggiungi questo useEffect:

```javascript
// Monitora chiusura frigo
useEffect(() => {
  // Quando il frigo passa da aperto a chiuso E l'enigma è attivo
  if (!fridgeDoorOpen && puzzleStates.frigo === 'active') {
    closeFrigo()
  }
}, [fridgeDoorOpen, puzzleStates.frigo, closeFrigo])
```

### **1.6 Collegare evento accensione serra**

Aggiungi questo useEffect:

```javascript
// Monitora accensione serra
useEffect(() => {
  // Quando la luce serra viene accesa E l'enigma è attivo
  if (neonSerraAcceso && puzzleStates.serra === 'active') {
    activateSerra()
  }
}, [neonSerraAcceso, puzzleStates.serra, activateSerra])
```

### **1.7 Renderizzare i 4 LED**

All'interno del `<Canvas>`, aggiungi i componenti LED:

```javascript
<Canvas>
  {/* ... altri elementi ... */}
  
  {/* 🔴 Sistema LED Cucina */}
  <PuzzleLED ledUuid={LED_UUIDS.PORTA} state={ledStates.porta} />
  <PuzzleLED ledUuid={LED_UUIDS.FORNELLI} state={ledStates.fornelli} />
  <PuzzleLED ledUuid={LED_UUIDS.FRIGO} state={ledStates.frigo} />
  <PuzzleLED ledUuid={LED_UUIDS.SERRA} state={ledStates.serra} />
  
  {/* ... resto del canvas ... */}
</Canvas>
```

---

## 🎨 **LED UUID (già configurati)**

```javascript
LED_PORTA:    '5C8874BB-4373-44E7-91B9-0C2845ED2856'
LED_FORNELLI: 'BD293CB6-B1B9-4AFF-B581-44A58C0C0182'
LED_FRIGO:    '7127A953-E067-45F7-9427-B7B29F669501'
LED_SERRA:    '12E65795-6B7B-435B-AC6A-4E91DB157C0E'
```

---

## 🔥 **TEST DEL SISTEMA**

### **Test manuale (tasti debug)**

1. **Tasto 5** - Pentola vai ai fornelli → Dovrebbe completare enigma fornelli
2. **Tasto 4** - Chiudi frigo → Dovrebbe completare enigma frigo (se fornelli done)
3. **Tasto Z** - Accendi serra → Dovrebbe completare enigma serra (se frigo done)
4. **Verifica LED** - Controlla che cambino colore in tempo reale

### **Test API (Postman/cURL)**

```bash
# Get current state
GET http://localhost:8001/api/sessions/1/kitchen-puzzles/state

# Complete fornelli manually
POST http://localhost:8001/api/sessions/1/kitchen-puzzles/fornelli/complete

# Complete frigo manually
POST http://localhost:8001/api/sessions/1/kitchen-puzzles/frigo/complete

# Complete serra manually
POST http://localhost:8001/api/sessions/1/kitchen-puzzles/serra/complete

# Reset puzzles
POST http://localhost:8001/api/sessions/1/kitchen-puzzles/reset
Body: {"level": "full"}
```

---

## 🐛 **DEBUG & LOG**

Il sistema logga automaticamente ogni operazione:

```
✅ [useKitchenPuzzle] Initial state loaded: {...}
🔥 [useKitchenPuzzle] Completing fornelli puzzle...
📡 [useKitchenPuzzle] WebSocket update received: {...}
🔴 [PuzzleLED] LED_FORNELLI: RED (active)
🟢 [PuzzleLED] LED_FORNELLI: GREEN (completed)
```

Apri la **console browser** e il **log backend** per monitorare il flusso.

---

## ⚡ **MULTIPLAYER SYNC**

- ✅ Quando un giocatore completa un enigma, **TUTTI** vedono l'aggiornamento in real-time
- ✅ I LED si sincronizzano automaticamente via WebSocket
- ✅ Il database è la fonte di verità (no race conditions)

---

## 🔄 **RESET SISTEMA**

### Reset completo (admin):

```javascript
const { resetPuzzles } = useKitchenPuzzle(sessionId, socket)

// Resetta tutto
await resetPuzzles('full')
```

### Reset parziale (specifici enigmi):

```javascript
await resetPuzzles('partial', ['fornelli', 'frigo'])
```

---

## ✅ **CHECKLIST FINALE**

Prima di fare commit:

- [ ] ✅ Migration database eseguita (`alembic upgrade head`)
- [ ] ✅ Backend riavviato per caricare nuovi endpoint
- [ ] ✅ Import aggiunti in KitchenScene.jsx
- [ ] ✅ Hook useKitchenPuzzle integrato
- [ ] ✅ Stato iniziale frigo = `true`
- [ ] ✅ Eventi trigger collegati (fornelli, frigo, serra)
- [ ] ✅ 4 componenti PuzzleLED renderizzati
- [ ] ✅ Test manuale completato
- [ ] ✅ Verifica WebSocket sync multiplayer

---

## 📚 **FILE MODIFICATI/CREATI**

### Backend:
- `backend/alembic/versions/006_add_kitchen_puzzles.py`
- `backend/app/models/kitchen_puzzle.py`
- `backend/app/models/game_session.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/kitchen_puzzle.py`
- `backend/app/services/kitchen_puzzle_service.py`
- `backend/app/api/kitchen_puzzles.py`
- `backend/app/main.py`
- `backend/app/websocket/handler.py`

### Frontend:
- `src/hooks/useKitchenPuzzle.js`
- `src/components/3D/PuzzleLED.jsx`
- `src/components/scenes/KitchenScene.jsx` **(da modificare)**

---

## 🚀 **PRONTO PER DEMO ITS - 4 GENNAIO 2025**

Sistema professionale, robusto e multiplayer-safe! 🎉
