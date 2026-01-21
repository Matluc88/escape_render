# 🚪 ESP32 Soggiorno - Servo Porta P32 - Deploy Guide

## 📋 Riepilogo Sistema

### Sistema Implementato
- **Servo GPIO**: P32
- **Funzione**: Controllo porta fisica soggiorno
- **Trigger**: Completamento puzzle condizionatore
- **Angoli**:
  - 45° = Porta aperta (default)
  - 90° = Porta chiusa (completamento puzzle)
- **Pattern**: Polling HTTP (ogni 2s)
- **Auto-reset**: Porta si riapre automaticamente al reset scena

---

## 🗂️ File Modificati

### Backend
1. **`backend/app/models/livingroom_puzzle.py`**
   - Aggiunto campo: `door_servo_should_close = Column(Boolean, default=False)`

2. **`backend/alembic/versions/013_add_livingroom_door_servo.py`**
   - Migration per aggiungere campo al database

3. **`backend/app/api/livingroom_puzzles.py`**
   - Nuovo endpoint: `GET /api/sessions/{session_id}/livingroom-puzzles/door-servo-status`
   - Ritorna: `{"should_close_servo": bool, "condizionatore_status": string}`

4. **`backend/app/services/livingroom_puzzle_service.py`**
   - `complete_condizionatore()`: Imposta `door_servo_should_close = True`
   - `reset_puzzles()`: Imposta `door_servo_should_close = False`

### ESP32
5. **`esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`**
   - Libreria: `ESP32Servo.h`
   - Servo su GPIO 32
   - Funzione: `checkDoorServoStatus()` polling ogni 2s
   - Angolo apertura: 45°
   - Angolo chiusura: 90°

---

## 🚀 Deploy Automatico con sshpass

### Script Disponibili

#### 1. Deploy Automatico (Consigliato)
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
./deploy-servo-p32-auto.sh
```

**Cosa fa:**
- ✅ Test connessione Raspberry Pi
- ✅ Trasferimento file via SCP con sshpass
- ✅ Backup file esistenti
- ✅ Estrazione e posizionamento file
- ✅ Applicazione migration 013
- ✅ Riavvio backend
- ✅ Test endpoint automatico
- ✅ Verifica migration database

**Requisiti:**
- `sshpass` installato (già presente: `/opt/homebrew/bin/sshpass`)
- Password Raspberry Pi

#### 2. Deploy Manuale (Alternativo)
Segui la guida: `DEPLOY_SERVO_P32_MANUAL_STEPS.md`

---

## 🔧 Configurazione

### Raspberry Pi
- **IP**: 192.168.8.10
- **User**: pi
- **Path**: /home/pi/escape-room-3d

### Endpoint
- **URL**: `http://192.168.8.10:8001/api/sessions/{session_id}/livingroom-puzzles/door-servo-status`
- **Metodo**: GET
- **Response**: 
  ```json
  {
    "should_close_servo": false,
    "condizionatore_status": "completed"
  }
  ```

### ESP32
- **WiFi**: EscapeRoom (o rete configurata)
- **Backend**: http://192.168.8.10:8001
- **Polling Interval**: 2000ms (2 secondi)
- **GPIO**: 32
- **Servo Type**: SG90 o MG90S

---

## ✅ Test e Verifica

### 1. Test Backend Locale
```bash
# Test endpoint localmente
curl http://localhost:8001/api/sessions/999/livingroom-puzzles/door-servo-status

# Output atteso:
# {"should_close_servo":false,"condizionatore_status":"..."}
```

### 2. Test Backend Raspberry Pi
```bash
# Test endpoint su Raspberry Pi
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/door-servo-status

# Output atteso:
# {"should_close_servo":false,"condizionatore_status":"..."}
```

### 3. Test Migration
```bash
# SSH su Raspberry Pi
ssh pi@192.168.8.10

# Verifica migration applicata
cd /home/pi/escape-room-3d
docker compose exec backend alembic current

# Output atteso:
# 013_add_livingroom_door_servo (head)
```

### 4. Test Database
```bash
# Verifica campo nel database
docker compose exec db psql -U escape_user -d escape_room_db \
  -c "SELECT session_id, door_servo_should_close FROM livingroom_puzzle_states LIMIT 5;"
```

### 5. Test ESP32
**Dopo aver flashato l'ESP32:**

1. Apri Serial Monitor (115200 baud)
2. Verifica logs:
   ```
   ✅ WiFi connesso!
   ✅ IP: 192.168.8.11
   ✅ Backend: http://192.168.8.10:8001
   ✅ Active session ID: 1032
   ⚙️ Door servo status: should_close_servo=false
   🚪 Door servo at 45° (open)
   ```

3. Completa puzzle condizionatore da frontend
4. Verifica logs ESP32:
   ```
   ⚙️ Door servo status: should_close_servo=true
   🚪 Closing door to 90°
   ```

5. Reset scena da admin
6. Verifica logs ESP32:
   ```
   ⚙️ Door servo status: should_close_servo=false
   🚪 Opening door to 45°
   ```

---

## 📱 Flash ESP32

