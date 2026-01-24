# Escape Room Admin Panel - Configuration Guide

**Version:** 2.0 - FASE 3  
**Last Update:** 24 Gennaio 2025

---

## 📋 Overview

Web dashboard per monitoring e controllo remoto dei dispositivi ESP32 dell'Escape Room.

**Features:**
- ✅ Real-time device monitoring via MQTT WebSocket
- ✅ Heartbeat visualization (uptime, WiFi RSSI, free heap)
- ✅ Remote device reset
- ✅ Session management (create/stop)
- ✅ Live MQTT logs streaming
- ✅ Responsive design (desktop + mobile)

---

## 🚀 Quick Start

### Requisiti
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Connessione internet (per CDN: TailwindCSS, Paho MQTT, Chart.js)
- Credenziali HiveMQ Cloud

### Setup

1. **Configura credenziali MQTT**
   
   Apri `js/mqtt-client.js` e modifica:
   
   ```javascript
   const MQTT_CONFIG = {
       host: 'your-cluster.hivemq.cloud',  // ← Il tuo cluster HiveMQ
       port: 8884,  // WebSocket TLS port
       username: 'escape_device',           // ← Username
       password: 'your_password',           // ← Password
       clientId: 'AdminPanel_' + Math.random().toString(16).substr(2, 8),
       useSSL: true
   };
   ```

2. **Apri Admin Panel**
   
   Metodo 1 - File locale:
   ```bash
   open index.html
   ```
   
   Metodo 2 - Server HTTP locale:
   ```bash
   cd admin-panel
   python3 -m http.server 8080
   # Poi apri: http://localhost:8080
   ```
   
   Metodo 3 - Deploy su Render.com (vedi sotto)

3. **Verifica connessione MQTT**
   
   - Header → Indicatore "MQTT Connected" deve essere verde
   - Logs → Messaggio "✅ MQTT Connected!"
   - Se offline → Controlla credenziali e firewall

---

## 📡 MQTT Topics

### Device → Admin Panel (Subscribe)

```
device/{device_id}/heartbeat         # JSON: uptime, rssi, free_heap
device/{device_id}/status            # "online" o "offline" (LWT)
escape/{room}/{session_id}/mag1/trigger
escape/{room}/{session_id}/microphone/peak
... altri eventi hardware
```

### Admin Panel → Device (Publish)

```
device/{device_id}/cmd/reset                 # Remote reset
device/{device_id}/cmd/assign_session        # Assign new session ID
escape/{room}/{session_id}/led/test          # Test LED
escape/{room}/{session_id}/servo/control     # Control servo
```

---

## 🎮 Session Management

### Creare nuova sessione

1. Inserire session ID (es. 42) nel campo "New Session ID"
2. Click "Start New Session"
3. Confermare nel popup
4. **Tutti i device** riceveranno il comando `device/*/cmd/assign_session`
5. I device aggiorneranno `SESSION_ID` in RAM
6. Tutti i topic cambiano da `escape/{room}/999/*` a `escape/{room}/42/*`

### Stoppare sessione

1. Click "Stop Session"
2. Confermare nel popup
3. Tutti i device tornano a session_id 999 (default)

---

## 🔧 Device Control

### Remote Reset

1. Click "🔄 Reset" su device card
2. Confermare nel popup
3. Device riceve `device/{device_id}/cmd/reset`
4. ESP32 esegue `ESP.restart()`
5. Device torna online entro 30 secondi

### Test LED

1. Click "🔧 Test LED" su device card
2. Comando inviato via MQTT
3. Device esegue blink LED (se implementato nel firmware)

---

## 📊 Device Monitoring

### Status Indicators

| Indicator | Significato |
|-----------|-------------|
| 🟢 ONLINE | Device connesso e heartbeat < 90s |
| 🔴 OFFLINE | Device disconnesso o heartbeat > 90s |

### Metrics

- **Uptime:** Secondi dall'ultimo restart (formato: Xd Yh / Xh Ym / Xm / Xs)
- **WiFi RSSI:** Qualità segnale WiFi in dBm
  - Verde (≥ -50 dBm): Excellent
  - Giallo (-60 to -70 dBm): Fair
  - Rosso (< -70 dBm): Poor
- **Free Heap:** Memoria RAM disponibile in KB/MB

### Last Seen

Timestamp dall'ultimo messaggio ricevuto (heartbeat o status).

---

## 🐛 Troubleshooting

### MQTT non si connette

**Problema:** Indicatore rosso "MQTT Disconnected"

**Soluzioni:**
1. Verifica credenziali in `js/mqtt-client.js`
2. Controlla che HiveMQ cluster sia attivo
3. Verifica firewall/antivirus (porta 8884 WebSocket)
4. Apri Console Browser (F12) per errori dettagliati
5. Testa connessione diretta su http://www.hivemq.com/demos/websocket-client/

### Device non compaiono online

**Problema:** Device card mostra OFFLINE

**Soluzioni:**
1. Verifica che ESP32 sia acceso e connesso WiFi
2. Controlla Serial Monitor ESP32: deve logga "MQTT Connected"
3. Verifica che ESP32 usi stesse credenziali HiveMQ
4. Admin panel deve subscribere a `device/+/heartbeat`
5. Aspetta 30s (primo heartbeat)

### Session ID non si propaga

**Problema:** Click "Start New Session" ma device non cambiano

