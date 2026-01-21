# 🏠 Sistema di Distribuzione Automatica Stanze

## 📋 Panoramica

Sistema di assegnazione automatica dei giocatori alle 4 stanze (cucina, soggiorno, bagno, camera) quando completano l'enigma dell'esterno ed entrano nella porta d'ingresso.

---

## 🎯 Flusso Completo

```
Giocatori risolvono enigma esterno
    ↓
Cancello si apre (via ESP32/MQTT)
    ↓
Giocatori entrano nella porta d'ingresso
    ↓
Sistema rileva ingresso (Z < 3.78)
    ↓
Trigger distribuzione automatica (solo prima volta)
    ↓
Backend distribuisce giocatori nelle 4 stanze
    ↓
WebSocket invia assegnazione a ogni giocatore
    ↓
UI mostra stanza assegnata con fadeout
    ↓
Redirect automatico dopo 3 secondi
    ↓
Giocatori spawna nella stanza assegnata
```

---

## 🔧 Componenti del Sistema

### 1. Backend - WebSocket Handler

**File**: `backend/app/websocket/handler.py`

**Evento**: `distributeRooms`

```python
@sio.event
async def distributeRooms(sid, data):
    """Distribuisce i giocatori nelle stanze"""
    session_id = data.get('sessionId')
    triggered_by = data.get('triggeredBy')
    
    # Chiama il servizio per distribuire
    service = RoomDistributionService(db)
    distribution = service.distribute_players(session_id)
    
    # Invia assegnazione a ogni giocatore
    for room, nicknames in distribution.items():
        for nickname in nicknames:
            player_sid = session_players.get(session_id, {}).get(nickname)
            if player_sid:
                await sio.emit('roomAssigned', {
                    'assignedRoom': room,
                    'nickname': nickname,
                    'distribution': distribution
                }, to=player_sid)
```

**Eventi emessi**:
- `roomAssigned` - Inviato a ogni singolo giocatore con la sua stanza
- `roomDistribution` - Broadcast con tutta la distribuzione
- `distributionFailed` - In caso di errore

---

### 2. Backend - Room Distribution Service

**File**: `backend/app/services/room_distribution_service.py`

**Logica di distribuzione**:
1. Ottiene tutti i giocatori attivi della sessione
2. Li mischia randomicamente
3. Assegna almeno 1 giocatore per stanza (se ci sono 4+ giocatori)
4. Giocatori extra vengono distribuiti random
5. Aggiorna `current_room` nel database

**Esempi**:
- 1 giocatore: Va nella prima stanza (cucina)
- 2 giocatori: cucina + soggiorno
- 3 giocatori: cucina + soggiorno + bagno
- 4 giocatori: 1 per stanza
- 5+ giocatori: 1 per stanza + extra distribuiti random

---

### 3. Frontend - EsternoScene

**File**: `src/components/scenes/EsternoScene.jsx`

#### A. Rilevamento Ingresso Porta

```javascript
useEffect(() => {
  if (!liveDebugInfo || !socket || !sessionId || !playerName || distributionTriggered) return
  
  const DOOR_Z = 3.78 // Posizione Z della porta
  const DOOR_THRESHOLD = 0.5 // Margine
  
  // Controlla se giocatore è entrato
  if (liveDebugInfo.position.z < DOOR_Z + DOOR_THRESHOLD) {
    console.log('[EsternoScene] 🚪 Giocatore entrato! Triggering distribution...')
    setDistributionTriggered(true)
    
    // Emetti evento una sola volta
    socket.emit('distributeRooms', {
      sessionId,
      triggeredBy: playerName
    })
  }
}, [liveDebugInfo, socket, sessionId, playerName, distributionTriggered])
```

**Note**:
- Il trigger avviene **solo una volta** per sessione (flag `distributionTriggered`)
- Il **primo giocatore** che entra nella porta trigge ra la distribuzione per tutti
- Usa le coordinate della camera in tempo reale

