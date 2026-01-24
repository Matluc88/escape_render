# FASI 3-6 - IMPLEMENTAZIONE COMPLETA
**Piano Stabilizzazione Escape Room**  
**Data:** 24 Gennaio 2025

---

## ✅ RECAP FASI COMPLETATE

### FASE 1 - ESP32 ESTERNO ✅
- Firmware cloud-first con WiFiManager
- HiveMQ MQTT TLS 8883
- Triple watchdog system
- Heartbeat ogni 30s
- Remote reset via MQTT

### FASE 2 - CONVERSIONE FIRMWARE ✅
**4/5 stanze completate:**
- ✅ ESTERNO (FASE 1)
- ✅ SOGGIORNO (FASE 2)
- ✅ BAGNO (FASE 2)
- ✅ CUCINA (FASE 2)
- ⏳ CAMERA (hardware non definito)

**Tutti i firmware condividono:**
- WiFiManager captive portal
- Triple watchdog (WiFi/MQTT/Hardware)
- Heartbeat JSON strutturato
- Last Will & Testament
- Reset remoto MQTT
- Zero IP hardcoded

---

## 🚀 FASE 3 - ADMIN PANEL WEB

### Obiettivo
Dashboard web per monitoring e controllo remoto di tutti gli ESP32.

### Componenti

#### 3.1 Frontend Dashboard
**Tecnologie:** HTML5, Vanilla JS, TailwindCSS, Chart.js

**Features:**
- **Device Monitoring:**
  - Lista dispositivi con status online/offline
  - Ultimo heartbeat ricevuto
  - WiFi RSSI, uptime, free heap
  - Indicatori visuali per watchdog states

- **Control Panel:**
  - Reset remoto per device
  - LED control via MQTT
  - Servo control
  - Test hardware (buzzer, LED blink)

- **Logs Real-Time:**
  - Stream MQTT messages
  - Heartbeat timeline
  - Alert su disconnessioni

- **Session Management:**
  - Creazione nuova sessione
  - Stop sessione attiva
  - Assegnazione session_id dinamica via MQTT

**File structure:**
```
admin-panel/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── mqtt-client.js      # Paho MQTT WebSocket
│   ├── dashboard.js        # UI logic
│   ├── devices.js          # Device management
│   └── sessions.js         # Session control
└── assets/
    ├── icons/
    └── sounds/
```

#### 3.2 MQTT WebSocket Bridge
**Tecnologia:** Mosquitto MQTT broker con WebSocket support

**Configurazione:**
```conf
# mosquitto.conf
listener 1883
protocol mqtt

listener 9001
protocol websockets
```

**O usare HiveMQ Cloud WebSocket:**
```
wss://your-cluster.hivemq.cloud:8884/mqtt
```

#### 3.3 Backend API Integration
**Endpoint necessari:**
```
GET  /api/devices                    # Lista devices con status
GET  /api/devices/{id}/heartbeat     # Ultimo heartbeat
POST /api/devices/{id}/reset         # Pubblica comando reset
POST /api/devices/{id}/control       # Controllo LED/Servo

GET  /api/sessions                   # Lista sessioni
POST /api/sessions                   # Crea nuova sessione
GET  /api/sessions/active            # Sessione attiva
POST /api/sessions/{id}/stop         # Stop sessione
```

### Deploy
- **Hosting:** Render.com Static Site (gratuito)
- **URL:** `https://escape-admin.onrender.com`
- **Auth:** Basic auth con username/password

---

## 🔧 FASE 4 - BACKEND SESSION MANAGER

### Obiettivo
API Node.js per gestione dinamica session_id e sincronizzazione MQTT.

### Architettura

#### 4.1 Stack Tecnologico
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL (Render.com managed)
- **MQTT Client:** mqtt.js
- **ORM:** Prisma

