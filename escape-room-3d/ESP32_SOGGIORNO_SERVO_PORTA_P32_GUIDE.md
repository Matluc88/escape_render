# 🚪 ESP32 Soggiorno - Servo Porta P32 - Guida Completa

## 📋 Panoramica

Sistema servo fisico su GPIO P32 che controlla la chiusura automatica della porta del soggiorno quando il puzzle del condizionatore viene completato.

**Specifiche:**
- **PIN**: P32 (GPIO 32)
- **Angolo iniziale**: 45° (porta aperta)
- **Angolo chiusura**: 90° (porta chiusa) - calibrabile
- **Trigger**: Completamento puzzle condizionatore (ultimo puzzle)
- **Reset**: Servo torna a 45° automaticamente al reset scena

---

## 🎯 Flusso Logico

```
1. Player completa TV puzzle (MAG1 P33) → Sblocca pianta
2. Player completa PIANTA puzzle (MAG2 P25) → Sblocca condizionatore
3. Player si avvicina alla porta → Appare dialog "Chiudi porta?"
4. Player clicca "SI" nel dialog →
   ✅ Backend: condizionatore completato
   ✅ Backend: door_servo_should_close = TRUE
   ✅ Porta virtuale si chiude (angolo 0°)
   ✅ LED porta inizia lampeggiare verde
   
5. ESP32 polla endpoint ogni 2s →
   ✅ Rileva should_close_servo = true
   ✅ Servo P32 muove a 90°
   ✅ Porta fisica si chiude!

6. Al reset scena (tasto R) →
   ✅ Backend: door_servo_should_close = FALSE
   ✅ ESP32 rileva cambiamento
   ✅ Servo P32 torna a 45°
   ✅ Porta fisica riaperta!
```

---

## 📁 File Modificati

### 1. **Backend - Database Model**
**File**: `backend/app/models/livingroom_puzzle.py`

```python
# Aggiunto campo Boolean
door_servo_should_close = Column(Boolean, default=False, nullable=False)
```

### 2. **Backend - Migration Alembic**
**File**: `backend/alembic/versions/013_add_livingroom_door_servo.py`

```python
def upgrade():
    op.add_column(
        'livingroom_puzzle_states',
        sa.Column('door_servo_should_close', sa.Boolean(), 
                  nullable=False, server_default='false')
    )
```

**Applicare migration:**
```bash
cd escape-room-3d/backend
alembic upgrade head
```

### 3. **Backend - API Endpoint**
**File**: `backend/app/api/livingroom_puzzles.py`

```python
@router.get("/sessions/{session_id}/livingroom-puzzles/door-servo-status")
async def get_door_servo_status(session_id: int, db: Session = Depends(get_db)):
    puzzle = LivingRoomPuzzleService.get_or_create(db, session_id)
    return {
        "should_close_servo": puzzle.door_servo_should_close,
        "condizionatore_status": puzzle.condizionatore_status
    }
```

**Endpoint ESP32**: 
```
GET http://192.168.8.10:8001/api/sessions/{session_id}/livingroom-puzzles/door-servo-status
```

**Response:**
```json
{
  "should_close_servo": true,
  "condizionatore_status": "completed"
}
```

### 4. **Backend - Service Logic**
**File**: `backend/app/services/livingroom_puzzle_service.py`

```python
# In complete_condizionatore():
puzzle.door_servo_should_close = True  # ← Attiva servo

# In reset_puzzles():
puzzle.door_servo_should_close = False  # ← Reset servo (riapre)
```

### 5. **ESP32 - Arduino Code**
**File**: `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`

