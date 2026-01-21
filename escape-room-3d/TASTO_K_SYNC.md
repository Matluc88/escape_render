# 🔄 Sincronizzazione Tasto K - Implementazione Incompleta

## ⚠️ Stato Attuale

**Backend:**
- ✅ Handler `toggleTestBypass` aggiunto
- ✅ Broadcast `testBypassChanged` implementato

**Frontend:**
- ✅ Props `socket, sessionId, playerName` aggiunte a EsternoScene
- ❌ **Emit toggleTestBypass mancante**
- ❌ **Listener testBypassChanged mancante**
- ❌ **Props non passate da RoomScene**

## 📝 Modifiche Necessarie

### 1. RoomScene.jsx - Passare Props

```javascript
// In renderScene()
if (room === 'esterno') {
  return <EsternoScene 
    {...sceneProps} 
    isMobile={isMobile}
    socket={socket}           // ← Aggiungere
    sessionId={sessionId}     // ← Aggiungere  
    playerName={playerName}   // ← Aggiungere
  />
}
```

### 2. EsternoScene.jsx - Emit e Listener

```javascript
// Nel useEffect del tasto K
if (e.key === 'k' || e.key === 'K') {
  const newState = !testBypass
  setTestBypass(newState)
  
  // EMIT via WebSocket
  if (socket && sessionId) {
    socket.emit('toggleTestBypass', {
      sessionId,
      room: 'esterno',
      state: newState,
      playerName: playerName || 'Unknown'
    })
  }
  return
}

// Nuovo useEffect per listener
useEffect(() => {
  if (!socket) return
  
  const handleTestBypassChanged = (data) => {
    if (data.room === 'esterno') {
      console.log(`[EsternoScene] Test bypass cambiato da ${data.toggledBy}: ${data.state}`)
      setTestBypass(data.state)
    }
  }
  
  socket.on('testBypassChanged', handleTestBypassChanged)
  return () => {
    socket.off('testBypassChanged', handleTestBypassChanged)
  }
}, [socket])
```

## 🚀 Per Completare

1. Modificare RoomScene per passare props
2. Modificare EsternoScene emit/listener
3. Riavviare backend
4. Test con 4 giocatori:
   - Uno preme K
   - Tutti vedono cancello aprirsi

## ⚡ Comportamento Finale

**Giocatore 1 preme K:**
1. Frontend emit `toggleTestBypass`
2. Backend riceve e broadcast `testBypassChanged`
3. Tutti i giocatori ricevono evento
4. Tutti aggiornano `testBypass` state
5. Tutti vedono cancello aprirsi/chiudersi

**ESP32 MQTT resta intatto** - funziona in parallelo.
