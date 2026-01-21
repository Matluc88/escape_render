# 🔴 Kitchen LED Fix Finale - Diagnosi e Soluzione

## 📊 Problema Identificato

**Sintomo**: `completeFornelli()` viene chiamato ma il LED non cambia da rosso a verde.

**Cause Identificate**:

### 1. ✅ CORS WebSocket - OK
Backend già configurato correttamente:
```python
sio = socketio.AsyncServer(cors_allowed_origins='*')
```

### 2. ⚠️ Frigo - Manca Tracking Transizione
Il `useEffect` attuale si attiva OGNI render quando il frigo è chiuso.
**Serve** un `useRef` per tracciare SOLO il cambio aperto→chiuso.

### 3. 🔴 LED Non Aggiorna - Problema WebSocket Listener
Il problema è nel **timing** di registrazione del listener in `useKitchenPuzzle.js`.

**Linee problematiche** (95-118):
```javascript
useEffect(() => {
  if (!socket || !socket.connected) {
    return
  }
  
  // Register listener when socket connects
  const onConnect = () => {
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  socket.on('connect', onConnect)
  
  return () => {
    socket.off('puzzle_state_update', handlePuzzleUpdate)
    socket.off('connect', onConnect)
  }
}, [socket, sessionId])
```

**Bug**: Se il socket è **già connesso** al primo render, l'event listener NON viene registrato!
- `socket.connected` è `true`
- Ma l'evento `'connect'` non viene mai emesso (perché è già connesso)
- Quindi `handlePuzzleUpdate` non viene mai registrato
- I messaggi WebSocket vengono ignorati

---

## 🛠️ Fix da Applicare

### Fix #1: Frigo - Tracking Transizione (KitchenScene.jsx)

**PRIMA** (linee 554-559):
```javascript
useEffect(() => {
  if (!fridgeDoorOpen && puzzleStates.frigo === 'active') {
    console.log('[KitchenScene] 🧊 Frigo chiuso + enigma attivo → COMPLETO FRIGO')
    closeFrigo()
  }
}, [fridgeDoorOpen, puzzleStates.frigo, closeFrigo])
```

**DOPO**:
```javascript
const prevFridgeState = useRef(true) // Parte aperto

useEffect(() => {
  // Rileva SOLO il cambio aperto→chiuso
  if (prevFridgeState.current === true && fridgeDoorOpen === false) {
    if (puzzleStates.frigo === 'active') {
      console.log('[KitchenScene] 🧊 TRANSIZIONE rilevata: aperto→chiuso')
      closeFrigo()
    }
  }
  prevFridgeState.current = fridgeDoorOpen
}, [fridgeDoorOpen, puzzleStates.frigo, closeFrigo])
```

---

### Fix #2: WebSocket Listener - Registrazione Immediata (useKitchenPuzzle.js)

**PRIMA** (linee 95-118):
```javascript
useEffect(() => {
  if (!socket || !socket.connected) {
    return
  }
  
  const handlePuzzleUpdate = (data) => {
    // ... logica update
  }
  
  // ❌ BUG: Registra listener solo quando socket emette 'connect'
  const onConnect = () => {
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  socket.on('connect', onConnect)
  
  return () => {
    socket.off('puzzle_state_update', handlePuzzleUpdate)
    socket.off('connect', onConnect)
  }
}, [socket, sessionId])
```

**DOPO**:
```javascript
useEffect(() => {
  if (!socket) {
    console.log('⚠️  [useKitchenPuzzle] Socket not available, waiting...')
    return
  }
  
  const handlePuzzleUpdate = (data) => {
    console.log('📡 [useKitchenPuzzle] WebSocket update received:', data)
    
    if (data.session_id !== parseInt(sessionId)) {
      console.log('⚠️  [useKitchenPuzzle] Update for different session, ignoring')
      return
    }
    
    setPuzzleStates({
      fornelli: data.states.fornelli.status,
      frigo: data.states.frigo.status,
      serra: data.states.serra.status,
      porta: data.states.porta.status
    })
    
    setLedStates({
      fornelli: data.led_states.fornelli,
      frigo: data.led_states.frigo,
      serra: data.led_states.serra,
      porta: data.led_states.porta
    })
    
    console.log('✅ [useKitchenPuzzle] States updated from WebSocket')
  }
  
  // ✅ FIX: Registra listener IMMEDIATAMENTE se già connesso
  if (socket.connected) {
    console.log('✅ [useKitchenPuzzle] Socket già connesso - registro listener subito')
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  // Registra anche per connessioni future
  const onConnect = () => {
    console.log('🔌 [useKitchenPuzzle] Socket connesso - registro listener')
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  socket.on('connect', onConnect)
  
  return () => {
    console.log('🧹 [useKitchenPuzzle] Cleanup - rimuovo listener')
    socket.off('puzzle_state_update', handlePuzzleUpdate)
    socket.off('connect', onConnect)
  }
}, [socket, sessionId])
```

**Cambiamento chiave**: 
- Rimuove il check `!socket.connected` che bloccava tutto
- Registra il listener IMMEDIATAMENTE se `socket.connected === true`
- Mantiene anche la registrazione su evento `'connect'` per connessioni future

---

## 📝 Riepilogo Fix

| Fix | File | Linee | Problema | Soluzione |
|-----|------|-------|----------|-----------|
| #1 | `KitchenScene.jsx` | 554-559 | Frigo chiama `closeFrigo()` continuamente | Aggiungi `useRef` per tracciare transizione |
| #2 | `useKitchenPuzzle.js` | 95-118 | Listener non registrato se socket già connesso | Registra listener immediatamente + su 'connect' |

---

## ✅ Risultato Atteso

Dopo i fix:
1. **Tasto 5**: Pentola va sui fornelli → `completeFornelli()` → POST al backend → WebSocket broadcast → LED diventa verde ✅
2. **Tasto 4**: Frigo si chiude (solo 1a volta) → `closeFrigo()` → POST al backend → WebSocket broadcast → LED diventa verde ✅
3. **Tasto Z**: Serra si accende → `activateSerra()` → POST al backend → WebSocket broadcast → LED diventa verde ✅

---

## 🔍 Debug Tips

Se dopo i fix i LED ancora non cambiano, verifica nei log del browser:

```javascript
// Dovresti vedere questa sequenza:
✅ [useKitchenPuzzle] Socket già connesso - registro listener subito
🔥 [KitchenScene] Pentola sui fornelli + enigma attivo → COMPLETO FORNELLI
🔥 [useKitchenPuzzle] Completing fornelli puzzle...
✅ [useKitchenPuzzle] Fornelli completed: {...}
📡 [useKitchenPuzzle] WebSocket update received: {...}
✅ [useKitchenPuzzle] States updated from WebSocket
```

Se manca il messaggio "📡 WebSocket update received", il problema è nel backend (non fa broadcast).

---

**Data Fix**: 26/12/2024 12:05
**Status**: Pronto per implementazione
