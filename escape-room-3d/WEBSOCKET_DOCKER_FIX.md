# 🔧 WebSocket Docker Fix - Risolto!

**Data**: 09/01/2026  
**Problema**: WebSocket non funziona in produzione Docker  
**Stato**: ✅ RISOLTO

---

## 🐛 Problema Identificato

Il sistema WebSocket falliva in produzione Docker mentre funzionava in dev locale.

### Root Cause

**File**: `src/hooks/useWebSocket.js`  
**Linea problematica**:
```javascript
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
```

**File**: `.env`
```bash
VITE_WS_URL=    # VUOTO!
```

### Perché Falliva

1. In `.env` (Docker) `VITE_WS_URL` era **vuoto/non impostato**
2. Il fallback usava `http://localhost:3000`
3. In Docker, `localhost:3000` **NON esiste** (backend è su `http://backend:3000`)
4. Il browser cercava di connettersi a un URL inesistente
5. Errore: `Connection refused` / CORS blocked

---

## ✅ Soluzione Implementata

### Modifica a `useWebSocket.js`

```javascript
// PRIMA (SBAGLIATO)
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

// DOPO (CORRETTO)
// In produzione (Docker) usa percorso relativo, nginx proxya /socket.io/
// In dev locale usa http://localhost:3000 se VITE_WS_URL non è impostato
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
```

### Come Funziona Ora

| Ambiente | VITE_WS_URL | import.meta.env.DEV | WS_URL Risultante |
|----------|-------------|---------------------|-------------------|
| **Dev Locale** | `undefined` | `true` | `http://localhost:3000` |
| **Docker Prod** | `""` (vuoto) | `false` | `""` (percorso relativo) |
| **Con Valore** | `http://custom` | any | `http://custom` |

### Perché Funziona

**In Produzione Docker**:
- `WS_URL = ""` (stringa vuota)
- Socket.io usa percorso relativo: `/socket.io/`
- Nginx proxya `/socket.io/` → `http://backend:3000/socket.io/`
- ✅ Connessione stabilita!

**In Dev Locale**:
- `WS_URL = "http://localhost:3000"`
- Connessione diretta al backend dev
- ✅ Funziona come prima!

---

## 🔧 Steps Applicati

1. **Modifica codice**: `src/hooks/useWebSocket.js`
2. **Rebuild frontend**: `docker-compose build frontend`
3. **Restart container**: `docker-compose up -d frontend`
4. ✅ **WebSocket funzionante**

---

## 📋 Configurazione Nginx (già corretta)

```nginx
# Socket.io WebSocket proxy
location /socket.io/ {
    proxy_pass http://backend/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

**Nginx era già configurato correttamente** - il problema era solo nel client!

---

## 🧪 Test

### Verificare WebSocket Funzionante

1. Apri browser console: `F12`
2. Vai su `http://localhost`
3. Controlla console per:
   ```
   WebSocket: Connecting to 
   WebSocket: Connected with ID abc123
   ```

### Verificare Backend Logs

```bash
docker logs escape-backend --tail 50 | grep -i websocket
```

Dovresti vedere:
```
✅ Client connected: <socket_id>
🎮 Player registered: ...
```

---

## 📝 Note Tecniche

### Perché Percorso Relativo in Produzione?

- **Nginx reverse proxy**: Gestisce tutto il routing
- **Sicurezza**: No hard-coded URLs
- **Portabilità**: Funziona su qualsiasi dominio/IP
- **SSL Ready**: Supporta HTTPS senza modifiche

### Alternative Considerate (NON usate)

❌ **Opzione 1**: Impostare `VITE_WS_URL=http://localhost` in `.env`  
→ Funzionerebbe ma meno flessibile

❌ **Opzione 2**: Usare `window.location.origin`  
→ Più complesso e non necessario

✅ **Opzione Scelta**: Percorso relativo con check `DEV`  
→ Semplice, flessibile, funziona ovunque

---

## 🎯 Benefici

- ✅ WebSocket funziona in Docker
- ✅ Dev locale continua a funzionare
- ✅ Nessuna modifica a `.env` necessaria
- ✅ Supporto automatico HTTPS in futuro
- ✅ Portable su diversi domini/IP

---

## 🔗 File Correlati

- `src/hooks/useWebSocket.js` - Hook principale
- `nginx.conf` - Reverse proxy config
- `.env` - Configurazione Docker
- `backend/app/websocket/handler.py` - Handler backend

---

**FIX COMPLETATO E TESTATO** ✅
