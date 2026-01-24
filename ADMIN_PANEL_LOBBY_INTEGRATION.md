# 🎮 ADMIN PANEL - INTEGRAZIONE NELLA LOBBY

## ✅ COMPLETATO

L'Admin Panel per il monitoraggio degli ESP32 è stato integrato nella Lobby React.

---

## 📦 COSA È STATO FATTO

### 1. **Copia dell'Admin Panel nel progetto React**
```bash
/Users/matteo/Desktop/ESCAPE_render/escape-room-3d/public/admin-panel/
├── index.html                    # Dashboard principale
├── README.md                     # Documentazione completa
├── css/
│   └── styles.css               # Stili personalizzati
└── js/
    ├── mqtt-client.js           # Client MQTT WebSocket (Paho)
    ├── devices.js               # Gestione 4 dispositivi ESP32
    ├── sessions.js              # Gestione sessioni
    └── dashboard.js             # Inizializzazione dashboard
```

### 2. **Aggiunto pulsante nella Lobby**
- **File modificato**: `escape-room-3d/src/pages/admin/Lobby.jsx`
- **Posizione**: Dopo il pulsante "📱 Mostra QR Codes"
- **Colore**: Viola (`#9C27B0`) per distinguerlo dagli altri
- **Icona**: ⚙️ MONITOR DISPOSITIVI
- **Comportamento**: Apre l'admin panel in una nuova finestra (1400x900px)

---

## 🚀 COME FUNZIONA

### Durante la Lobby (Prima del Gioco)

1. **Apri la lobby**: `http://localhost:5173/admin/session/1/lobby`
2. **Clicca sul pulsante viola** "⚙️ MONITOR DISPOSITIVI"
3. **Si apre una nuova finestra** con l'admin panel
4. **Monitor in tempo reale**:
   - 📡 Status ESP32 (Online/Offline)
   - 📊 WiFi RSSI e qualità segnale
   - ⏱️ Uptime dispositivi
   - 🔄 Heartbeat ogni 30s
   - 📝 Log MQTT live

### Funzionalità Admin Panel

#### **Monitoraggio Dispositivi (4 ESP32)**
```
┌─────────────────────────────────────────────┐
│ 🏡 ESP32 Esterno         [✅ ONLINE]        │
│ WiFi: -45 dBm ████████░░ 80%                │
│ Uptime: 2h 34m                               │
│ Session: 999                                 │
│ [RESET ESP32] [TEST LED]                     │
└─────────────────────────────────────────────┘
```

#### **Gestione Sessioni**
```
┌─────────────────────────────────────────────┐
│ 🎮 Gestione Sessioni                         │
│                                               │
│ Session ID: [___]                            │
│ [CREA NUOVA SESSIONE] [STOP SESSIONE]        │
└─────────────────────────────────────────────┘
```

#### **Log MQTT Live**
```
┌─────────────────────────────────────────────┐
│ 📝 Log MQTT (ultimi 50 messaggi)             │
│                                               │
│ [13:42:15] ↓ device/esterno/heartbeat        │
│ {"session": 999, "rssi": -45, "uptime": 9240}│
│                                               │
│ [13:42:30] ↓ device/soggiorno/heartbeat      │
│ [13:42:45] ↓ device/bagno/heartbeat          │
└─────────────────────────────────────────────┘
```

---

## 🌐 PERCORSI E URL

### Development (Vite)
```bash
# Lobby
http://localhost:5173/admin/session/1/lobby

# Admin Panel (aperto dal pulsante)
http://localhost:5173/admin-panel/index.html
```

### Production (Docker/Render)
```bash
# Lobby
https://escape-render.onrender.com/admin/session/1/lobby

# Admin Panel (aperto dal pulsante)
https://escape-render.onrender.com/admin-panel/index.html
```

---

## ⚙️ CONFIGURAZIONE MQTT

L'admin panel si connette direttamente a **HiveMQ Cloud** via WebSocket TLS.

### File di configurazione: `js/mqtt-client.js`
```javascript
const MQTT_CONFIG = {
  host: 'your-hivemq-cluster.s2.eu.hivemq.cloud',
  port: 8884,  // TLS WebSocket
  username: 'your-username',
  password: 'your-password',
  useSSL: true,
  clientId: `admin-panel-${Date.now()}`
}
```

### Topic MQTT Monitorati
```
device/+/heartbeat       → Heartbeat ogni 30s
device/+/status          → Status & LWT
escape/+/+/#             → Tutti i messaggi game
```

### Comandi Pubblicati
```
device/{device_id}/cmd/reset            → Reset ESP32
device/{device_id}/cmd/assign_session   → Assegna sessione
```

---

## 🧪 TEST RAPIDO

### 1. Avvia il Frontend React
```bash
cd /Users/matteo/Desktop/ESCAPE_render/escape-room-3d
npm run dev
```

### 2. Apri la Lobby
```
http://localhost:5173/admin/session/1/lobby
```

### 3. Clicca "⚙️ MONITOR DISPOSITIVI"
- Si apre una nuova finestra con l'admin panel
- Vedrai 4 card per i dispositivi ESP32
- Se gli ESP32 sono accesi e connessi a HiveMQ, vedrai:
  - Status: ✅ ONLINE
  - RSSI e qualità WiFi
  - Uptime
  - Heartbeat che arrivano ogni 30s