### Procedura
1. **Apri Arduino IDE**
2. **Carica sketch**: 
   ```
   escape-room-3d/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino
   ```
3. **Seleziona Board**: ESP32 Dev Module
4. **Seleziona Porta**: Porta USB ESP32 soggiorno
5. **Upload** ⬆️
6. **Apri Serial Monitor** (115200 baud)

### Verifica Connessione
- WiFi connesso ✅
- IP assegnato ✅
- Backend raggiungibile ✅
- Session ID ottenuto ✅
- Polling servo funzionante ✅

---

## 🔄 Workflow Completo

### Scenario Normale

1. **Giocatore entra in soggiorno**
   - Porta fisica aperta (servo a 45°)
   - ESP32 polling endpoint ogni 2s
   - Backend risponde: `should_close_servo=false`

2. **Giocatore completa puzzle condizionatore**
   - Frontend chiama: `POST /api/sessions/{id}/livingroom-puzzles/condizionatore/complete`
   - Backend imposta: `door_servo_should_close = True`
   - ESP32 rileva cambio al prossimo polling
   - Servo si muove a 90° (porta chiusa)

3. **Admin reset scena**
   - Frontend chiama: `POST /api/sessions/{id}/livingroom-puzzles/reset`
   - Backend imposta: `door_servo_should_close = False`
   - ESP32 rileva cambio al prossimo polling
   - Servo torna a 45° (porta aperta)

---

## 🛠️ Troubleshooting

### ❌ Endpoint 404 su Raspberry Pi

```bash
# Verifica file aggiornati
ssh pi@192.168.8.10
ls -lh /home/pi/escape-room-3d/backend/app/api/livingroom_puzzles.py

# Riavvia backend
cd /home/pi/escape-room-3d
docker compose restart backend

# Verifica logs
docker compose logs backend --tail=50 | grep livingroom
```

### ❌ Migration non applicata

```bash
# Forza upgrade
cd /home/pi/escape-room-3d
docker compose exec backend alembic upgrade head

# Verifica stato
docker compose exec backend alembic current
```

### ❌ ESP32 non muove servo

1. Verifica alimentazione servo (5V/GND)
2. Verifica connessione GPIO 32
3. Verifica libreria ESP32Servo installata
4. Controlla Serial Monitor per errori
5. Test manuale servo:
   ```cpp
   doorServo.write(45);  // Test apertura
   delay(2000);
   doorServo.write(90);  // Test chiusura
   ```

### ❌ ESP32 non connette a backend

1. Verifica WiFi credentials
2. Ping backend: `ping 192.168.8.10`
3. Test endpoint manualmente:
   ```bash
   curl http://192.168.8.10:8001/api/sessions/active
   ```
4. Verifica firewall Raspberry Pi

---

## 📊 Checklist Deploy Completo

### Backend
- [x] File aggiornati preparati
- [ ] File trasferiti su Raspberry Pi
- [ ] Backup creato
- [ ] Migration 013 applicata
- [ ] Backend riavviato
- [ ] Endpoint risponde correttamente
- [ ] Database contiene campo door_servo_should_close

### ESP32
- [ ] Codice aggiornato con servo P32
- [ ] Libreria ESP32Servo installata
- [ ] Servo collegato a GPIO 32
- [ ] ESP32 flashato
- [ ] WiFi connesso
- [ ] Backend raggiungibile
- [ ] Polling endpoint funziona
- [ ] Servo si muove correttamente

### Test Integrazione
- [ ] Puzzle condizionatore completabile
- [ ] Servo chiude porta al completamento
- [ ] Reset scena riapre porta
- [ ] Serial Monitor mostra logs corretti
- [ ] Nessun errore in backend logs

---

## 📝 Note Finali

### File di Backup
- Backup pre-deployment: `/home/pi/escape-room-3d/backups/pre-servo-p32/`
- Contiene file originali prima dell'aggiornamento

### Rollback (se necessario)
```bash
ssh pi@192.168.8.10
cd /home/pi/escape-room-3d

# Ripristina file originali
cp backups/pre-servo-p32/livingroom_puzzle.py backend/app/models/
cp backups/pre-servo-p32/livingroom_puzzles.py backend/app/api/
cp backups/pre-servo-p32/livingroom_puzzle_service.py backend/app/services/

# Riavvia backend
docker compose restart backend
```

### Documentazione Correlata
- `ESP32_SOGGIORNO_SERVO_PORTA_P32_GUIDE.md` - Guida completa sistema servo
- `DEPLOY_SERVO_P32_MANUAL_STEPS.md` - Deploy manuale passo-passo
- `ESP32_SOGGIORNO_MAG1_SENSOR_GUIDE.md` - Configurazione ESP32 soggiorno
- `LIVINGROOM_LED_SYSTEM_COMPLETE.md` - Sistema LED soggiorno

---

**Data Deploy**: 15 Gennaio 2026  
**Versione Backend**: Con migration 013  
**Versione ESP32**: Con servo P32 support  
**Status**: ✅ Pronto per deployment

---

🚀 **Buon deployment!**