#### B. WebSocket Listener

```javascript
useEffect(() => {
  if (!socket) return
  
  const handleRoomAssigned = (data) => {
    console.log('[EsternoScene] 🏠 Stanza assegnata:', data)
    setAssignedRoom(data.assignedRoom)
    setShowTransition(true)
    
    // Avvia fade to black (2 secondi)
    let opacity = 0
    const fadeInterval = setInterval(() => {
      opacity += 0.05 // Incremento ogni 50ms
      setFadeOpacity(opacity)
      
      if (opacity >= 1) {
        clearInterval(fadeInterval)
        
        // Dopo 1 secondo di nero completo, naviga
        setTimeout(() => {
          window.location.href = `/play/${sessionId}/${data.assignedRoom}`
        }, 1000)
      }
    }, 50)
  }
  
  socket.on('roomAssigned', handleRoomAssigned)
  return () => socket.off('roomAssigned', handleRoomAssigned)
}, [socket, sessionId])
```

**Timing**:
- Fade to black: **2 secondi** (da 0% a 100% opacità)
- Pausa nero completo: **1 secondo**
- **Totale**: 3 secondi prima del redirect

#### C. UI Overlay

```jsx
{showTransition && assignedRoom && (
  <>
    {/* Fade to black overlay */}
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: '#000',
      opacity: fadeOpacity,
      zIndex: 2000
    }} />
    
    {/* Room assignment message */}
    <div style={{ zIndex: 2001, textAlign: 'center' }}>
      <div style={{ fontSize: '48px' }}>🏠</div>
      <h1>Sei stato assegnato alla:</h1>
      <h2>
        {assignedRoom === 'cucina' && '🍳 CUCINA'}
        {assignedRoom === 'soggiorno' && '🛋️ SOGGIORNO'}
        {assignedRoom === 'bagno' && '🚿 BAGNO'}
        {assignedRoom === 'camera' && '🛏️ CAMERA'}
      </h2>
      <p>Caricamento...</p>
    </div>
  </>
)}
```

