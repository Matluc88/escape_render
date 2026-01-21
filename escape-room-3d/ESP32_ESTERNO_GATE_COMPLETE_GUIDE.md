# 🚪 ESP32 ESTERNO - GATE PUZZLE SYSTEM
## Guida Completa all'Integrazione

**Data**: 09/01/2026  
**Versione**: 1.0  
**Autore**: Sistema Escape Room 3D

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Hardware Richiesto](#hardware-richiesto)
3. [Schema Connessioni](#schema-connessioni)
4. [Backend Integration](#backend-integration)
5. [Configurazione ESP32](#configurazione-esp32)
6. [Testing & Debug](#testing--debug)
7. [Risoluzione Problemi](#risoluzione-problemi)

---

## 🎯 Panoramica Sistema

### Funzionalità Principale
L'ESP32 Esterno controlla il **Gate Puzzle** della scena Esterno:
- **Fotocellula IR** rileva presenza/assenza giocatore
- **4 Servomotori** per animazioni (cancelli, porta, tetto serra)
- **2 LED** stato (rosso/verde)
- **Strip RGB** festa (solo se tutte 4 stanze completate + fotocellula libera)

### Flusso Logico

```
┌─────────────────────────────────────────────────┐
│  FOTOCELLULA                                    │
│  HIGH = LIBERA → Apri tutto + LED verde         │
│  LOW = OCCUPATA → Chiudi tutto + LED rosso      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  ESP32 → Backend                                │
│  POST /api/sessions/{id}/gate-puzzles/         │
│       photocell/update?is_clear=true/false      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Backend aggiorna DB + Controlla Game State    │
│  - gate_puzzles.photocell_clear = true/false   │
│  - Verifica game_completion.game_won = true    │
│  - rgb_strip_on = (photocell AND game_won)     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  ESP32 ← Backend (polling ogni 2s)             │
│  GET /api/sessions/{id}/gate-puzzles/          │
│      esp32-state                                │
│  Riceve: rgb_strip_on, led_status              │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Hardware Richiesto

### Componenti

| Componente | Quantità | Note |
|------------|----------|------|
| ESP32 DevKit | 1 | WiFi integrato |
| Fotocellula IR | 1 | Output invertito (LOW=occupato) |
| Servo MG90S | 3 | Cancelli + Porta (90°) |
| Servo DS3225MG | 1 | Tetto serra (180°) |
| LED Rosso | 1 | Stato occupato |
| LED Verde | 1 | Stato libero |
| LED RGB Strip | 1 | Animazione festa finale |
| Resistenze 220Ω | 2 | Per LED rosso/verde |
| Alimentatore 5V 3A | 1 | Per servomotori |

### Librerie Arduino Richieste

```cpp
WiFi.h           // ESP32 core
HTTPClient.h     // ESP32 core
ESP32Servo.h     // https://github.com/madhephaestus/ESP32Servo
ArduinoJson.h    // https://arduinojson.org/ (v6.x)
```

**Installazione Arduino IDE:**
```
Tools → Manage Libraries →
1. "ESP32Servo" by Kevin Harrington
2. "ArduinoJson" by Benoit Blanchon (v6.x)
```

---

## 📐 Schema Connessioni

### Pinout ESP32

```
┌─────────────────────────────────────────┐
│              ESP32 DEVKIT               │
├─────────────────────────────────────────┤
│  GPIO 19 → Fotocellula IR (Signal)      │
│                                          │
│  GPIO 4  → LED Cancello Verde           │
│  GPIO 16 → LED Cancello Rosso           │
│  GPIO 25 → LED Porta Verde              │
│  GPIO 33 → LED Porta Rosso              │
│             (tutti +220Ω → GND)         │
│                                          │
│  GPIO 5  → Servo Cancello DX (Signal)   │
│  GPIO 17 → Servo Cancello SX (Signal)   │
│  GPIO 18 → Servo Porta (Signal)         │
│  GPIO 32 → Servo Tetto (Signal)         │
│                                          │
│  GPIO 21 → RGB Strip Red                │
│  GPIO 22 → RGB Strip Green              │
│  GPIO 23 → RGB Strip Blue               │
│                                          │
│  GND     → Common Ground                │
│  5V/VIN  → External Power Supply        │
└─────────────────────────────────────────┘
```

### Note Alimentazione

⚠️ **IMPORTANTE:**
- ESP32 alimentato via **USB** o **5V pin**
- Servomotori alimentati da **alimentatore esterno 5V 3A**
- **Comune GND** tra ESP32 e alimentatore servomotori
- RGB strip può richiedere alimentatore separato se > 30 LED

---

## 🗄️ Backend Integration

### 1. Database Schema

**Tabella:** `gate_puzzles`

```sql
CREATE TABLE gate_puzzles (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL UNIQUE,
    photocell_clear BOOLEAN DEFAULT FALSE,
    gates_open BOOLEAN DEFAULT FALSE,
    door_open BOOLEAN DEFAULT FALSE,
    roof_open BOOLEAN DEFAULT FALSE,
    led_status VARCHAR(10) DEFAULT 'red',
    rgb_strip_on BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);
```

### 2. API Endpoints

#### POST `/api/sessions/{session_id}/gate-puzzles/photocell/update`

**Chiamato da:** ESP32 quando fotocellula cambia stato

**Query Parameters:**
- `is_clear` (boolean): `true` = LIBERA, `false` = OCCUPATA

**Response:**
```json
{
  "success": true,
  "session_id": 999,
  "photocell_clear": true,
  "gates_open": true,
  "door_open": true,
  "roof_open": true,
  "led_status": "green",
  "rgb_strip_on": false,
  "completed": true
}
```

#### GET `/api/sessions/{session_id}/gate-puzzles/esp32-state`

**Chiamato da:** ESP32 ogni 2 secondi (polling)

**Response:**
```json
{
  "rgb_strip_on": false,
  "led_status": "green",
  "all_rooms_complete": false
}
```

**Logica RGB Strip:**
```python
rgb_strip_on = photocell_clear AND game_completion.game_won
```

#### GET `/api/sessions/{session_id}/gate-puzzles/state`

**Chiamato da:** Frontend per mostrare progresso

**Response:**
```json
{
  "session_id": 999,
  "photocell_clear": true,
  "gates_open": true,
  "door_open": true,
  "roof_open": true,
  "led_status": "green",
  "rgb_strip_on": false,
  "completed": true,
  "updated_at": "2026-01-09T22:30:00Z"
}
```

### 3. Migration

File: `backend/alembic/versions/012_add_gate_puzzles.py`

```bash
# Applicare migration
cd backend
alembic upgrade head
```

---

## ⚙️ Configurazione ESP32

### 1. Carica Codice

**File:** `esp32-esterno-COMPLETO.ino`

### 2. Modifica Parametri

⚠️ **MODIFICARE QUESTE RIGHE:**

```cpp
const char* WIFI_SSID = "TUO_WIFI_SSID";          // ← WiFi nome
const char* WIFI_PASSWORD = "TUA_WIFI_PASSWORD";  // ← WiFi password
const char* BACKEND_URL = "http://192.168.1.100:8000";  // ← IP backend
const int SESSION_ID = 999;  // ← ID sessione attiva (default 999 per test)
```

### 3. Verifica Serial Monitor

Dopo upload, apri Serial Monitor (115200 baud):

```
🚀 ESP32 ESTERNO - AVVIO
========================================
✅ Servomotori inizializzati
🔌 Connessione WiFi...
.....
✅ WiFi connesso!
📡 IP: 192.168.1.150
📤 POST photocell: OCCUPATA
✅ Stato inviato al backend
🎮 Backend sync → RGB Festa: OFF | All rooms: ❌
========================================
🎉 Sistema pronto!
📸 Fotocellula: OCCUPATA
```

---

## 🧪 Testing & Debug

### Test 1: Fotocellula

```bash
# Monitora Serial
# Copri/scopri fotocellula

Output atteso:
🚦 Cambio stato → LIBERA ✅
📤 POST photocell: LIBERA
✅ Stato inviato al backend
```

### Test 2: Backend Response

```bash
# Curl test endpoint
curl "http://192.168.1.100:8000/api/sessions/999/gate-puzzles/state"

# Output atteso:
{
  "session_id": 999,
  "photocell_clear": true,
  "completed": true,
  ...
}
```

### Test 3: RGB Strip Finale

**Pre-requisiti:**
1. Tutte 4 stanze completate (`game_completion.game_won = true`)
2. Fotocellula LIBERA (`photocell_clear = true`)

**Verifica:**
```sql
-- Check game completion
SELECT * FROM game_completion WHERE session_id = 999;
-- game_won deve essere TRUE

-- Check gate puzzle
SELECT * FROM gate_puzzles WHERE session_id = 999;
-- photocell_clear = TRUE
-- rgb_strip_on = TRUE
```

**Comportamento RGB:**
- Se entrambi TRUE → Strip RGB lampeggia (6 colori)
- Se uno FALSE → Strip RGB spenta

---

## 🐛 Risoluzione Problemi

### Problema 1: WiFi Non Connette

**Sintomi:**
```
🔌 Connessione WiFi...
....................
❌ WiFi fallito!
```

**Soluzioni:**
1. Verifica SSID e password corretti
2. Controlla che WiFi sia 2.4GHz (ESP32 non supporta 5GHz)
3. Avvicina ESP32 al router
4. Riavvia ESP32

### Problema 2: HTTP Error 500

**Sintomi:**
```
📤 POST photocell: LIBERA
⚠️ HTTP 500
```

**Soluzioni:**
1. Verifica backend in esecuzione: `curl http://BACKEND_URL/health`
2. Controlla logs backend per errori
3. Verifica session_id esiste nel database:
   ```sql
   SELECT * FROM game_sessions WHERE id = 999;
   ```

### Problema 3: Servo Non Si Muovono

**Cause possibili:**
- Alimentazione insufficiente (usare alimentatore 5V 3A)
- GND non comune tra ESP32 e alimentatore
- Servo difettosi
- Pin PWM non corretto

**Test:**
```cpp
// Aggiungi in setup() per test manuale
cancelloDX.write(90);  // Deve muoversi a 90°
delay(2000);
cancelloDX.write(0);   // Deve tornare a 0°
```

### Problema 4: RGB Non Si Accende

**Verifica:**
1. Game completion:
   ```sql
   SELECT game_won FROM game_completion WHERE session_id = 999;
   -- Deve essere TRUE
   ```

2. Fotocellula libera:
   ```
   🎮 Backend sync → RGB Festa: ON | All rooms: ✅
   ```

3. Se entrambi OK, controllare connessioni RGB (R=21, G=22, B=23)

### Problema 5: ESP32 si Riavvia

**Cause:**
- Alimentazione insufficiente
- Troppi servo attivi contemporaneamente
- Corto circuito

**Soluzione:**
- Alimentatore più potente (min 3A)
- Condensatore 1000µF su alimentazione servo

---

## 📊 Monitoraggio

### Backend Logs

```bash
# Filtra log gate puzzles
docker logs escape-room-backend | grep "gate"

# Output atteso:
🚪 Gate puzzle completato! session_id=999
Gate puzzle state updated for session 999
```

### Frontend Display

Il frontend mostra automaticamente progresso:

```
🏠 Esterno: 0/1  →  🏠 Esterno: 1/1 ✅
```

Quando fotocellula diventa libera per la prima volta.

---

## 🎓 Note Tecniche

### Timing Ottimale

| Operazione | Intervallo | Note |
|------------|------------|------|
| Servo update | 15ms | Smooth animation |
| RGB cycle | 120ms | Velocità festa |
| Backend polling | 2000ms | Sync stato |
| WiFi reconnect | 30000ms | Check connessione |

### Considerazioni Rete

- **Latenza:** < 100ms per POST fotocellula
- **Bandwidth:** ~200 bytes/richiesta
- **Traffic:** ~1KB/minuto (polling + eventi)

### Conflitti con ESP32 Cucina

❌ **NO conflitto** se su stesso WiFi:
- Endpoint diversi (`/gate-puzzles` vs `/kitchen-puzzles`)
- Session ID può essere stesso (999)
- IP diversi assegnati dal DHCP

---

## 📝 Checklist Deploy

- [ ] Hardware assemblato e testato
- [ ] Librerie Arduino installate
- [ ] Backend migration applicata (`012_add_gate_puzzles`)
- [ ] WiFi credentials configurate
- [ ] Backend URL configurato
- [ ] Session ID corretto
- [ ] Upload codice ESP32
- [ ] Test fotocellula funzionante
- [ ] Test animazioni servo
- [ ] Test comunicazione backend
- [ ] Test RGB strip (con game complete)
- [ ] Verifica frontend mostra progresso

---

## 🚀 Quick Start

```bash
# 1. Backend
cd backend
alembic upgrade head
docker-compose up -d

# 2. ESP32
# - Apri esp32-esterno-COMPLETO.ino in Arduino IDE
# - Modifica WiFi + Backend URL + Session ID
# - Upload su ESP32
# - Apri Serial Monitor (115200)

# 3. Test
# - Copri/scopri fotocellula
# - Verifica Serial Monitor
# - Check frontend per progresso
```

---

## 📞 Support

Per problemi specifici consultare:
- `ESP32_INTEGRATION_GUIDE.md` - Guida generale ESP32
- `GAME_COMPLETION_SYSTEM_GUIDE.md` - Logica completamento
- `SISTEMA_LED_ANALISI_COMPLETA.md` - Debug LED

---

**Fine Documento** 🎉