#### 4.2 Database Schema
```prisma
model Device {
  id            String   @id @default(uuid())
  device_id     String   @unique  // "esterno", "soggiorno", etc.
  name          String
  status        String   @default("offline")  // online, offline, error
  last_seen     DateTime?
  last_heartbeat Json?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}

model Session {
  id              Int      @id @default(autoincrement())
  status          String   @default("active")  // active, completed, stopped
  started_at      DateTime @default(now())
  completed_at    DateTime?
  room_states     Json?    // Stato puzzles per stanza
  game_completion Json?    // Door LED states
}

model HeartbeatLog {
  id         String   @id @default(uuid())
  device_id  String
  payload    Json
  rssi       Int?
  uptime_s   Int?
  free_heap  Int?
  timestamp  DateTime @default(now())
  
  @@index([device_id, timestamp])
}
```

#### 4.3 MQTT Topics Architecture

**Device → Backend (Publish):**
```
device/{device_id}/heartbeat     # JSON payload ogni 30s
device/{device_id}/status        # online/offline (LWT)
escape/{room}/{session_id}/mag1/trigger
escape/{room}/{session_id}/microphone/peak
...
```

**Backend → Device (Subscribe & Publish):**
```
device/{device_id}/cmd/reset           # Reset remoto
device/{device_id}/cmd/assign_session  # Assegna session_id
escape/{room}/{session_id}/led/*       # Control LED
escape/{room}/{session_id}/servo/*     # Control servo
```

**Admin Panel ↔ Backend (WebSocket):**
```
admin/devices/status          # Status updates real-time
admin/sessions/updates        # Session state changes
admin/logs/stream             # Log streaming
```

#### 4.4 Key Features

**Session Lifecycle:**
1. Admin crea nuova sessione → genera `session_id`
2. Backend pubblica a tutti i device: `device/*/cmd/assign_session` con payload `{session_id: X}`
3. ESP32 ricevono e aggiornano `SESSION_ID` in RAM
4. Tutti i topic cambiano da `.../999/*` a `.../X/*`
5. A fine sessione → reset a session_id 999 (default)

