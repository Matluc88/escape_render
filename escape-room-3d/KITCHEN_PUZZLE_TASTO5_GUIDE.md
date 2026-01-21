# 🍳 Guida Completa: Kitchen Puzzle LED + Tasto 5

## ✅ Sistema Completamente Funzionante

Il **tasto 5** è ora collegato al sistema Kitchen Puzzle LED e funziona correttamente con aggiornamenti real-time via WebSocket.

---

## 🎮 Controlli Keyboard

### Reset Sistema (DEBUG)
- **R** - Reset completo dei puzzle
  - Riporta tutti gli enigmi allo stato iniziale
  - Fornelli: `locked` → `active` (LED rosso)
  - Frigo: aperto
  - Serra: spenta

### Puzzle Fornelli (Pentola)
- **5** - Sposta pentola SUI FORNELLI
  - ✅ Attiva animazione visiva
  - ✅ Completa puzzle fornelli (se `active`)
  - ✅ LED passa da 🔴 ROSSO a 🟢 VERDE
  - ✅ Aggiornamento via WebSocket real-time

- **6** - Riporta pentola al POSTO ORIGINALE
  - Reset animazione (solo visuale)

### Altri Puzzle
- **3/4** - Sportello frigo (apri/chiudi)
- **Z/X** - Neon serra (accendi/spegni)
- **9/0** - Porta cucina (apri/chiudi)

---

## 🔄 Test Workflow Completo

### Step 1: Reset Iniziale
```
1. Premi R → Reset puzzle
2. Verifica LED fornelli: 🔴 ROSSO (active)
```

### Step 2: Completa Puzzle
```
3. Premi 5 → Pentola sui fornelli
4. Osserva:
   - Animazione pentola ✅
   - Console: "COMPLETO FORNELLI" ✅
   - LED: 🔴→🟢 (rosso→verde) ✅
```

### Step 3: Verifica WebSocket
```
5. Controlla console browser:
   - "📡 WebSocket update received"
   - LED_INDIZIO_FORNELLI: GREEN
```

---

## 🛠️ Architettura Tecnica

### Frontend (`KitchenScene.jsx`)

#### 1. Hook Integration
```javascript
const { 
  puzzleStates,    // Stati puzzle correnti
  ledStates,       // Stati LED (red/green/off)
  completeFornelli,// Funzione completamento
  resetPuzzles     // Funzione reset
} = useKitchenPuzzle(sessionId, socket)
```

#### 2. Trigger Automatico
```javascript
useEffect(() => {
  if (pentolaSuiFornelli && puzzleStates.fornelli === 'active') {
    console.log('🔥 Pentola sui fornelli + enigma attivo → COMPLETO')
    completeFornelli()
  }
}, [pentolaSuiFornelli, puzzleStates.fornelli, completeFornelli])
```

#### 3. Keyboard Handler
```javascript
// Tasto 5 - Pentola sui fornelli
if (event.key === '5') {
  setPentolaSuiFornelli(true)  // ← Attiva trigger automatico
}

// Tasto R - Reset puzzle
if (key === 'r') {
  resetPuzzles('full')
  setPentolaSuiFornelli(false)
  // Reset altri stati...
}
```

### Backend (`kitchen_puzzle_service.py`)

#### API Endpoint
```
POST /api/sessions/{session_id}/kitchen-puzzles/fornelli/complete
```

#### Flusso Logica
1. **Check Guard**: Puzzle deve essere `'active'`
2. **Update DB**: `fornelli` → `'completed'`
3. **WebSocket Broadcast**: Invia aggiornamento a tutti i client
4. **LED Update**: `red` → `green`

---

## 🔧 Fix Implementati

### 1. Frigo Tracking Loop Fix ✅
**Problema**: `closeFrigo()` chiamato in loop
**Soluzione**: `useRef` per tracciare SOLO transizione `aperto→chiuso`

```javascript
const prevFridgeState = useRef(true)

useEffect(() => {
  if (prevFridgeState.current === true && fridgeDoorOpen === false) {
    closeFrigo()  // ← Chiamato UNA SOLA VOLTA!
  }
  prevFridgeState.current = fridgeDoorOpen
}, [fridgeDoorOpen])
```

