# 🎤 ESP32 Microfono + Strip LED - Sistema Completo

**Data**: 08/01/2026  
**Sistema**: ESP32 Cucina con microfono e strip LED fisica per serra

---

## 📋 Panoramica

Sistema integrato che utilizza un **microfono** (GPIO 25) per rilevare picchi sonori e attivare l'enigma serra, sincronizzando automaticamente una **strip LED fisica** (GPIO 23) con la luce neon virtuale 3D nella serra.

### 🎯 Obiettivo

- **Microfono**: Rileva urlo/picco sonoro → attiva enigma serra
- **Strip LED**: Indicatore fisico sincronizzato con neon virtuale serra
- **Unificazione**: Serra = Neon 3D + Strip LED fisica (stesso stato)

---

## 🔌 Hardware Setup

### Pin Configuration

```cpp
#define MICROPHONE_PIN 25  // ADC Input analogico (0-4095)
#define STRIP_LED_PIN 23   // Output digitale (HIGH/LOW)
```

### Wiring

**Microfono (es. MAX4466, KY-038)**
- VCC → 3.3V ESP32
- GND → GND ESP32  
- OUT → GPIO 25 (analog input)

**Strip LED (via relay o MOSFET)**
- Signal → GPIO 23
- VCC → Alimentazione esterna (12V/24V)
- GND → GND comune

---

## ⚙️ ESP32 - Logica Implementata

### File: `esp32-cucina-COMPLETO.ino`

### 1️⃣ Microfono - Rilevamento Picco Sonoro

```cpp
const int SOUND_THRESHOLD = 512;  // ADC 0-4095 (calibrare sul campo)
unsigned long lastMicCheck = 0;
const unsigned long MIC_CHECK_INTERVAL = 100;  // Check ogni 100ms

void checkMicrophonePeak() {
  unsigned long now = millis();
  if (now - lastMicCheck < MIC_CHECK_INTERVAL) return;
  lastMicCheck = now;
  
  // Leggi livello sonoro analogico
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  // Rileva PICCO (sopra soglia)
  if (soundLevel > SOUND_THRESHOLD) {
    Serial.println("\n🎤 ===== PICCO SONORO RILEVATO! =====");
    Serial.print("   Sound level: ");
    Serial.println(soundLevel);
    
    // Notifica backend → attiva enigma serra
    notificaSerra();
    
    // Debounce lungo per evitare toggle multipli
    delay(1000);
  }
}
```

**Notifica Backend:**
```cpp
bool notificaSerra() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/serra/complete";
  return chiamataHTTP(endpoint.c_str());
}
```

### 2️⃣ Strip LED - Polling Stato Serra

```cpp
bool stripLedOn = false;
unsigned long lastStripCheck = 0;
const unsigned long STRIP_CHECK_INTERVAL = 2000;  // Polling ogni 2s

void checkStripLedState() {
  unsigned long now = millis();
  if (now - lastStripCheck < STRIP_CHECK_INTERVAL) return;
  lastStripCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/strip-led/state";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    // Parse JSON {"is_on": true/false}
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_be_on = doc["is_on"];
      
      // Aggiorna strip LED solo se serve (evita flickering)
      if (should_be_on != stripLedOn) {
        stripLedOn = should_be_on;
        digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
        
        Serial.print("💡 Strip LED: ");
        Serial.println(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
      }
    }
  }
}
```

### 3️⃣ Loop Principale

```cpp
void loop() {
  // ... gestione magneti anta/pentola ...
  
  // ===== CHECK MICROFONO =====
  checkMicrophonePeak();
  
  // ===== POLLING STRIP LED =====
  checkStripLedState();
  
  // ===== POLLING SERVO FRIGO =====
  checkServoState();
  
  delay(100);
}
```

---

## 🖥️ Backend - Architettura

### 1️⃣ Model - Campo `strip_led`

**File**: `backend/app/models/kitchen_puzzle.py`

```python
{
    "fornelli": {...},
    "frigo": {...},
    "serra": {...},
    "porta": {...},
    "strip_led": {
        "is_on": False  # Sincronizzato con stato serra
    }
}
```

**Stato Iniziale:**
```python
"strip_led": {"is_on": False}
```

### 2️⃣ API - Endpoint Polling

**File**: `backend/app/api/kitchen_puzzles.py`

```python
@router.get("/strip-led/state")
async def get_strip_led_state(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    ESP32 polling endpoint: Get strip LED state for physical serra indicator.
    Returns true when serra puzzle is completed.
    """
    state = KitchenPuzzleService.get_or_create_state(db, session_id)
    
    is_on = state.puzzle_states.get("strip_led", {}).get("is_on", False)
    serra_status = state.puzzle_states.get("serra", {}).get("status", "locked")
    
    return {
        "is_on": is_on,
        "serra_status": serra_status
    }
```

**Endpoint ESP32:**
```
GET /api/sessions/{session_id}/kitchen-puzzles/strip-led/state

Response:
{
  "is_on": true,
  "serra_status": "done"
}
```

### 3️⃣ Service - Sincronizzazione Automatica

**File**: `backend/app/services/kitchen_puzzle_service.py`