```cpp
#include <ESP32Servo.h>

#define SERVO_DOOR_PIN 32
Servo servoDoor;
bool servoDoorClosed = false;

void setup() {
  servoDoor.attach(SERVO_DOOR_PIN);
  servoDoor.write(45);  // Posizione iniziale
  servoDoorClosed = false;
}

void checkDoorServoStatus() {
  // Polling ogni 2 secondi
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/livingroom-puzzles/door-servo-status";
  String response = getHTTP(endpoint.c_str());
  
  StaticJsonDocument<512> doc;
  deserializeJson(doc, response);
  bool shouldClose = doc["should_close_servo"];
  
  if (shouldClose && !servoDoorClosed) {
    // CHIUDI
    servoDoor.write(90);
    servoDoorClosed = true;
    Serial.println("🚪 Porta CHIUSA");
  } 
  else if (!shouldClose && servoDoorClosed) {
    // RIAPRI
    servoDoor.write(45);
    servoDoorClosed = false;
    Serial.println("🚪 Porta RIAPERTA");
  }
}

void loop() {
  checkDoorServoStatus();  // Chiamato nel loop
  delay(100);
}
```

---

## 🔧 Hardware Setup

### Collegamento Servo
```
Servo SG90/MG90S o compatibile:
- VCC (rosso)    → 5V ESP32
- GND (marrone)  → GND ESP32
- SIGNAL (arancione) → GPIO 32 (P32)
```

### Calibrazione Angoli
Se il servo non si muove correttamente:

1. **Test manuale** - Aggiungi nel `setup()`:
```cpp
servoDoor.write(0);    // Test posizione minima
delay(1000);
servoDoor.write(90);   // Test posizione media
delay(1000);
servoDoor.write(180);  // Test posizione massima
delay(1000);
servoDoor.write(45);   // Torna a posizione iniziale
```

2. **Regola angoli** nel codice:
```cpp
// Posizione aperta (modifica se necessario)
servoDoor.write(45);   // ← CALIBRA QUI

// Posizione chiusa (modifica se necessario)
servoDoor.write(90);   // ← CALIBRA QUI
```

---

## 🧪 Testing

### Test Sequenza Completa

1. **Reset scena** (tasto R nel gioco):
   ```
   ✅ Porta virtuale torna aperta (30°)
   ✅ Servo torna a 45°
   ✅ LED tutti resettati
   ```

2. **Completa TV** (MAG1 su P33):
   ```
   ✅ TV si accende verde
   ✅ LED Pianta diventa rosso
   ```

3. **Completa Pianta** (MAG2 su P25):
   ```
   ✅ Pianta si muove
   ✅ LED Pianta diventa verde
   ✅ LED Condizionatore diventa rosso
   ```

4. **Avvicinati alla porta**:
   ```
   ✅ Appare dialog "Chiudi porta?"
   ```

5. **Clicca "SI"**:
   ```
   ✅ Porta virtuale si chiude (0°)
   ✅ LED Condizionatore diventa verde
   ✅ LED Porta inizia lampeggiare
   ✅ Dopo max 2s: Servo P32 chiude porta fisica (90°)
   ```

6. **Reset scena** (tasto R):
   ```
   ✅ Servo P32 riapre porta (45°)
   ✅ Tutto torna allo stato iniziale
   ```

### Verifica Servo con Serial Monitor

Collega ESP32 via USB e apri Serial Monitor (115200 baud):

```
🚪 ===== SERVO PORTA: CHIUSURA =====
   Condizionatore completato!
   Movimento servo: 45° → 90°
   ✅ Porta fisica CHIUSA
====================================

🚪 ===== SERVO PORTA: APERTURA =====
   Reset scena rilevato!
   Movimento servo: 90° → 45°
   ✅ Porta fisica RIAPERTA (45°)
====================================
```

---

## 📡 API Testing con curl

### 1. Controlla stato servo
```bash
curl http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/door-servo-status
```

**Response (porta aperta):**
```json
{
  "should_close_servo": false,
  "condizionatore_status": "locked"
}
```

### 2. Simula completamento condizionatore
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/condizionatore/complete \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Verifica flag servo attivato
```bash
curl http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/door-servo-status
```