**Soluzioni:**
1. Verifica MQTT connesso (indicatore verde)
2. Controlla logs: deve apparire `📤 device/{id}/cmd/assign_session`
3. ESP32 Serial Monitor: cerca "Session ID aggiornato"
4. **NOTA:** Firmware ESP32 deve implementare subscribe a `cmd/assign_session`

### Logs non vengono mostrati

**Problema:** Section "MQTT Live Logs" vuota

**Soluzioni:**
1. MQTT deve essere connesso
2. Verifica subscribe ai topic in Console Browser
3. Ricarica pagina (Ctrl+R)
4. Click "🗑️ Clear" per resettare

---

## 🚀 Deploy Produzione

### Opzione 1: Render.com Static Site (Gratis)

1. **Crea repository Git**
   ```bash
   cd admin-panel
   git init
   git add .
   git commit -m "Initial admin panel"
   ```

2. **Push su GitHub/GitLab**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Deploy su Render**
   - Vai su https://render.com
   - New → Static Site
   - Connect repository
   - Publish Directory: `.` (root della cartella admin-panel)
   - Auto-Deploy: Yes
   - Click "Create Static Site"

4. **URL finale**
   ```
   https://escape-admin.onrender.com
   ```

### Opzione 2: GitHub Pages

1. **Push su GitHub**
   ```bash
   git push origin main
   ```

2. **Abilita Pages**
   - Repository → Settings → Pages
   - Source: main branch / root
   - Save

3. **URL finale**
   ```
   https://<username>.github.io/<repo-name>/
   ```

### Opzione 3: Netlify

1. **Drop su Netlify**
   - Vai su https://app.netlify.com/drop
   - Drag & drop cartella `admin-panel/`

2. **URL finale (customizable)**
   ```
   https://escape-admin.netlify.app
   ```

---

## ⚙️ Customization

### Cambiare colori tema

Modifica `css/styles.css`:

```css
/* Cambia colori log */
.log-heartbeat { color: #60a5fa; }  /* Heartbeat blu */
.log-status { color: #34d399; }     /* Status verde */
.log-trigger { color: #fbbf24; }    /* Trigger giallo */
.log-error { color: #f87171; }      /* Errore rosso */
```

### Aggiungere dispositivo

1. **HTML** (`index.html`):
   - Duplica device card
   - Cambia `id="device-nuova-stanza"`
   - Modifica emoji e nome

2. **JavaScript** (`js/devices.js`):
   ```javascript
   this.devices = ['esterno', 'soggiorno', 'bagno', 'cucina', 'nuova-stanza'];
   ```

3. **MQTT** (`js/mqtt-client.js`):
   ```javascript
   this.devices = {
       'nuova-stanza': { status: 'offline', lastSeen: null, heartbeat: null }
   };
   ```

### Timeout watchdog custom

Modifica `js/mqtt-client.js`:

```javascript
const MQTT_CONFIG = {
    reconnectTimeout: 5000,      // Riconnessione MQTT (ms)
    keepAliveInterval: 60        // Keep-alive MQTT (s)
};
```

---

## 📝 File Structure

```
admin-panel/
├── index.html              # Dashboard HTML principale
├── css/
│   └── styles.css          # Stili custom + animazioni
├── js/
│   ├── mqtt-client.js      # Client MQTT WebSocket (Paho)
│   ├── devices.js          # Device management logic
│   ├── sessions.js         # Session control logic
│   └── dashboard.js        # Main controller
├── assets/                 # (vuoto, per future icone/immagini)
└── README.md              # Questa guida

```

---

## 🔗 Dependencies (CDN)

- **TailwindCSS** - `https://cdn.tailwindcss.com` (UI framework)
- **Paho MQTT** - `https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js`
- **Chart.js** - `https://cdn.jsdelivr.net/npm/chart.js` (opzionale, per grafici futuri)

**NOTA:** Admin panel funziona offline tranne MQTT WebSocket (richiede internet).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + R` | Refresh page |
| `Ctrl/Cmd + L` | Clear logs |

---

## 🔐 Security Notes

**⚠️ IMPORTANTE:**

1. **Credenziali MQTT:**
   - NON committare password in Git pubblico
   - Usa `.env` o config server-side per produzione
   - HiveMQ Cloud: crea user separato solo per admin panel

2. **Autenticazione:**
   - Admin panel attuale NON ha login
   - Per produzione: aggiungi Basic Auth o JWT
   - Render.com: Settings → Access Control → Password Protection

3. **CORS:**
   - HiveMQ Cloud WebSocket accetta connessioni da qualsiasi origine
   - Limita IP se possibile nelle impostazioni HiveMQ

---

## 📞 Support & Next Steps

### FASE 4 - Backend API (TODO)

Prossime implementazioni:
- Node.js Express backend
- PostgreSQL database per heartbeat logs
- API REST per device management
- WebSocket push notifications
- Session persistence in database

### Links Utili

- **HiveMQ Cloud:** https://www.hivemq.com/mqtt-cloud-broker/
- **Paho MQTT Docs:** https://www.eclipse.org/paho/files/jsdoc/index.html
- **Firmware ESP32:** `/Users/matteo/Desktop/ESCAPE_render/ESP32_FIRMWARE_LATEST/`

---

**Version:** 2.0  
**Author:** Escape Room Stabilization System  
**Last Update:** 24 Gennaio 2025, 13:15