# 🚿 DEPLOY BAGNO HARDWARE COMPLETATO - Raspberry Pi

## ✅ STATUS: DEPLOY COMPLETATO CON SUCCESSO

**Data Deploy:** 17/01/2026 - 03:30 AM  
**Raspberry IP:** 192.168.8.10:8001  
**Sessione Attiva:** ID 1005  
**Database:** escape_db  

---

## 📋 MODIFICHE DEPLOYATE

### Backend API - 3 Nuovi Endpoint ESP32

✅ `GET /api/sessions/{id}/bathroom-puzzles/door-servo-status`
- Controlla se servo porta deve aprire (game won)
- Response: `{"should_open_servo": false, "game_won": false}`

✅ `GET /api/sessions/{id}/bathroom-puzzles/window-servo-status`
- Controlla se servo finestra deve chiudere (ventola done)
- Response: `{"should_close_window": false, "ventola_status": "locked"}`

✅ `GET /api/sessions/{id}/bathroom-puzzles/fan-status`
- Controlla se ventola deve attivarsi (ventola done)
- Response: `{"should_run_fan": false, "ventola_status": "locked"}`

### Database - 3 Nuove Colonne

✅ `bathroom_puzzle_states.door_servo_should_open` (Boolean)
✅ `bathroom_puzzle_states.window_servo_should_close` (Boolean)
✅ `bathroom_puzzle_states.fan_should_run` (Boolean)

### Service Logic

✅ `validate_ventola_complete()` attiva hardware quando ventola completato:
- `window_servo_should_close = True`
- `fan_should_run = True`

✅ `reset_puzzles()` resetta hardware flags a False

---

## 🧪 TEST EFFETTUATI

### Test Endpoint (Sessione 1005)

```bash
# Test 1: Door Servo
curl http://192.168.8.10:8001/api/sessions/1005/bathroom-puzzles/door-servo-status
✅ {"should_open_servo":false,"game_won":false}

# Test 2: Window Servo
curl http://192.168.8.10:8001/api/sessions/1005/bathroom-puzzles/window-servo-status
✅ {"should_close_window":false,"ventola_status":"locked"}

# Test 3: Fan
curl http://192.168.8.10:8001/api/sessions/1005/bathroom-puzzles/fan-status
✅ {"should_run_fan":false,"ventola_status":"locked"}

# Test 4: Bathroom State
curl http://192.168.8.10:8001/api/sessions/1005/bathroom-puzzles/state
✅ {"session_id":1005,"room_name":"bagno","states":{...}}
```

**Tutti i test PASSATI con successo!** ✅

---

## 🔌 HARDWARE SUPPORTATO

| Componente | GPIO | Comportamento |
|------------|------|---------------|
| **Servo Porta Bagno** | P26 | Si apre (0° → 90°) quando `game_won = true` (vittoria globale) |
| **Servo Finestra** | P25 | Si chiude (30° → 0°) quando `ventola = done` |
| **Ventola Fisica** | P32 | Si attiva (LOW → HIGH) quando `ventola = done` |
| **LED Porta** | P4 (V), P16 (R) | Sistema globale - lampeggia quando bagno completato |
| **LED Specchio** | P17 (V), P5 (R), P33 (W) | Rosso → Verde+Bianco quando completato |
| **LED Porta-Finestra** | P18 (V), P19 (R) | Off → Rosso (active) → Verde (done) |
| **LED Ventola** | P21 (V), P22 (R) | Off → Rosso (active) → Verde (done) |
| **Sensore MAG1** | P23 | Trigger puzzle DOCCIA (magnete vicino = LOW) |

---

## 📱 PROSSIMO STEP: UPLOAD ESP32

### 1. File da Caricare

**File:** `escape-room-3d/esp32-bagno-RASPBERRY-COMPLETE/esp32-bagno-RASPBERRY-COMPLETE.ino`

**Configurazione WiFi:**
```cpp
const char* ssid = "escape";
const char* password = "";
const char* backend_url = "http://192.168.8.10:8001";
```

### 2. Arduino IDE Setup

- **Board:** ESP32 Dev Module
- **Upload Speed:** 115200
- **Flash Size:** 4MB
- **Port:** Seleziona porta seriale ESP32 bagno

### 3. Librerie Necessarie

- WiFi (built-in)
- HTTPClient (built-in)
- ArduinoJson (v6+)
- ESP32Servo

### 4. Upload Procedura

```bash
1. Apri Arduino IDE
2. File → Open → esp32-bagno-RASPBERRY-COMPLETE.ino
3. Tools → Board → ESP32 Dev Module
4. Tools → Port → /dev/cu.usbserial-XXXX
5. Click Upload
6. Apri Serial Monitor (115200 baud)
7. Verifica connessione WiFi
8. Verifica session ID fetch
9. Testa sensore MAG1 (avvicina magnete a P23)
```

### 5. Output Atteso Serial Monitor

```
================================================
ESP32 BAGNO - RASPBERRY PI - COMPLETE HARDWARE
================================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso) → ROSSO ✅
   LED SPECCHIO: P17/P5/P33 → ROSSO ✅
   LED PORTA-FINESTRA: P18/P19 → OFF
   LED VENTOLA: P21/P22 → OFF
   🧲 MAG1: P23 → ATTIVO
   🚪 SERVO PORTA: P26 → CONFIGURATO
   🌬️ SERVO FINESTRA: P25 → CONFIGURATO
   🌀 VENTOLA: P32 → SPENTA

📡 WiFi✅
IP: 192.168.8.XX

✅ Active session ID: 1005
🎯 Uso Session ID: 1005

✅ Sistema pronto!
🧲 Avvicina magnete a P23 per triggerare DOCCIA puzzle!
```