**Response (porta chiusa):**
```json
{
  "should_close_servo": true,
  "condizionatore_status": "completed"
}
```

### 4. Reset scena
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/reset \
  -H "Content-Type: application/json" \
  -d '{"level": "full"}'
```

---

## 🐛 Troubleshooting

### Servo non si muove

1. **Verifica alimentazione**:
   - Servo richiede 5V e può assorbire fino a 1A
   - Usa alimentazione esterna se ESP32 non fornisce abbastanza corrente

2. **Verifica pin**:
   ```cpp
   Serial.println(SERVO_DOOR_PIN);  // Deve stampare: 32
   ```

3. **Test manuale**:
   ```cpp
   void loop() {
     servoDoor.write(45);
     delay(2000);
     servoDoor.write(90);
     delay(2000);
   }
   ```

### Servo si muove ma angoli sbagliati

**Soluzione**: Calibra angoli nel codice:
```cpp
// Aperta - prova valori tra 30-60
servoDoor.write(45);

// Chiusa - prova valori tra 80-100
servoDoor.write(90);
```

### Servo si muove a scatti

**Cause possibili**:
- Alimentazione insufficiente → Usa alimentatore esterno 5V 2A
- Interferenze WiFi → Aggiungi condensatore 100µF tra VCC e GND del servo

### Backend non aggiorna flag

**Verifica database**:
```sql
SELECT session_id, door_servo_should_close FROM livingroom_puzzle_states;
```

**Applica migration se manca colonna**:
```bash
cd backend
alembic upgrade head
```

---

## 📊 Pattern Utilizzato

Questo sistema segue lo stesso pattern del **servo frigo cucina** (P26):

| Componente | Cucina (Frigo) | Soggiorno (Porta) |
|------------|----------------|-------------------|
| GPIO | P26 | P32 |
| Angolo aperto | 0° | 45° |
| Angolo chiuso | 90° | 90° |
| Trigger | Frigo completato | Condizionatore completato |
| Endpoint | `/kitchen-puzzles/frigo/servo-state` | `/livingroom-puzzles/door-servo-status` |
| Campo DB | N/A (usa puzzle state) | `door_servo_should_close` |
| Reset | Auto al reset | Auto al reset |

---

## ✅ Checklist Deployment

- [ ] Migration Alembic applicata (`alembic upgrade head`)
- [ ] Backend riavviato
- [ ] ESP32 flashato con nuovo codice
- [ ] Servo collegato su P32
- [ ] Test sequenza completa funzionante
- [ ] Test reset funzionante
- [ ] Angoli calibrati correttamente

---

## 📝 Note Implementazione

- **Pattern polling**: ESP32 polla endpoint ogni 2 secondi (efficiente, no websocket necessari)
- **Debouncing**: Flag `servoDoorClosed` evita movimenti ripetuti
- **Auto-reset**: Servo torna automaticamente a 45° al reset scena
- **Calibrazione**: Angoli modificabili nel codice ESP32 senza toccare backend
- **Compatibilità**: Sistema compatibile con servo SG90, MG90S, e simili (180° range)

---

## 🎓 Pattern Riutilizzabile

Questo sistema può essere replicato per altri servo:

1. Aggiungi campo Boolean al modello database
2. Crea migration Alembic
3. Aggiungi endpoint GET `/servo-status`
4. Aggiorna service per impostare flag
5. Aggiungi polling ESP32
6. Collega servo e calibra angoli

**Esempio per porta camera**:
```cpp
#define SERVO_BEDROOM_DOOR_PIN 27
Servo servoBedroomDoor;
// ... stesso pattern
```

---

## 📧 Supporto

Per problemi o domande:
- Verifica log ESP32 (Serial Monitor 115200 baud)
- Controlla stato database con query SQL
- Testa endpoint con curl
- Verifica alimentazione servo

**Ultima modifica**: 15/01/2026
**Versione**: 1.0.0
**Autore**: Sistema Auto-documentato