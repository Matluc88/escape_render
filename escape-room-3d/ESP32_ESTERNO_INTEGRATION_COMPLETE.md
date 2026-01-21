# 🚪 ESP32 Esterno - Integrazione Completa End-to-End

**Data**: 18/01/2026  
**Versione**: 2.0 (Backend HTTP Integration)  
**Autore**: Sistema Escape Room 3D

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Architettura Completa](#architettura-completa)
3. [Componenti](#componenti)
4. [Flusso Dati](#flusso-dati)
5. [Setup Hardware](#setup-hardware)
6. [Setup Software](#setup-software)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica Sistema

### Differenze con Versione Precedente

**❌ PRIMA (solo MQTT):**
```
ESP32 → MQTT → Frontend
(Backend non sincronizzato, animazioni solo locali)
```

**✅ ADESSO (HTTP + WebSocket):**
```
ESP32 → HTTP Backend → Database + WebSocket → Frontend
(Tutto sincronizzato, stato persistente, animazioni coordinate)
```

### Funzionalità Complete

1. **Fotocellula IR** rileva presenza/assenza
2. **4 Servomotori** animano cancelli, porta, tetto
3. **2 LED** bicolore (rosso/verde) per stato
4. **Strip RGB** festa (solo alla vittoria completa)
5. **Backend HTTP** sincronizza stato nel database
6. **WebSocket** broadcast aggiornamenti a tutti i giocatori
7. **Frontend 3D** animazioni sincronizzate con servo fisici

---

## 🏗️ Architettura Completa

### Diagramma Flusso

```
┌─────────────────────────────────────────────────────────────┐
│  HARDWARE (ESP32)                                           │
├─────────────────────────────────────────────────────────────┤
│  Fotocellula IR (GPIO 19)                                   │
│    LOW = OCCUPATO                                           │
│    HIGH = LIBERO ✅                                          │
└────────────┬────────────────────────────────────────────────┘
             │ (cambiamento rilevato)
             ▼
┌─────────────────────────────────────────────────────────────┐
│  ESP32 FIRMWARE                                             │
├─────────────────────────────────────────────────────────────┤
│  • updatePhotocellState(isClear)                            │
│  • POST /api/sessions/{id}/gate-puzzles/photocell/update   │
│  • Polling GET /api/sessions/{id}/gate-puzzles/esp32-state │
└────────────┬────────────────────────────────────────────────┘
             │ (HTTP POST)
             ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI)                                          │
├─────────────────────────────────────────────────────────────┤
│  gate_puzzles.py → GatePuzzleService                        │
│    • Aggiorna database (PostgreSQL)                         │
│    • Calcola rgb_strip_on = photocell AND game_won         │
│    • Marca completed_at se prima volta                      │
│    • WebSocket broadcast → tutti i client                   │
└────────────┬────────────────────────────────────────────────┘
             │ (WebSocket)
             ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Three.js)                                │
├─────────────────────────────────────────────────────────────┤
│  useGatePuzzle(sessionId, socket)                           │
│    • Riceve aggiornamenti via WebSocket                     │
│    • Aggiorna stati: gatesOpen, doorOpen, roofOpen         │
│                                                              │
│  EsternoScene.jsx                                           │
│    • useCancello(cancelloAperto) → anima cancello 3D        │
│    • useAnimatedDoor(portaAperta) → anima porta 3D         │
│                                                              │
│  🎬 ANIMAZIONI SINCRONIZZATE CON SERVO FISICI! 🎬           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componenti

### 1. ESP32 Firmware

**File**: `esp32-esterno-RASPBERRY-COMPLETE.ino`

**Funzioni Chiave:**

```cpp
// ✅ Rileva cambiamento fotocellula
if (irLibero != irLiberoOld) {
  updatePhotocellState(irLibero);  // Invia HTTP POST
  irLiberoOld = irLibero;
}

// ✅ Invia stato al backend
void updatePhotocellState(bool isClear) {
  POST /api/sessions/{id}/gate-puzzles/photocell/update?is_clear=true/false
  // Aggiorna anche rgbStripOn dalla risposta
}

// ✅ Polling backend per RGB (ogni 2s)
void syncBackendState() {
  GET /api/sessions/{id}/gate-puzzles/esp32-state
  // Aggiorna rgbStripOn (si accende solo se tutte 4 stanze completate)
}
```

### 2. Backend Service

**File**: `backend/app/services/gate_puzzle_service.py`

**Logica Chiave:**

```python
def update_photocell_state(db, session_id, is_clear):
    puzzle = get_or_create(db, session_id)
    
    # Aggiorna stato fotocellula
    puzzle.photocell_clear = is_clear
    
    # Animazioni seguono fotocellula
    puzzle.gates_open = is_clear
    puzzle.door_open = is_clear
    puzzle.roof_open = is_clear
    
    # LED verde se libera, rosso se occupata
    puzzle.led_status = "green" if is_clear else "red"
    
    # 🏆 Se fotocellula libera per PRIMA VOLTA → completed!
    if is_clear and puzzle.completed_at is None:
        puzzle.completed_at = datetime.utcnow()
        print(f"🚪 Gate puzzle completato! session_id={session_id}")
    
    # 🎉 RGB strip ON solo se: fotocellula libera AND tutte 4 stanze completate
    game_state = GameCompletionService.get_or_create_state(db, session_id)
    puzzle.rgb_strip_on = is_clear and game_state.game_won
    
    db.commit()
    return puzzle
```

### 3. Frontend Hook

**File**: `src/hooks/useGatePuzzle.js`

**Pattern:**

```javascript
export function useGatePuzzle(sessionId, socket) {
  const [photocellClear, setPhotocellClear] = useState(false)
  const [gatesOpen, setGatesOpen] = useState(false)
  const [doorOpen, setDoorOpen] = useState(false)
  const [roofOpen, setRoofOpen] = useState(false)
  const [rgbStripOn, setRgbStripOn] = useState(false)
  
  // 1. Fetch initial state da backend (mount)
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/sessions/${sessionId}/gate-puzzles/state`)
      .then(data => {
        setGatesOpen(data.gates_open)
        // ... altri stati
      })
  }, [sessionId])
  
  // 2. Listen WebSocket updates (real-time)
  useEffect(() => {
    socket.on('gate_puzzle_update', (data) => {
      if (data.session_id === sessionId) {
        setGatesOpen(data.gates_open)
        // ... altri stati
      }
    })
  }, [socket, sessionId])
  
  return { gatesOpen, doorOpen, roofOpen, rgbStripOn }
}
```

### 4. Frontend Scene

**File**: `src/components/scenes/EsternoScene.jsx`

**Utilizzo:**

```javascript
export default function EsternoScene({ sessionId, socket }) {
  // Hook per sincronizzare con backend
  const gatePuzzle = useGatePuzzle(sessionId, socket)
  
  // Hook MQTT (opzionale, per letture dirette ESP32)
  const mqtt = useMqttEsterno()
  
  // Animazioni 3D sincronizzate
  return (
    <CasaModel 
      cancelloAperto={gatePuzzle.gatesOpen}  // ✅ Da backend
      portaIngressoAperta={gatePuzzle.doorOpen}  // ✅ Da backend
      tettoAperto={gatePuzzle.roofOpen}  // ✅ Da backend
      ledSerraVerde={gatePuzzle.photocellClear}  // ✅ Da backend
    />
  )
}
```

---

## 📊 Flusso Dati

### Scenario 1: Fotocellula OCCUPATA → LIBERA

```
1. Player si allontana dalla fotocellula
   ↓
2. ESP32: digitalRead(IR_PIN) = HIGH
   ↓
3. ESP32: rileva cambiamento (false → true)
   ↓
4. ESP32 → POST /api/.../photocell/update?is_clear=true
   ↓
5. Backend:
   - Aggiorna DB: photocell_clear = true
   - Aggiorna DB: gates_open = true
   - Aggiorna DB: door_open = true
   - Aggiorna DB: roof_open = true
   - Aggiorna DB: led_status = "green"
   - Calcola: rgb_strip_on = true AND game_won
   - Se prima volta: completed_at = NOW
   ↓
6. Backend → WebSocket broadcast "gate_puzzle_update"
   ↓
7. Frontend (tutti i giocatori):
   - useGatePuzzle riceve update
   - setGatesOpen(true)
   - setDoorOpen(true)
   - setRoofOpen(true)
   ↓
8. Frontend 3D:
   - useCancello anima cancello: 0° → 90° (smooth)
   - useAnimatedDoor anima porta: 0° → 90° (smooth)
   - Animazione tetto: 0° → 180° (smooth)
   ↓
9. ESP32 Servo fisici:
   - cancelloDX.write(posCancelli++)  // smooth 0→90
   - porta.write(posPorta++)  // smooth 0→90
   - tetto.write(posTetto++)  // smooth 0→180
   
✅ RISULTATO: Animazioni 3D e servo fisici SINCRONIZZATI!
```

### Scenario 2: Tutte le 4 Stanze Completate

```
1. Ultimo puzzle completato (cucina/soggiorno/bagno/camera)
   ↓
2. Backend: GameCompletionService calcola game_won = true
   ↓
3. ESP32 (polling ogni 2s):
   GET /api/.../gate-puzzles/esp32-state
   {
     "rgb_strip_on": true,  // ✅ fotocellula libera AND game_won
     "all_rooms_complete": true
   }
   ↓
4. ESP32: rgbStripOn = true
   ↓
5. ESP32 loop():
   if (rgbStripOn) {
     // Ciclo colori: rosso/verde/blu/giallo/magenta/ciano
     analogWrite(RGB_R, ...)
     analogWrite(RGB_G, ...)
     analogWrite(RGB_B, ...)
   }
   
🎉 RISULTATO: Strip RGB lampeggia in festa!
```

---

## 🔧 Setup Hardware

### Pinout ESP32

```
GPIO 19 → Fotocellula IR (Signal)

GPIO 4  → LED Verde
GPIO 16 → LED Rosso
         (+ resistenze 220Ω → GND)

GPIO 5  → Servo Cancello DX (Signal)
GPIO 17 → Servo Cancello SX (Signal)
GPIO 18 → Servo Porta (Signal)
GPIO 32 → Servo Tetto DS3225MG (Signal)

GPIO 21 → RGB Strip Red
GPIO 22 → RGB Strip Green
GPIO 23 → RGB Strip Blue

GND → Common Ground
5V  → External Power (alimentatore 5V 3A per servo)
```

### Schema Fotocellula

```
Fotocellula IR (tipo E18-D80NK)
┌────────────┐
│  Marrone   │ ──→ 5V
│  Blu       │ ──→ GND
│  Nero      │ ──→ GPIO 19 (ESP32)
└────────────┘

Logica:
- HIGH (1) = LIBERO (nessun oggetto rilevato)
- LOW  (0) = OCCUPATO (oggetto presente)
```

---

## 💻 Setup Software

### 1. Backend Migration

```bash
cd backend
alembic upgrade head  # Applica 012_add_gate_puzzles
```

### 2. ESP32 Upload

**Arduino IDE:**

1. Apri `esp32-esterno-RASPBERRY-COMPLETE.ino`
2. Modifica credenziali:
   ```cpp
   const char* ssid = "TUO_WIFI_SSID";
   const char* password = "TUA_PASSWORD";
   const char* backend_url = "http://192.168.1.X:8001";  // IP Raspberry
   ```
3. Board: ESP32 Dev Module
4. Upload ⬆️

### 3. Frontend (Opzionale - già integrato)

Se vuoi aggiungere useGatePuzzle alla scena:

```javascript
// src/components/scenes/EsternoScene.jsx
import { useGatePuzzle } from '../../hooks/useGatePuzzle'

export default function EsternoScene({ sessionId, socket }) {
  // Aggiungi hook
  const gatePuzzle = useGatePuzzle(sessionId, socket)
  
  // Usa stati sincronizzati con backend
  const cancelloAperto = gatePuzzle.gatesOpen
  const portaAperta = gatePuzzle.doorOpen
  
  // ... resto del codice
}
```

---

## 🧪 Testing

### Test 1: Fotocellula → Backend → Frontend

**Serial Monitor (115200 baud):**

```
🚦 Fotocellula cambiata: LIBERA ✅
📤 POST http://192.168.1.10:8001/api/sessions/999/gate-puzzles/photocell/update?is_clear=true
✅ Backend aggiornato!
🎨 RGB Strip: OFF
```

**Backend Logs:**

```
🚪 Gate puzzle completato! session_id=999
Gate puzzle state updated for session 999
WebSocket broadcast: gate_puzzle_update
```

**Frontend Console:**

```
📡 [useGatePuzzle] WebSocket update received: {
  session_id: 999,
  photocell_clear: true,
  gates_open: true,
  door_open: true,
  roof_open: true,
  led_status: "green",
  rgb_strip_on: false,
  completed: true
}
✅ [useGatePuzzle] States updated from WebSocket
```

### Test 2: Animazioni Sincronizzate

**Verifica timing:**

1. ESP32 muove servo: 0° → 90° (smooth, ~12 secondi)
2. Frontend 3D cancello: 0° → 90° (smooth, stesso timing)
3. Entrambi usano `useCancello` con modalità `realistico` (135ms/grado)

**Risultato atteso:**
✅ Cancello 3D e servo fisici si muovono **perfettamente sincronizzati**

### Test 3: RGB Strip Vittoria

**Setup:**

```sql
-- Simula vittoria (tutte 4 stanze completate)
UPDATE game_completion SET game_won = true WHERE session_id = 999;
```

**Aspettati:**

```
ESP32 (dopo max 2 secondi - polling):
🎮 Backend sync → RGB: ON 🎉 | All rooms: ✅

RGB Strip inizia ciclo:
🔴 ROSSO → 🟢 VERDE → 🔵 BLU → 🟡 GIALLO → 🟣 MAGENTA → 🔵 CIANO
(ciclo ogni 120ms)
```

---

## 🐛 Troubleshooting

### ❌ ESP32 non invia POST al backend

**Sintomi:**
```
🚦 Fotocellula cambiata: LIBERA ✅
(nessun POST visible)
```

**Cause possibili:**

1. WiFi non connesso
2. Backend URL errato
3. Firewall blocca richieste

**Debug:**

```cpp
// Nel loop(), aggiungi PRIMA del check cambiamento:
if (millis() - tDebug > 5000) {
  tDebug = millis();
  Serial.print("WiFi status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "✅" : "❌");
  Serial.print("Backend URL: ");
  Serial.println(backend_url);
}
```

### ❌ Frontend non riceve aggiornamenti WebSocket

**Sintomi:**
```
✅ [useGatePuzzle] Socket già connesso - registro listener subito
(ma nessun 📡 WebSocket update)
```

**Verifica:**

1. Backend emette evento corretto?
   ```python
   # In gate_puzzle_service.py, aggiungi log
   print(f"📡 Broadcasting gate_puzzle_update: {data}")
   ```

2. Topic WebSocket corretto?
   ```javascript
   // Deve essere esattamente: 'gate_puzzle_update'
   socket.on('gate_puzzle_update', handler)
   ```

3. Session ID match?
   ```javascript
   console.log('Session ID:', sessionId, typeof sessionId)
   console.log('Data session_id:', data.session_id, typeof data.session_id)
   // Devono essere entrambi number
   ```

### ❌ Animazioni 3D non sincronizzate con servo

**Problema:** Cancello 3D si apre istantaneamente, servo fisici smooth

**Fix:** Usa modalità `realistico` in `useCancello`:

```javascript
useCancello(
  scene,
  cancelloAperto,
  { modalita: 'realistico', angoloApertura: 90 },  // ✅ Sincronizzato!
  true
)
```

**Timing Correct:**
- ESP32: 135ms/grado = ~12.15s per 90°
- Frontend: 135ms/grado = ~12.15s per 90°

---

## 📈 Performance

### Latenza Sistema

| Operazione | Tempo | Note |
|------------|-------|------|
| Fotocellula → ESP32 | <10ms | Digitalread |
| ESP32 → Backend POST | 50-200ms | Rete locale |
| Backend → DB | 10-50ms | PostgreSQL |
| Backend → WebSocket | <10ms | Socket.IO |
| WebSocket → Frontend | 10-50ms | Rete |
| **TOTALE** | **80-320ms** | **< 0.3 secondi!** |

### Bandwidth

| Canale | Frequenza | Bytes/richiesta | Totale |
|--------|-----------|-----------------|--------|
| ESP32 → Backend POST | Solo su cambio | ~200 bytes | Trascurabile |
| ESP32 ← Backend GET | 2s | ~150 bytes | ~75 bytes/s |
| Frontend WebSocket | On-demand | ~300 bytes | Burst only |

**Risultato:** Sistema ultra-leggero, adatto anche per WiFi congestionato.

---

## 🎓 Best Practices

### 1. Gestione Errori ESP32

```cpp
void updatePhotocellState(bool isClear) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi non connesso - skip update");
    return;  // ✅ Graceful degradation
  }
  
  // ... resto codice
}
```

### 2. Backend Validation

```python
def update_photocell_state(db, session_id, is_clear):
    # ✅ Always validate input
    if not isinstance(is_clear, bool):
        raise ValueError("is_clear must be boolean")
    
    # ✅ Use get_or_create (idempotent)
    puzzle = get_or_create(db, session_id)
    
    # ... resto codice
```

### 3. Frontend Error Handling

```javascript
const handleGatePuzzleUpdate = (data) => {
  // ✅ Validate structure BEFORE accessing
  if (typeof data.photocell_clear === 'undefined') {
    console.error('Invalid data:', data)
    return
  }
  
  // ✅ Update states
  setGatesOpen(data.gates_open)
}
```

---

## 📝 Checklist Deploy

- [ ] Backend migration applicata (`012_add_gate_puzzles`)
- [ ] ESP32 caricato con firmware COMPLETE
- [ ] WiFi credentials configurate
- [ ] Backend URL configurato (IP Raspberry)
- [ ] Fotocellula cablata e testata
- [ ] Servo 4x alimentati (5V 3A esterno)
- [ ] LED bicolore funzionanti
- [ ] RGB strip collegata
- [ ] Test POST backend (Serial Monitor)
- [ ] Test WebSocket frontend (Console)
- [ ] Test animazioni sincronizzate
- [ ] Test RGB vittoria (game_won = true)

---

## 🚀 Quick Start

```bash
# 1. Backend
cd backend
alembic upgrade head
docker-compose up -d

# 2. ESP32
# - Apri esp32-esterno-RASPBERRY-COMPLETE.ino
# - Modifica WiFi + Backend URL
# - Upload su ESP32
# - Serial Monitor 115200 baud

# 3. Test
# - Copri/scopri fotocellula
# - Verifica Serial Monitor: POST 200 OK
# - Verifica Backend logs: WebSocket broadcast
# - Verifica Frontend: animazioni sincronizzate
```

---

## 🎉 Conclusione

Sistema completo end-to-end con:

✅ **ESP32** comunica con backend via HTTP  
✅ **Backend** sincronizza stato nel database  
✅ **WebSocket** broadcast real-time a tutti i giocatori  
✅ **Frontend** animazioni 3D perfettamente sincronizzate con servo fisici  
✅ **RGB Strip** si accende solo alla vittoria completa (tutte 4 stanze)  

**Buon divertimento! 🚀**

---

**Fine Documento** 🎊