---

## 🎮 SEQUENZA GIOCO COMPLETA

### 1️⃣ Puzzle SPECCHIO (Frontend)
- Player avvicina allo specchio
- Countdown 5 secondi
- **Backend:** `specchio` → done, `doccia` → active
- **LED:** Specchio verde+bianco, Porta-Finestra rosso

### 2️⃣ Puzzle DOCCIA (MAG1 Sensor P23)
- Player avvicina magnete a P23
- ESP32: `POST /bathroom-puzzles/complete` con `{"puzzle_name":"doccia"}`
- **Backend:** `doccia` → done, `ventola` → active
- **LED:** Porta-Finestra verde, Ventola rosso

### 3️⃣ Puzzle VENTOLA (Frontend - Tasto K)
- Player chiude porta-finestra virtuale
- **Backend:** `ventola` → done
- **Hardware:**
  - Servo finestra P25: 30° → 0° (si chiude)
  - Ventola P32: LOW → HIGH (si attiva)
- **LED:** Ventola verde, LED Porta lampeggia 💚
- **Game:** Bagno completato!

### 4️⃣ VITTORIA (Tutte 4 stanze)
- Cucina + Camera + Bagno + Soggiorno completati
- **Backend:** `game_won = true`
- **Hardware:** Servo porta P26: 0° → 90° (si apre!)
- **LED:** LED Porta verde fisso ✅

---

## 🔧 TROUBLESHOOTING

### ESP32 Non Connette

```bash
# Verifica backend risponde
curl http://192.168.8.10:8001/api/sessions/active

# Verifica endpoint bagno
curl http://192.168.8.10:8001/api/sessions/{ID}/bathroom-puzzles/door-servo-status
```

### Endpoint 404

```bash
# Verifica file nel container
sshpass -p "escape" ssh pi@192.168.8.10 "docker exec escape-backend grep -n 'door-servo-status' /app/app/api/bathroom_puzzles.py"

# Se mancante, ri-copia file:
sshpass -p "escape" scp backend/app/api/bathroom_puzzles.py pi@192.168.8.10:/tmp/
sshpass -p "escape" ssh pi@192.168.8.10 "docker cp /tmp/bathroom_puzzles.py escape-backend:/app/app/api/"
sshpass -p "escape" ssh pi@192.168.8.10 "cd /home/pi/escape-room-3d && docker compose restart backend"
```

### Database Colonne Mancanti

```bash
# Verifica colonne
sshpass -p "escape" ssh pi@192.168.8.10 "docker exec escape-db psql -U escape_user escape_db -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'bathroom_puzzle_states' AND column_name LIKE '%servo%';\""

# Se mancanti, applica SQL:
sshpass -p "escape" ssh pi@192.168.8.10 "docker exec -i escape-db psql -U escape_user escape_db << 'EOSQL'
ALTER TABLE bathroom_puzzle_states ADD COLUMN IF NOT EXISTS door_servo_should_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bathroom_puzzle_states ADD COLUMN IF NOT EXISTS window_servo_should_close BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bathroom_puzzle_states ADD COLUMN IF NOT EXISTS fan_should_run BOOLEAN NOT NULL DEFAULT FALSE;
EOSQL
"
```

---

## 📊 FILE MODIFICATI

### Backend Files
- ✅ `backend/app/models/bathroom_puzzle.py` (3 Boolean columns)
- ✅ `backend/app/api/bathroom_puzzles.py` (3 nuovi endpoint)
- ✅ `backend/app/services/bathroom_puzzle_service.py` (hardware logic)

### ESP32 Files
- ✅ `esp32-bagno-RASPBERRY-COMPLETE/esp32-bagno-RASPBERRY-COMPLETE.ino` (codice completo)

### Documentation
- ✅ `ESP32_BAGNO_HARDWARE_COMPLETE_GUIDE.md` (guida completa)
- ✅ `DEPLOY_BAGNO_HARDWARE_COMPLETE.md` (questo file)

---

## 🎉 RISULTATO FINALE

✅ **Backend Endpoints:** 3/3 funzionanti  
✅ **Database Columns:** 3/3 aggiunte  
✅ **Service Logic:** Aggiornato  
✅ **Test Raspberry:** Tutti passati  
✅ **Documentazione:** Completa  

**Sistema bagno con hardware completo deployato e testato con successo sul Raspberry Pi!** 🚀

**Pronto per upload ESP32 e test finale hardware!**

---

## 📞 COMANDI RAPIDI

```bash
# Test endpoint (usa session ID corrente)
SESSION_ID=$(curl -s http://192.168.8.10:8001/api/sessions/active | jq -r '.id')
curl http://192.168.8.10:8001/api/sessions/$SESSION_ID/bathroom-puzzles/door-servo-status
curl http://192.168.8.10:8001/api/sessions/$SESSION_ID/bathroom-puzzles/window-servo-status
curl http://192.168.8.10:8001/api/sessions/$SESSION_ID/bathroom-puzzles/fan-status

# Riavvio backend Raspberry
sshpass -p "escape" ssh pi@192.168.8.10 "cd /home/pi/escape-room-3d && docker compose restart backend"

# Log backend Raspberry
sshpass -p "escape" ssh pi@192.168.8.10 "docker logs -f escape-backend --tail 50"

# SSH Raspberry
sshpass -p "escape" ssh pi@192.168.8.10
```

---

**Autore:** Cline AI Assistant  
**Versione:** 1.0 Final  
**Deploy Completato:** 17/01/2026 03:30 AM