```python
@staticmethod
def validate_serra_activated(db: Session, session_id: int):
    state = KitchenPuzzleService.get_or_create_state(db, session_id)
    
    if state.puzzle_states["serra"]["status"] != "active":
        return None
    
    # Atomic update
    state.puzzle_states["serra"]["status"] = "done"
    state.puzzle_states["serra"]["completed_at"] = datetime.utcnow().isoformat()
    state.puzzle_states["porta"]["status"] = "unlocked"
    
    # 🆕 Sincronizza strip LED fisica con serra virtuale
    state.puzzle_states["strip_led"]["is_on"] = True
    
    state.updated_at = datetime.utcnow()
    flag_modified(state, "puzzle_states")
    
    db.commit()
    db.refresh(state)
    
    # ... notifica game_completion ...
```

**Logica:**
1. Microfono rileva picco → POST `/serra/complete`
2. Backend valida → `serra.status = "done"` + `strip_led.is_on = True`
3. ESP32 polling → GET `/strip-led/state` → accende strip fisica

---

## 🔄 Flusso Completo

### Sequenza Eventi

```
1. 🎤 Picco sonoro rilevato (ADC > 512)
   ↓
2. 📡 ESP32 → POST /serra/complete
   ↓
3. ✅ Backend valida (serra.status = "active")
   ↓
4. 💾 Update DB:
      - serra.status = "done"
      - strip_led.is_on = True
      - porta.status = "unlocked"
   ↓
5. 📨 WebSocket broadcast → Frontend 3D
   ↓
6. 💡 Neon virtuale serra si accende
   ↓
7. 🔄 ESP32 polling (ogni 2s) → GET /strip-led/state
   ↓
8. ⚡ Strip LED fisica si accende (GPIO 23 HIGH)
   ↓
9. ✅ Sincronizzazione completa: Virtual + Physical
```

---

## 🧪 Calibrazione Microfono

### Trovare Soglia Ottimale

1. **Serial Monitor:**
```cpp
void loop() {
  int soundLevel = analogRead(MICROPHONE_PIN);
  Serial.print("Sound: ");
  Serial.println(soundLevel);
  delay(100);
}
```

2. **Test:**
   - Ambiente silenzioso: ~50-100
   - Voce normale: ~200-400
   - Urlo/fischio: ~600-1000

3. **Regolare:**
```cpp
const int SOUND_THRESHOLD = 512;  // Aumentare se troppo sensibile
```

---

## 🐛 Troubleshooting

### Strip LED non si accende

**Check 1**: Verifica pin output
```cpp
digitalWrite(STRIP_LED_PIN, HIGH);
delay(2000);
digitalWrite(STRIP_LED_PIN, LOW);
```

**Check 2**: Test endpoint manuale
```bash
curl "http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/strip-led/state"
# Response atteso: {"is_on": true, "serra_status": "done"}
```

**Check 3**: Verifica database
```sql
SELECT puzzle_states->'strip_led' FROM kitchen_puzzle_states WHERE session_id=999;
-- Atteso: {"is_on": true}
```

### Microfono non rileva suoni

**Check 1**: Test ADC raw
```cpp
Serial.println(analogRead(MICROPHONE_PIN));
// Se sempre ~0 o ~4095 → wiring errato
```

**Check 2**: Potenziometro gain (MAX4466)
- Ruotare trimmer per aumentare sensibilità

**Check 3**: Ridurre soglia temporaneamente
```cpp
const int SOUND_THRESHOLD = 200;  // Test più sensibile
```

### Strip LED flickering

**Causa**: Polling troppo frequente + network jitter

**Soluzione**: Già implementato
```cpp
// Aggiorna solo su CAMBIAMENTO di stato
if (should_be_on != stripLedOn) {
  stripLedOn = should_be_on;
  digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
}
```

---

## 📊 Performance

### Timing

- **Microfono check**: 100ms interval
- **Strip LED polling**: 2s interval  
- **Latenza end-to-end**: ~2-3 secondi (picco → LED fisica)

### Network Load

- Microfono trigger: 1 POST (solo al picco)
- Strip LED polling: 1 GET ogni 2s
- **Total**: ~0.5 requests/sec in steady state

---

## 🎓 Best Practices

1. **Debounce microfono**: `delay(1000)` dopo trigger per evitare doppi
2. **Polling ottimizzato**: Intervallo 2s è bilanciato (responsivo ma non invasivo)
3. **State caching ESP32**: Evita aggiornare GPIO se stato non cambia
4. **Error handling**: Retry automatico su network fail (già in `chiamataHTTP()`)

---

## 🔗 File Correlati

### ESP32
- `esp32-cucina-COMPLETO.ino` - Codice finale con tutti i sensori

### Backend
- `backend/app/models/kitchen_puzzle.py` - Model con campo `strip_led`
- `backend/app/api/kitchen_puzzles.py` - Endpoint `/strip-led/state`
- `backend/app/services/kitchen_puzzle_service.py` - Sincronizzazione automatica

### Guide
- `ESP32_CUCINA_SETUP_GUIDE.md` - Setup iniziale ESP32
- `ESP32_SERVO_FRIGO_SETUP_GUIDE.md` - Sistema servo frigo
- `ESP32_ANTA_PENTOLA_GUIDE.md` - Sistema magneti anta/pentola

---

## ✅ Checklist Deploy

- [ ] ESP32 caricato con `esp32-cucina-COMPLETO.ino`
- [ ] Microfono collegato a GPIO 25
- [ ] Strip LED collegata a GPIO 23 (via relay/MOSFET)
- [ ] Backend aggiornato (model + API + service)
- [ ] Calibrazione soglia microfono completata
- [ ] Test end-to-end: urlo → neon 3D + strip fisica

---

**Sistema pronto per produzione! 🚀**
