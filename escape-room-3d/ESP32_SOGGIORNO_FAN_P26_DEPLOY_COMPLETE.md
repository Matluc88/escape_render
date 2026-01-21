# 🌀 ESP32 Soggiorno - Sistema Ventola P26 - Deploy Completo

**Data:** 15 Gennaio 2026  
**Versione:** 1.0 - Deployment Production Ready  
**Sistema:** Ventola fisica controllata da GPIO P26

---

## 📋 Sommario Deploy

✅ **Backend Database Migration** - Completato  
✅ **Backend API Endpoint** - Testato e funzionante  
✅ **ESP32 Firmware** - Pronto per upload  
⏳ **Upload Firmware ESP32** - Da completare

---

## 🎯 Funzionalità Implementata

### Sistema Ventola GPIO P26
La ventola fisica si attiva automaticamente quando il puzzle del condizionatore viene completato nel soggiorno.

**Comportamento:**
- **Condizionatore completato** → Ventola ON (P26 HIGH)
- **Reset scena** → Ventola OFF (P26 LOW)
- **Polling ESP32** → Ogni 2 secondi controlla stato ventola

---

## 📦 File Modificati/Creati

### Backend

#### 1. **backend/app/models/livingroom_puzzle.py**
```python
# Aggiunto campo per controllo ventola
fan_should_run = Column(Boolean, default=False, nullable=False)
```

#### 2. **backend/app/services/livingroom_puzzle_service.py**
```python
# In complete_condizionatore()
puzzle.fan_should_run = True
logger.info("🌀 Fan activated (P26 will start running)")

# In reset_puzzles()
puzzle.fan_should_run = False
logger.info("🌀 Fan stopped (P26 will turn off)")
```

#### 3. **backend/app/api/livingroom_puzzles.py**
```python
@router.get("/sessions/{session_id}/livingroom-puzzles/fan-status")
async def get_fan_status(session_id: int, db: Session = Depends(get_db)):
    """ESP32 polling endpoint per controllo ventola P26"""
    puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
    return {
        "should_run_fan": puzzle.fan_should_run,
        "condizionatore_status": puzzle.condizionatore_status
    }
```

#### 4. **backend/alembic/versions/014_add_livingroom_fan.py**
Migration per aggiungere campo `fan_should_run` al database.

### ESP32 Firmware

#### **esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino**

**Pin aggiunti:**
```cpp
#define FAN_PIN 26          // P26 - Controllo ventola fisica
bool fanRunning = false;    // Stato corrente ventola
```

**Setup:**
```cpp
pinMode(FAN_PIN, OUTPUT);
digitalWrite(FAN_PIN, LOW);  // Ventola inizialmente spenta
```

**Loop - Polling ventola:**
```cpp
void checkFanStatus() {
  // Polling ogni 2 secondi
  String endpoint = "/api/sessions/" + String(session_id) + 
                   "/livingroom-puzzles/fan-status";
  String response = getHTTP(endpoint.c_str());
  
  // Parse JSON
  bool shouldRun = doc["should_run_fan"];
  
  // Attiva/disattiva ventola
  if (shouldRun && !fanRunning) {
    digitalWrite(FAN_PIN, HIGH);  // Attiva ventola
    fanRunning = true;
  } else if (!shouldRun && fanRunning) {
    digitalWrite(FAN_PIN, LOW);   // Spegni ventola
    fanRunning = false;
  }
}
```

---

## 🚀 Procedura Deploy Completata

### 1. ✅ Transfer File Backend
```bash
# Trasferiti su Raspberry Pi (192.168.8.10)
scp backend/app/models/livingroom_puzzle.py pi@192.168.8.10:/home/pi/escape-room-3d/backend/app/models/
scp backend/app/services/livingroom_puzzle_service.py pi@192.168.8.10:/home/pi/escape-room-3d/backend/app/services/
scp backend/app/api/livingroom_puzzles.py pi@192.168.8.10:/home/pi/escape-room-3d/backend/app/api/
scp backend/alembic/versions/014_add_livingroom_fan.py pi@192.168.8.10:/home/pi/escape-room-3d/backend/alembic/versions/
```

### 2. ✅ Migration Database
```bash
# Copiato file migration nel container Docker
docker cp /home/pi/escape-room-3d/backend/alembic/versions/014_add_livingroom_fan.py \
  escape-backend:/app/alembic/versions/

# Applicato migration
docker compose exec backend alembic upgrade head
```

**Output:**
```
✅ Migration 014: Added fan_should_run to livingroom_puzzle_states
INFO  [alembic.runtime.migration] Running upgrade 013_add_livingroom_door_servo -> 014_add_livingroom_fan
```

### 3. ✅ Restart Backend
```bash
docker compose restart backend
```

### 4. ✅ Test Endpoint
```bash
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/fan-status
```

**Risposta:**
```json
{
  "should_run_fan": false,
  "condizionatore_status": "locked"
}
```

---

## 📱 Upload Firmware ESP32

### Prerequisiti
- Arduino IDE installato
- Board ESP32 configurata
- ESP32 collegato via USB

### Procedura Upload

1. **Apri Arduino IDE**

2. **Carica il file .ino:**
   ```
   File → Apri → esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino
   ```

3. **Seleziona board:**
   ```
   Tools → Board → ESP32 Arduino → ESP32 Dev Module
   ```

