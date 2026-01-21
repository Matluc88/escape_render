# Sistema LED WebSocket - FIX DEFINITIVO

## 🐛 Problema Identificato

I LED NON si aggiornano in tempo reale perché il listener WebSocket non viene MAI registrato!

## 📊 Analisi Log

```
✅ WebSocket: Connected
✅ [useKitchenPuzzle] Initial state loaded
❌ MANCA: 🎯 Registering WebSocket listener
❌ MANCA: 📡 WebSocket update received
```

## 🔍 Root Cause

**Bug:** useEffect dependencies `[socket, socket?.connected, sessionId]`

Il problema è che quando `socket.connected` cambia, `socket` rimane la stessa REFERENZA JavaScript, quindi React NON ri-esegue l'effect!

## ✅ Soluzione

**OPZIONE 1: Listener dentro useWebSocket.js**

Registrare listener `puzzle_state_update` direttamente in `useWebSocket` e passare callback.

**OPZIONE 2: Event listener manuale**

Rimuovere dipendenza da `socket?.connected` e usare event `connect` di socket.io.

**OPZIONE 3: Custom hook con forceUpdate**

Usare useState per forzare re-render quando socket si connette.

---

## 🎯 Soluzione Implementata

File: `src/hooks/useKitchenPuzzle.js`

```js
useEffect(() => {
  if (!socket) {
    console.log('⚠️  [useKitchenPuzzle] Socket not ready, waiting...')
    return
  }
  
  const handlePuzzleUpdate = (data) => {
    console.log('📡 [useKitchenPuzzle] WebSocket update received:', data)
    // ... gestione aggiornamenti
  }
  
  // REGISTRA SUBITO (se già connected)
  if (socket.connected) {
    console.log('🎯 [useKitchenPuzzle] Registering listener (already connected)')
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  // REGISTRA quando si connette (se non ancora connected)
  const onConnect = () => {
    console.log('🎯 [useKitchenPuzzle] Registering listener (on connect event)')
    socket.on('puzzle_state_update', handlePuzzleUpdate)
  }
  
  socket.on('connect', onConnect)
  
  return () => {
    socket.off('puzzle_state_update', handlePuzzleUpdate)
    socket.off('connect', onConnect)
  }
}, [socket, sessionId]) // RIMUOVERE socket?.connected
```

## 🧪 Test

1. Reset database
2. Hard refresh
3. Log console deve mostrare:
   ```
   🎯 [useKitchenPuzzle] Registering listener
   ```
4. Premi 5 → LED cambiano ISTANTANEAMENTE

## 📁 File Modificati

- `backend/app/websocket/handler.py` - TypeError fix
- `src/hooks/useKitchenPuzzle.js` - useState + dependencies fix
- `.env.local` - Porte 8001
- `src/hooks/useWebSocket.js` - Listener puzzle_state_update

## ✅ Checklist Bug Fixati

- [x] TypeError backend str(room)
- [x] useState LED frigo OFF vs RED
- [x] Porta backend API 8001
- [x] Porta WebSocket 8001
- [x] Listener puzzle_state_update aggiunto useWebSocket
- [x] Nome evento snake_case
- [x] Timing socket.connected check
- [ ] **CRITICAL: Listener registration timing** ← DA FIXARE ORA!
