# ESP32 Soggiorno - Ventola P26 - Guida Completa

## 📋 Panoramica

Sistema di controllo ventola fisica su GPIO P26 nell'ESP32 del soggiorno.
La ventola si attiva automaticamente quando il puzzle del condizionatore viene completato.

## 🔧 Hardware

- **GPIO P26**: Controllo ventola fisica
- **Logica**: HIGH = ventola ON, LOW = ventola OFF
- **Trigger**: Completamento puzzle condizionatore (ultimo enigma soggiorno)

## 🎯 Flusso Operativo

### Sequenza Normale
1. Giocatore completa puzzle condizionatore (click in gioco)
2. Backend imposta `fan_should_run = True` nel database
3. ESP32 polling ogni 2 secondi rileva il cambiamento
4. ESP32 attiva GPIO P26 (HIGH)
5. Ventola fisica si avvia

### Al Reset Scena
1. Admin resetta puzzles soggiorno
2. Backend imposta `fan_should_run = False`
3. ESP32 polling rileva il cambiamento
4. ESP32 disattiva GPIO P26 (LOW)
5. Ventola fisica si ferma

## 📡 Architettura

### Backend
**File modificati:**
- `backend/app/models/livingroom_puzzle.py` - Aggiunto campo `fan_should_run`
- `backend/app/services/livingroom_puzzle_service.py` - Logica attivazione/reset
- `backend/app/api/livingroom_puzzles.py` - Endpoint polling `/fan-status`

**Nuovo Endpoint:**
```
GET /api/sessions/{session_id}/livingroom-puzzles/fan-status

Response:
{
  "should_run_fan": true/false,
  "condizionatore_status": "active/completed"
}
```

### ESP32
**File modificato:**
- `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`

**Nuove funzionalità:**
- `checkFanStatus()` - Polling ogni 2 secondi
- `FAN_PIN` (26) - Definizione pin
- `fanRunning` - State tracking

### Database
**Migration 014:**
```sql
ALTER TABLE livingroom_puzzle_states 
ADD COLUMN fan_should_run BOOLEAN NOT NULL DEFAULT false;
```

## 🚀 Procedura Deploy

### 1. Backend (Raspberry Pi)

```bash
# SSH al Raspberry Pi
ssh pi@192.168.8.10

# Entra nel container backend
cd /home/pi/escape-room-3d
docker-compose exec backend bash

# Applica migration
alembic upgrade head

# Verifica migration
alembic current
# Output atteso: 014 (head)

# Exit dal container
exit
```

### 2. ESP32 (Soggiorno)

```bash
# Sul Mac, compila e carica firmware
cd escape-room-3d/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX

# Apri con Arduino IDE o PlatformIO
# Seleziona porta seriale corretta
# Upload firmware

# Verifica serial monitor:
# - 🌀 VENTOLA: P26 → SPENTA (iniziale)
# - Dopo completamento condizionatore: "✅ Ventola fisica AVVIATA"
```

### 3. Test Sistema

#### Test Funzionale
```bash
# 1. Crea/attiva sessione di gioco
curl http://192.168.8.10:8001/api/sessions

# 2. Completa puzzle condizionatore (tramite gioco o API)
curl -X POST http://192.168.8.10:8001/api/sessions/1/livingroom-puzzles/condizionatore/complete \
  -H "Content-Type: application/json"

# 3. Verifica stato ventola
curl http://192.168.8.10:8001/api/sessions/1/livingroom-puzzles/fan-status

# Output atteso:
# {"should_run_fan":true,"condizionatore_status":"completed"}

# 4. Verifica GPIO P26 su ESP32 (serial monitor)
# Output atteso: "🌀 VENTOLA: AVVIO" + "GPIO P26: LOW → HIGH"
```

#### Test Reset
```bash
# Reset puzzles soggiorno
curl -X POST http://192.168.8.10:8001/api/sessions/1/livingroom-puzzles/reset

# Verifica ventola si ferma
curl http://192.168.8.10:8001/api/sessions/1/livingroom-puzzles/fan-status

# Output atteso:
# {"should_run_fan":false,"condizionatore_status":"locked"}
```

## 🐛 Troubleshooting

### Ventola non si avvia
1. **Verifica database:**
   ```bash
   docker-compose exec backend bash
   python3 -c "
   from app.database import SessionLocal
   from app.models.livingroom_puzzle import LivingRoomPuzzleState
   db = SessionLocal()
   puzzle = db.query(LivingRoomPuzzleState).filter_by(session_id=1).first()
   print(f'fan_should_run: {puzzle.fan_should_run}')
   db.close()
   "
   ```

2. **Verifica ESP32 polling:**
   - Controlla serial monitor
   - Cerca: "📡 GET .../fan-status"
   - Verifica response JSON

3. **Verifica GPIO:**
   - LED test: collega LED a P26 + resistenza
   - Dovrebbe accendersi quando ventola attiva

### Ventola non si ferma al reset
1. Verifica backend reset:
   ```bash
   # Log backend
   docker-compose logs backend | grep "Fan stopped"
   ```

2. Verifica ESP32 riceve aggiornamento:
   - Serial monitor: "🌀 VENTOLA: STOP"
   - Verifica polling attivo (ogni 2s)

### HTTP 500 su endpoint fan-status
1. Verifica migration applicata:
   ```bash
   docker-compose exec backend alembic current
   # Deve mostrare: 014 (head)
   ```

2. Se migration mancante:
   ```bash
   docker-compose exec backend alembic upgrade head
   docker-compose restart backend
   ```

## 📊 Monitoraggio

### Serial Monitor ESP32
Status ogni 10 secondi include:
```
🌀 VENTOLA (P26):
   Status: ON (RUNNING) ✅ / OFF
   GPIO: HIGH / LOW
```

### Backend Logs
```bash
# Attivazione ventola
docker-compose logs backend | grep "Fan activated"

# Reset ventola
docker-compose logs backend | grep "Fan stopped"
```

## 🔒 Note Sicurezza

- **Polarità ventola**: Verificare cablaggio corretto (+ e -)
- **Corrente**: GPIO ESP32 max 40mA - usare relay/transistor per ventole potenti
- **Protezione**: Considerare diodo flyback per protezione da spike induttivi
- **Temperatura**: Verificare che ventola non surriscaldi

## 📝 Changelog

**v1.0 - 2026-01-15**
- ✅ Implementato sistema ventola P26
- ✅ Polling endpoint `/fan-status`
- ✅ Migration 014 database
- ✅ Integrazione con puzzle condizionatore
- ✅ Auto-reset al reset scena

## 🔗 File Correlati

- `backend/app/models/livingroom_puzzle.py`
- `backend/app/services/livingroom_puzzle_service.py`
- `backend/app/api/livingroom_puzzles.py`
- `backend/alembic/versions/014_add_livingroom_fan.py`
- `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/*.ino`

## 🎯 Pattern Simile

Questo sistema segue lo stesso pattern del servo porta (P32):
- Polling HTTP ogni 2 secondi
- Flag booleano nel database
- State tracking locale ESP32
- Auto-sync bidirezionale (attivazione/reset)

Può essere replicato per altri attuatori fisici seguendo lo stesso schema.