### 2. WebSocket Listener Fix ✅
**Problema**: Listener registrato solo dopo `connect` event
**Soluzione**: Registra SUBITO se socket già connesso

```javascript
useEffect(() => {
  if (!socket) return
  
  // ✅ FIX: Registra se già connesso
  if (socket.connected) {
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  // Registra anche per connessioni future
  socket.on('connect', () => {
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  })
}, [socket, sessionId])
```

### 3. CORS Configuration Fix ✅
**Problema**: Frontend `localhost:5175` non aveva accesso al backend
**Soluzione**: Aggiunto porta in `docker-compose.yml`

```yaml
environment:
  - CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5175
```

---

## 📊 Stati LED Possibili

| Stato | Colore | Significato |
|-------|--------|-------------|
| `off` | ⚫ Nero | Puzzle non ancora sbloccato |
| `red` | 🔴 Rosso | Puzzle attivo (da completare) |
| `green` | 🟢 Verde | Puzzle completato ✅ |

---

## 🚀 Comandi Sviluppo

### Avvio Sistema Completo
```bash
# Terminal 1 - Backend (Docker)
cd escape-room-3d
docker-compose up

# Terminal 2 - Frontend
npm run dev
```

### Test LED System
```bash
# 1. Apri browser: http://localhost:5175
# 2. Premi R (reset)
# 3. Premi 5 (pentola sui fornelli)
# 4. Verifica LED verde ✅
```

---

## 📝 Note Importanti

### ⚠️ Stato Puzzle Richiesto
Il puzzle `fornelli` deve essere in stato `'active'` per essere completato:
- `'locked'` → Tasto 5 non fa nulla
- `'active'` → Tasto 5 completa + LED verde ✅
- `'completed'` → Già completato, nessun effetto

### 🔄 Reset per Testing
Usa sempre **tasto R** prima di testare per:
- Riportare puzzle a `'active'`
- Resettare animazioni locali
- Pulire stato frigo/serra

### 🌐 WebSocket Real-Time
Tutti i cambiamenti LED sono:
- ✅ Salvati nel database
- ✅ Trasmessi via WebSocket
- ✅ Visibili a tutti i giocatori
- ✅ Persistenti tra ricariche pagina

---

## 🎯 Production Ready

Il sistema è **production ready** e include:

✅ **Database persistence**: Stati salvati in PostgreSQL  
✅ **WebSocket sync**: Aggiornamenti real-time multi-client  
✅ **Guard logic**: Previene completamenti non validi  
✅ **Error handling**: Gestione errori API/WebSocket  
✅ **Debug tools**: Tasto R per reset rapido  
✅ **Logging completo**: Console dettagliata per debug  

---

## 📚 File Correlati

### Frontend
- `src/components/scenes/KitchenScene.jsx` - Scene principale
- `src/hooks/useKitchenPuzzle.js` - Hook gestione puzzle
- `src/components/3D/PuzzleLED.jsx` - Componente LED 3D
- `src/hooks/useWebSocket.js` - WebSocket connection

### Backend
- `backend/app/api/kitchen_puzzles.py` - REST API endpoints
- `backend/app/services/kitchen_puzzle_service.py` - Business logic
- `backend/app/models/kitchen_puzzle.py` - Database model
- `backend/app/websocket/handler.py` - WebSocket handler

### Docs
- `KITCHEN_LED_SYSTEM_COMPLETE.md` - Sistema completo LED
- `WEBSOCKET_LED_COMPLETE_FIX.md` - Fix WebSocket
- `KITCHEN_PUZZLE_INTEGRATION.md` - Integrazione sistema

---

## 🐛 Troubleshooting

### LED non si aggiorna
```bash
# 1. Verifica WebSocket connesso
Console → "WebSocket: Connected with ID..."

# 2. Verifica listener registrato
Console → "✅ Socket già connesso - registro listener"

# 3. Verifica stato puzzle
Console → "puzzleStates.fornelli: active"
```

### Reset non funziona
```bash
# 1. Verifica chiamata API
Console → "🔄 Tasto R - RESET PUZZLE!"

# 2. Verifica backend Docker attivo
docker-compose ps

# 3. Verifica porta backend
http://localhost:3000/health
```

---

**Sistema completo e testato! 🎉**