**Heartbeat Processing:**
- Salva heartbeat in DB ogni 30s
- Calcola device status (online se < 90s dall'ultimo heartbeat)
- Alert se device offline > 3 minuti
- Statistiche uptime, WiFi quality, memoria

**Device Discovery:**
- Auto-register device al primo heartbeat
- Aggiorna last_seen e status
- WebSocket push a admin panel

### Deploy
- **Hosting:** Render.com Web Service
- **Database:** Render.com PostgreSQL
- **URL:** `https://escape-backend.onrender.com`
- **Env vars:**
  ```
  DATABASE_URL=postgresql://...
  MQTT_BROKER=your-cluster.hivemq.cloud
  MQTT_PORT=8883
  MQTT_USER=escape_device
  MQTT_PASS=...
  JWT_SECRET=...
  ```

---

## 🧪 FASE 5 - TEST INTEGRAZIONE

### Obiettivo
Validare l'intero sistema end-to-end con tutti i componenti.

### Test Scenarios

#### 5.1 Device Boot Test
**Per ogni stanza (ESTERNO, SOGGIORNO, BAGNO, CUCINA):**

1. **WiFi Captive Portal:**
   - Flash firmware cloud
   - Power on ESP32
   - Verificare AP `EscapeRoom-{Stanza}`
   - Connettere con smartphone
   - Configurare WiFi credentials
   - Verificare connessione WiFi

2. **MQTT Connection:**
   - Verificare connessione HiveMQ TLS 8883
   - Controllare topic `device/{id}/status` → "online"
   - Verificare subscribe ai topic comando

3. **Heartbeat:**
   - Attendere 30s
   - Verificare publish `device/{id}/heartbeat`
   - Controllare payload JSON valido
   - Verificare dati: uptime, rssi, free_heap

#### 5.2 Watchdog Test

**WiFi Watchdog:**
1. Device connesso e funzionante
2. Disabilitare router WiFi
3. Verificare log "WiFi perso, reconnect..."
4. Aspettare 120s
5. **Expected:** ESP32 restart automatico

**MQTT Watchdog:**
1. Device WiFi OK
2. Bloccare MQTT broker (firewall rule)
3. Verificare tentativi reconnect
4. Aspettare 180s
5. **Expected:** ESP32 restart automatico

**Hardware Watchdog:**
1. Inserire `while(1);` nel loop per simulare freeze
2. Aspettare 120s
3. **Expected:** ESP32 restart automatico

#### 5.3 Remote Reset Test
1. Device online
2. Admin panel: click "Reset Device"
3. Backend pubblica `device/{id}/cmd/reset`
4. **Expected:** ESP32 restart entro 1s
5. **Expected:** Device torna online entro 30s

#### 5.4 Session Management Test
1. Admin panel: "Create New Session" → session_id = 42
2. Backend pubblica `device/*/cmd/assign_session` payload: `{"session_id": 42}`
3. Verificare ESP32 Serial Monitor: "Session ID aggiornato: 42"
4. Triggerare sensor (es. MAG1)
5. **Expected:** Publish a `escape/{room}/42/mag1/trigger` (NON 999!)
6. Admin panel: "Stop Session"
7. **Expected:** Tutti device tornano a session_id 999

#### 5.5 Hardware Control Test

**Per ogni stanza:**
- ✅ Test LED bicolore (rosso → giallo → verde)
- ✅ Test LED blinking
- ✅ Test sensori magnetici
- ✅ Test servo (open → close)
- ✅ Test ventole/fan
- ✅ Test microfono (solo CUCINA)
- ✅ Test strip LED (solo CUCINA)

#### 5.6 Load Test
**Obiettivo:** Verificare sistema sotto carico

1. Tutti 4 device online simultaneamente
2. Heartbeat ogni 30s × 4 = 8 msg/min
3. Sensor triggers simulati: 10 trigger/min × 4 = 40 msg/min
4. Admin panel aperto con live logs
5. **Run for:** 2 ore continue
6. **Check:**
   - Nessun device restart inaspettato
   - Nessuna perdita messaggi MQTT
   - Backend responsive
   - Admin panel non rallenta

#### 5.7 Network Failure Recovery
**Scenario:** Blackout totale e ripristino

1. Tutti device online
2. Spegnere router + internet
3. Attendere 5 minuti
4. Riaccendere router
5. **Expected:**
   - Device auto-reconnect WiFi entro 2 min
   - Device auto-reconnect MQTT entro 3 min
   - Nessun restart necessario (watchdog gestisce)
   - Admin panel mostra devices tornati online

---

## 🚀 FASE 6 - DEPLOY PRODUZIONE

### Obiettivo
Deploy completo su Render.com con dominio personalizzato e monitoraggio.

### 6.1 Preparazione Repository

**Struttura finale:**
```
escape-room-3d/
├── backend/              # Node.js Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── mqtt/
│   │   └── prisma/
│   ├── package.json
│   └── Dockerfile (opzionale)
├── admin-panel/          # Static frontend
│   ├── index.html
│   ├── css/
│   └── js/
├── firmware/             # ESP32 .ino files
│   ├── esterno/
│   ├── soggiorno/
│   ├── bagno/
│   └── cucina/
└── docs/
    ├── API.md
    ├── HARDWARE.md
    └── DEPLOYMENT.md
```

### 6.2 Deploy Backend (Render.com)

**Step by step:**

1. **Create Web Service:**
   - Name: `escape-room-backend`
   - Environment: Node
   - Build Command: `cd backend && npm install && npx prisma generate`
   - Start Command: `cd backend && npm start`
   - Instance Type: Starter ($7/month) o Free

2. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=8001
   DATABASE_URL=<Render PostgreSQL URL>
   MQTT_BROKER=your-cluster.hivemq.cloud
   MQTT_PORT=8883
   MQTT_USER=escape_device
   MQTT_PASS=<password>
   MQTT_USE_TLS=true
   JWT_SECRET=<random_string_32_chars>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<strong_password>
   CORS_ORIGIN=https://escape-admin.onrender.com
   ```

3. **Database Setup:**
   - Create PostgreSQL database su Render
   - Run migrations: `npx prisma migrate deploy`
   - Seed iniziale (opzionale)

4. **Health Check:**
   - Endpoint: `/health`
   - Expected: `{"status": "ok", "mqtt": "connected"}`

### 6.3 Deploy Admin Panel (Render.com)

**Step by step:**

1. **Create Static Site:**
   - Name: `escape-room-admin`
   - Branch: main
   - Publish Directory: `admin-panel`
   - Auto-deploy: Yes

2. **Environment Variables:**
   ```
   BACKEND_API_URL=https://escape-room-backend.onrender.com
   MQTT_WS_URL=wss://your-cluster.hivemq.cloud:8884/mqtt
   ```

3. **Build Command (opzionale):**
   - Se usi build tools: `npm run build`
   - Se HTML statico: nessuno

### 6.4 Dominio Personalizzato (Opzionale)

**Se hai dominio (es. `escaperoom.tech`):**

1. **Backend:**
   - Render: Settings → Custom Domain
   - Aggiungi: `api.escaperoom.tech`
   - Configura DNS CNAME

2. **Admin Panel:**
   - Render: Settings → Custom Domain
   - Aggiungi: `admin.escaperoom.tech`
   - Configura DNS CNAME

3. **SSL:**
   - Auto-provisioning Render (Let's Encrypt)
   - Nessuna configurazione necessaria

### 6.5 Monitoring & Alerts

**Render.com built-in:**
- CPU, RAM, Network metrics
- Error rate tracking
- Auto-restart on crash

**External (opzionale):**
- **Uptime monitoring:** UptimeRobot (free)
  - Ping `/health` ogni 5 min
  - Alert email se down
- **Logs:** Logtail o Papertrail
- **APM:** New Relic (free tier)

### 6.6 Backup Strategy

**Database:**
- Render PostgreSQL: backup automatici giornalieri
- Retention: 7 giorni (free tier)
- Opzionale: script backup manuale S3

**Firmware:**
- Git repository (già fatto ✅)
- Tag release per ogni versione
- Changelog

### 6.7 Post-Deploy Checklist

**Backend:**
- [ ] Health endpoint risponde 200 OK
- [ ] MQTT client connesso a HiveMQ
- [ ] Database migrations applicate
- [ ] Logs visibili su Render dashboard
- [ ] CORS configurato correttamente

**Admin Panel:**
- [ ] Frontend carica senza errori
- [ ] API calls funzionanti
- [ ] MQTT WebSocket connesso
- [ ] Device list aggiornata in real-time
- [ ] Session creation funzionante

**ESP32 Devices:**
- [ ] Tutti 4 device connessi a HiveMQ
- [ ] Heartbeat ricevuti su backend
- [ ] Status "online" su admin panel
- [ ] Remote reset funzionante

**Testing End-to-End:**
- [ ] Creare sessione da admin panel
- [ ] Verificare session_id propagato
- [ ] Triggerare sensor fisico
- [ ] Verificare MQTT message su admin logs
- [ ] Completare game flow
- [ ] Verificare LED door states

---

## 📊 METRICHE DI SUCCESSO

**Affidabilità:**
- ✅ Uptime > 99% per 30 giorni
- ✅ Zero restart non pianificati
- ✅ Watchdog recovery < 3 minuti

**Performance:**
- ✅ MQTT latency < 100ms
- ✅ API response time < 200ms
- ✅ Admin panel load < 2s

**Usabilità:**
- ✅ Zero interventi manuali necessari
- ✅ Remote reset funziona 100% volte
- ✅ Session management da remoto

---

## 📝 DOCUMENTAZIONE FINALE

**Da creare:**
1. **API Documentation** (Swagger/OpenAPI)
2. **Hardware Setup Guide** (foto + wiring)
3. **Admin Panel User Manual**
4. **Troubleshooting Guide**
5. **Disaster Recovery Plan**

---

## 🎯 NEXT STEPS IMMEDIATI

**Per completare FASE 3:**
1. ✅ Creare struttura admin-panel/
2. ✅ Implementare dashboard.html base
3. ✅ Integrare MQTT WebSocket (Paho.js)
4. ✅ Device monitoring UI
5. ✅ Session control UI

**Per FASE 4:**
1. Creare backend/ con Express
2. Setup Prisma + PostgreSQL schema
3. Implementare MQTT bridge
4. API endpoints per devices
5. Session management logic

---

**Status:** 📍 Inizio FASE 3 - Admin Panel Web  
**Target Completion:** FASE 3-4 → 25 Gen | FASE 5-6 → 26 Gen