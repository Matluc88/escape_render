# Fix: Errore "⚠️ Polling fallito" WebSocket

## 🔍 Problema Identificato

Gli errori "⚠️ Polling fallito" erano causati da una configurazione errata dell'URL WebSocket nel file `.env`.

### Causa Root

Il file `.env` conteneva:
```bash
VITE_WS_URL=ws://localhost:8001  # ❌ ERRATO
```

Socket.IO richiede un URL HTTP (non WS) perché:
1. **Upgrade Automatico**: Socket.IO inizia con una richiesta HTTP e poi fa l'upgrade a WebSocket
2. **Fallback Polling**: Se il WebSocket fallisce, Socket.IO prova il polling HTTP
3. **Protocollo Errato**: Con `ws://`, il polling HTTP non può funzionare correttamente

## ✅ Soluzione Implementata

### File Modificato: `.env`

```bash
VITE_WS_URL=http://localhost:8001  # ✅ CORRETTO
```

### Come Funziona Socket.IO

```
Client → HTTP Request (http://localhost:8001)
       ↓
Server risponde con opzioni di trasporto
       ↓
Client tenta WebSocket upgrade (ws://localhost:8001)
       ↓
Se fallisce → Fallback a HTTP Polling (http://localhost:8001/socket.io/)
```

## 🧪 Test della Connessione

### 1. Verifica Configurazione

Controlla che il file `.env` contenga:
```bash
VITE_BACKEND_URL=http://localhost:8001
VITE_WS_URL=http://localhost:8001
```

### 2. Riavvia il Frontend

```bash
cd escape-room-3d
npm run dev
```

### 3. Verifica nel Browser

Apri la console del browser (F12) e cerca questi messaggi:

**✅ Connessione Riuscita:**
```
WebSocket: Connecting to http://localhost:8001
WebSocket: Connected with ID abc123xyz
WebSocket: Emitted joinSession {...}
```

**❌ Se vedi ancora errori:**
```
⚠️ Polling fallito
```

## 🔧 Troubleshooting Aggiuntivo

### Problema: WebSocket non si connette

**Verifica 1: Backend in esecuzione**
```bash
# Controlla che il backend sia attivo
curl http://localhost:8001/api/health
```

**Verifica 2: CORS configurato**
Controlla `backend/.env`:
```bash
CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:3000
```

**Verifica 3: Socket.IO configurato**
Il file `backend/app/websocket/handler.py` deve contenere:
```python
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)
```

### Problema: Polling funziona ma WebSocket no

**Possibili cause:**
1. **Firewall**: Blocca le connessioni WebSocket
2. **Proxy**: Non supporta l'upgrade del protocollo
3. **Browser**: Estensioni che bloccano WebSocket

**Soluzione temporanea:**
Forza solo polling HTTP (nel codice frontend):
```javascript
const socket = io(WS_URL, {
  transports: ['polling'],  // Solo polling, no WebSocket
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
})
```

## 📋 Checklist Completa

- [x] Corretto VITE_WS_URL in `.env` (da `ws://` a `http://`)
- [ ] Riavviato il frontend con `npm run dev`
- [ ] Verificato che il backend sia attivo
- [ ] Controllato la console del browser per confermare connessione
- [ ] Testato l'interazione WebSocket (join session, puzzle updates, ecc.)

## 🎯 Risultato Atteso

Dopo il fix, dovresti vedere nella console:

```
WebSocket: Connecting to http://localhost:8001
WebSocket: Connected with ID abc123xyz
WebSocket: Emitted joinSession {sessionId: 999, room: "cucina", playerName: "Test"}
```

E **NON** dovresti più vedere:
```
⚠️ Polling fallito  ← Questo non deve più apparire
```

## 📝 Note per Produzione

### Deployment su Server

Se fai il deploy su un server esterno, aggiorna `.env` con l'IP/dominio corretto:

```bash
# Esempio per Raspberry Pi
VITE_BACKEND_URL=http://192.168.8.138:8001
VITE_WS_URL=http://192.168.8.138:8001

# Esempio per dominio pubblico
VITE_BACKEND_URL=https://escape-room.example.com
VITE_WS_URL=https://escape-room.example.com
```

**IMPORTANTE:** Con HTTPS, usa sempre `https://` (non `wss://`)!

### Docker

Per Docker, il reverse proxy nginx gestisce il routing, quindi usa:

```bash
VITE_BACKEND_URL=/api
VITE_WS_URL=/socket.io
```

## ✅ Stato Fix

- **Data Fix**: 08/01/2026
- **Stato**: ✅ Completato
- **File Modificati**: `escape-room-3d/.env`
- **Testing**: In attesa di conferma