4. **Seleziona porta:**
   ```
   Tools → Port → /dev/cu.usbserial-XXXX (o COM port su Windows)
   ```

5. **Upload:**
   ```
   Sketch → Upload
   ```
   oppure premi `⌘+U` (Mac) / `Ctrl+U` (Windows)

6. **Verifica upload:**
   Apri Serial Monitor (`Tools → Serial Monitor`) e controlla:
   ```
   ✅ WiFi connesso!
   🎯 Uso Session ID: 1032
   🌀 Ventola P26 pronta per avviarsi al completamento!
   ```

---

## 🧪 Testing Sistema

### Test 1: Stato Iniziale
```bash
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/fan-status
```
**Atteso:** `{"should_run_fan":false,"condizionatore_status":"locked"}`

### Test 2: Completa Condizionatore (simula via API)
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/condizionatore/complete \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test 3: Verifica Ventola Attivata
```bash
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/fan-status
```
**Atteso:** `{"should_run_fan":true,"condizionatore_status":"completed"}`

### Test 4: Verifica ESP32
Controlla Serial Monitor:
```
🌀 ===== VENTOLA: AVVIO =====
   Condizionatore completato!
   GPIO P26: LOW → HIGH
   ✅ Ventola fisica AVVIATA
```

### Test 5: Reset Scena
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/reset \
  -H "Content-Type: application/json" \
  -d '{"level":"full"}'
```

### Test 6: Verifica Ventola Spenta
```bash
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/fan-status
```
**Atteso:** `{"should_run_fan":false,"condizionatore_status":"locked"}`

ESP32 Serial Monitor:
```
🌀 ===== VENTOLA: STOP =====
   Reset scena rilevato!
   GPIO P26: HIGH → LOW
   ✅ Ventola fisica FERMATA
```

---

## 🔧 Troubleshooting

### Problema: Endpoint ritorna 404
**Soluzione:**
```bash
# Riavvia backend
docker compose restart backend

# Verifica logs
docker compose logs backend --tail=50
```

### Problema: ESP32 non si connette al WiFi
**Soluzione:**
1. Verifica password WiFi nel codice: `password = "";`
2. Controlla che rete "escape" sia attiva
3. Riavvia ESP32

### Problema: Ventola non si attiva
**Soluzione:**
1. Verifica cablaggio GPIO P26
2. Controlla Serial Monitor per errori HTTP
3. Testa endpoint manualmente con curl
4. Verifica che `fan_should_run` sia `true` nel database

### Problema: Migration già applicata
**Output:** `INFO  [alembic.runtime.migration] Will assume transactional DDL.`  
**Causa:** Migration già applicata o database già aggiornato  
**Soluzione:** Nessuna azione necessaria, il sistema è aggiornato

---

## 📊 Architettura Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Three.js)            │
│              Click su Condizionatore 3D                 │
└────────────────────┬────────────────────────────────────┘
                     │ POST /condizionatore/complete
                     ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (FastAPI + PostgreSQL)             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  LivingRoomPuzzleService.complete_condizionatore│   │
│  │  • puzzle.fan_should_run = True                 │   │
│  │  • db.commit()                                  │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Polling ogni 2s
                     │ GET /fan-status
                     ▼
┌─────────────────────────────────────────────────────────┐
│           ESP32 SOGGIORNO (GPIO P26)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  checkFanStatus()                               │   │
│  │  • Parse JSON: should_run_fan                   │   │
│  │  • if true → digitalWrite(P26, HIGH)            │   │
│  │  • if false → digitalWrite(P26, LOW)            │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   VENTOLA    │
              │  FISICA P26  │
              │   ON/OFF     │
              └──────────────┘
```

---

## 📝 Note Importanti

1. **Session ID dinamico:** L'ESP32 recupera automaticamente l'active session all'avvio
2. **Polling 2 secondi:** Bilanciamento tra reattività e carico rete
3. **Debouncing:** Evita toggle ripetuti della ventola
4. **Reset sicuro:** La ventola si spegne sempre al reset scena
5. **Logging completo:** Tutti gli eventi sono loggati sia su backend che ESP32

---

## ✅ Checklist Deploy

- [x] File backend trasferiti su Raspberry Pi
- [x] Migration 014 applicata al database
- [x] Backend riavviato e funzionante
- [x] Endpoint `/fan-status` testato e funzionante
- [x] Firmware ESP32 aggiornato e pronto
- [ ] **Firmware uploadato su ESP32 fisico**
- [ ] **Test end-to-end con hardware reale**

---

## 🎉 Deploy Status

**Backend:** ✅ **COMPLETO E FUNZIONANTE**  
**Database:** ✅ **MIGRAZIONE APPLICATA**  
**Endpoint:** ✅ **TESTATO CON SUCCESSO**  
**Firmware:** ⏳ **PRONTO PER UPLOAD**

---

## 📞 Supporto

Per problemi o domande sul sistema ventola:
- Controlla logs: `docker compose logs backend --tail=100`
- Verifica Serial Monitor ESP32
- Testa endpoint manualmente con curl
- Verifica stato database: `should_run_fan` in `livingroom_puzzle_states`

---

**Creato:** 15 Gennaio 2026, 18:06  
**Ultimo aggiornamento:** Deploy backend completato con successo  
**Prossimo step:** Upload firmware ESP32 su hardware fisico