### 4. Test Funzionalità
```bash
# Test Reset ESP32
Clicca [RESET ESP32] → Conferma → ESP32 si riavvia

# Test LED (se implementato nel firmware)
Clicca [TEST LED] → LED lampeggia

# Test Cambio Sessione
Inserisci "123" → Clicca [CREA NUOVA SESSIONE]
Tutti gli ESP32 passano alla sessione 123
```

---

## 📱 LAYOUT RESPONSIVE

L'admin panel è responsive e funziona su:
- 💻 Desktop (1400x900 ottimale)
- 📱 Tablet (adattamento automatico)
- 📲 Mobile (card in colonna singola)

---

## 🔒 SICUREZZA

### ✅ Vantaggi di questo approccio
1. **Nessun file:// protocol** → Nessun problema CORS
2. **Stesso origin del frontend** → Security OK
3. **Funziona in dev e prod** → Nessuna configurazione extra
4. **MQTT TLS WebSocket** → Connessione sicura a HiveMQ

### ⚠️ Note di Sicurezza
- Le credenziali MQTT sono in plain text in `mqtt-client.js`
- Per la produzione, considera di:
  - Usare variabili d'ambiente
  - Creare un proxy backend per MQTT
  - Limitare i permessi ACL su HiveMQ Cloud

---

## 🚢 DEPLOYMENT

### Docker (Render.com/Railway/Fly.io)

Il file `Dockerfile` già include la cartella `public/`:
```dockerfile
COPY --chown=node:node public ./public
```

Quindi l'admin panel verrà automaticamente deployato.

### Verifica Post-Deploy
```bash
# 1. Verifica che i file siano presenti
https://escape-render.onrender.com/admin-panel/index.html

# 2. Testa dalla lobby
https://escape-render.onrender.com/admin/session/1/lobby
→ Clicca "⚙️ MONITOR DISPOSITIVI"

# 3. Verifica connessione MQTT
Apri DevTools → Console → Dovresti vedere:
"MQTT Connected: true"
```

---

## 🐛 TROUBLESHOOTING

### Problema: Admin Panel non si apre
```bash
# Verifica che i file siano nella cartella public
ls -la escape-room-3d/public/admin-panel/

# Output atteso:
# index.html
# README.md
# css/styles.css
# js/mqtt-client.js
# js/devices.js
# js/sessions.js
# js/dashboard.js
```

### Problema: MQTT non si connette
```javascript
// Apri DevTools → Console
// Dovresti vedere:
"Attempting MQTT connection..."
"MQTT Connected: true"

// Se vedi errori:
// 1. Verifica credenziali in js/mqtt-client.js
// 2. Verifica firewall HiveMQ Cloud
// 3. Verifica che il cluster HiveMQ sia attivo
```

### Problema: Dispositivi sempre offline
```bash
# Verifica che gli ESP32 pubblichino heartbeat
# Topic da monitorare su HiveMQ:
device/esterno/heartbeat
device/soggiorno/heartbeat
device/bagno/heartbeat
device/cucina/heartbeat

# Ogni ESP32 deve inviare ogni 30s:
{
  "device": "esterno",
  "session": 999,
  "rssi": -45,
  "uptime": 12345,
  "timestamp": 1234567890
}
```

### Problema: Popup bloccato dal browser
```bash
# Se il browser blocca la finestra popup:
# 1. Consenti popup per localhost/render.com
# 2. In alternativa, aggiungi target="_blank" al button
# 3. O integra l'admin panel come route React (vedi sotto)
```

---

## 🔄 ALTERNATIVA: Integrare come Route React

Se preferisci evitare popup, puoi convertire l'admin panel in un componente React:

```jsx
// escape-room-3d/src/pages/admin/DeviceMonitor.jsx
import React from 'react'

function DeviceMonitor() {
  // Converte js/mqtt-client.js in React hooks
  // Converte js/devices.js in React component
  return (
    <div className="device-monitor">
      {/* Admin Panel UI in React */}
    </div>
  )
}

// escape-room-3d/src/App.jsx
<Route path="/admin/devices" element={<DeviceMonitor />} />

// Lobby.jsx - Link invece di popup
<Link to="/admin/devices">⚙️ MONITOR DISPOSITIVI</Link>
```

---

## 📚 DOCUMENTI CORRELATI

- `admin-panel/README.md` - Documentazione completa admin panel
- `ESP32_FIRMWARE_LATEST/README.md` - Firmware ESP32 cloud-first
- `FASI_3-6_IMPLEMENTAZIONE.md` - Piano completo stabilizzazione

---

## ✨ PROSSIMI STEP (FASE 4-6)

### FASE 4: Backend Node.js + PostgreSQL
- [ ] API REST per gestione dispositivi
- [ ] Storico heartbeat e statistiche
- [ ] WebSocket server per notifiche real-time

### FASE 5: Testing Integrazione
- [ ] Test ESP32 → HiveMQ → Admin Panel
- [ ] Test assegnazione sessioni dinamica
- [ ] Test reset remoto dispositivi

### FASE 6: Deployment Produzione
- [ ] Deploy backend su Render.com
- [ ] Configurazione PostgreSQL
- [ ] Setup monitoraggio Uptime Robot
- [ ] Documentazione operativa completa

---

## 🎯 RIEPILOGO

✅ Admin panel copiato in `public/admin-panel/`
✅ Pulsante viola aggiunto nella lobby
✅ Si apre in nuova finestra (1400x900)
✅ Funziona sia in dev che in prod
✅ MQTT WebSocket TLS su HiveMQ Cloud
✅ Monitoraggio 4 ESP32 in tempo reale
✅ Comandi remote (reset, session)
✅ Log MQTT live

**Pronto per il test!** 🚀