**Stili**:
- Overlay nero con fade progressivo
- Messaggio con icona pulsante
- Stanza assegnata in verde brillante (#00ff88)
- Text shadow per effetto glow

---

## 📊 Database

### Tabella `players`

```sql
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    current_room VARCHAR(50) DEFAULT 'lobby',
    status VARCHAR(20) DEFAULT 'waiting',
    ...
);
```

**Campo `current_room`** aggiornato da `RoomDistributionService`:
- Prima della distribuzione: `'esterno'`
- Dopo la distribuzione: `'cucina'`, `'soggiorno'`, `'bagno'`, `'camera'`

---

## 🧪 Testing

### Test Manuale

1. **Avvia sistema**:
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. **Crea sessione** come admin:
   - Vai su `/admin`
   - Clicca "Crea Nuova Sessione"
   - Vai alla lobby

3. **Connetti giocatori** (2+ browser):
   - Scansiona QR o vai manualmente a `/s/{sessionId}/esterno`
   - Inserisci nickname
   
4. **Avvia gioco** dalla lobby:
   - Admin clicca "VIA!"
   - Tutti vengono reindirizzati a `/play/{sessionId}/esterno`

5. **Testa distribuzione**:
   - Premi **K** per bypassare MQTT (cancello si apre)
   - Premi **L** per aprire porta d'ingresso (solo admin)
   - Entra nella porta
   - **Primo giocatore** che entra trigge ra la distribuzione
   - Tutti vedono la loro stanza assegnata
   - Redirect automatico dopo 3 secondi

### Test con ESP32

1. Configura ESP32 con MQTT
2. Risolvi enigma fisicamente (sposta pietra dalla fotocellula)
3. Cancello si apre automaticamente
4. Entra nella porta
5. Distribuzione automatica

---

## 🚨 Problemi Noti e Soluzioni

### Problema: Distribuzione triggerata più volte

**Soluzione**: Flag `distributionTriggered` previene trigger multipli

```javascript
const [distributionTriggered, setDistributionTriggered] = useState(false)

if (!distributionTriggered) {
  setDistributionTriggered(true)
  socket.emit('distributeRooms', { sessionId, triggeredBy: playerName })
}
```

### Problema: Giocatori non ricevono assegnazione

**Soluzione**: WebSocket usa `session_players` per trovare il `socket_id` corretto

```python
player_sid = session_players.get(session_id, {}).get(nickname)
if player_sid:
    await sio.emit('roomAssigned', {...}, to=player_sid)
```

### Problema: Redirect non funziona

**Soluzione**: Usa `window.location.href` invece di router

```javascript
window.location.href = `/play/${sessionId}/${data.assignedRoom}`
```

---

## 📝 Coordinate Chiave

### Porta d'Ingresso

```javascript
const DOOR_Z = 3.78 // pivotZ dalla config
const DOOR_THRESHOLD = 0.5 // Margine per rilevamento
```

**Come funziona**:
- Quando `camera.position.z < 3.78 + 0.5` → Giocatore è "dentro"
- Trigger distribuzione

**Per modificare la sensibilità**:
- Aumenta `DOOR_THRESHOLD` per rilevamento più precoce
- Diminuisci per rilevamento più tardivo

---

## 🎨 Personalizzazione

### Cambiare timing fade

```javascript
// In handleRoomAssigned
const fadeInterval = setInterval(() => {
  opacity += 0.05 // Cambia questo per velocità
  setFadeOpacity(opacity)
  
  if (opacity >= 1) {
    clearInterval(fadeInterval)
    setTimeout(() => {
      window.location.href = `/play/${sessionId}/${data.assignedRoom}`
    }, 1000) // Cambia questo per pausa prima redirect
  }
}, 50) // Cambia questo per smoothness
```

**Calcolo**:
- `0.05` incremento × `50ms` intervallo = `1/20` al secondo
- Tempo totale fade: `100 / 5 = 20` intervalli × `50ms` = `1000ms` = 2 secondi

### Cambiare logica distribuzione

Modifica `backend/app/services/room_distribution_service.py`:

```python
# Esempio: Prioritizza cucina
def distribute_players(self, session_id: int):
    # ... codice esistente ...
    
    # Assegna primi 2 alla cucina
    if len(active_players) >= 2:
        player1 = active_players[0]
        player2 = active_players[1]
        player1.current_room = 'cucina'
        player2.current_room = 'cucina'
        distribution['cucina'] = [player1.nickname, player2.nickname]
        
        # Distribuisci i restanti
        remaining = active_players[2:]
        ...
```

---

## ✅ Checklist Implementazione

- [x] Backend: Evento WebSocket `distributeRooms`
- [x] Backend: `RoomDistributionService.distribute_players()`
- [x] Frontend: Rilevamento ingresso porta (Z < 3.78)
- [x] Frontend: Trigger distribuzione (solo una volta)
- [x] Frontend: WebSocket listener `roomAssigned`
- [x] Frontend: UI con fadeout/fadein
- [x] Frontend: Redirect automatico
- [x] Database: Campo `current_room` aggiornato
- [x] Testing: Provato con più giocatori
- [x] Documentazione: Guida completa

---

## 🔗 File Correlati

- `backend/app/websocket/handler.py` - Eventi WebSocket
- `backend/app/services/room_distribution_service.py` - Logica distribuzione
- `backend/app/models/player.py` - Modello player con current_room
- `src/components/scenes/EsternoScene.jsx` - Frontend trigger e UI
- `src/pages/RoomScene.jsx` - Routing alle stanze

---

**Autore**: Implementato il 29/12/2024  
**Versione**: 1.0.0  
**Status**: ✅ Completato e funzionante
