# ESP32 Soggiorno - Fix Endpoint 404 COMPLETO ✅

**Data:** 14 Gennaio 2026  
**Problema:** ESP32 soggiorno ritornava 404 su `/api/sessions/active`

## 🔍 Diagnosi Problema

### Sintomi
```
📡 Fetch active session da: http://192.168.8.10:8001/api/sessions/active
❌ HTTP error: 404
🎯 Uso Session ID: 999
```

### Causa Root
Il router `sessions.py` aveva il prefix **sbagliato**:
```python
# ❌ PRIMA (SBAGLIATO)
router = APIRouter(prefix="/sessions", tags=["sessions"])
# Endpoint risultante: /sessions/active → 404

# ✅ DOPO (CORRETTO)  
router = APIRouter(prefix="/api/sessions", tags=["sessions"])
# Endpoint risultante: /api/sessions/active → 200
```

**Comparazione con altri router:**
- `livingroom_puzzles.py`: ✅ `prefix="/api"` → `/api/sessions/{id}/livingroom-puzzles/state`
- `kitchen_puzzles.py`: ✅ `prefix="/api"` → `/api/sessions/{id}/kitchen-puzzles/state`
- `sessions.py`: ❌ `prefix="/sessions"` → `/sessions/active` (NO /api!)

## 🛠️ Fix Applicati

### 1. Backend API Routes
**File:** `backend/app/api/sessions.py`

```python
# ❌ PRIMA: router = APIRouter(prefix="/sessions", tags=["sessions"])
# ✅ DOPO:  router = APIRouter(prefix="/api/sessions", tags=["sessions"])
```

**Impatto:** 
- Tutti gli endpoint sessions ora hanno prefix `/api/sessions`
- Coerente con tutti gli altri router (livingroom_puzzles, kitchen_puzzles, ecc.)

### 2. Frontend API Client
**File:** `src/utils/api.js`

```javascript
// ❌ PRIMA: apiClient.post('/sessions')
// ✅ DOPO:  apiClient.post('/api/sessions')
```

### 3. Frontend Pages (batch fix)
**Files fixati:**
- `src/pages/admin/Lobby.jsx`
- `src/pages/JoinGame.jsx`
- `src/pages/RoomScene.jsx`
- `src/pages/admin/QRCodesPage.jsx`

```bash
# Comando usato per fix batch:
find src/pages -name "*.jsx" -type f -exec sed -i '' 's|${API_URL}/sessions|${API_URL}/api/sessions|g' {} +
```

### 4. Codice ESP32 Aggiornato
**File:** `esp32-soggiorno-RASPBERRY-FIXED.ino`

```cpp
// ✅ RIMUOVE polling endpoint inesistente /game-completion/door-leds
// ✅ MANTIENE polling puzzle locali /livingroom-puzzles/state
// ✅ FETCH session ID automatico da /api/sessions/active
```

**Hardware controllato:**
- LED Pianta (GPIO 17/5) - rosso/verde
- LED Condizionatore (GPIO 18/19) - rosso/verde
- TV (GPIO 32) - on/off

### 2. Backend Fix
**File:** `backend/app/api/sessions.py`

```python
# Cambiato prefix da "/sessions" a "/api/sessions"
router = APIRouter(prefix="/api/sessions", tags=["sessions"])
```

### 3. Deploy
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose restart backend
```

## ✅ Risultato Atteso

Dopo il riavvio dell'ESP32, dovresti vedere:

```
📡 Fetch active session da: http://192.168.8.10:8001/api/sessions/active
📥 Response: {"id":1003,"room_id":1,"status":"playing",...}
✅ Active session ID: 1003
🎯 Uso Session ID: 1003

🔄 Fetch stati iniziali puzzle...
🌱 Pianta LED: locked
❄️  Condiz LED: locked
📺 TV: active
```

## 📋 Prossimi Passi

1. **Riflasha ESP32 Soggiorno** con il nuovo codice:
   - Apri Arduino IDE
   - Carica `esp32-soggiorno-RASPBERRY-FIXED.ino`
   - Flash su ESP32

2. **Verifica Serial Monitor:**
   - Baud rate: 115200
   - Controlla che ottenga session_id 1003
   - LED si aggiornano in base agli stati puzzle

3. **Test funzionale:**
   - Completa puzzle soggiorno nel gioco
   - Verifica che i LED fisici cambino stato

## 🔗 File Correlati

- Codice ESP32: `esp32-soggiorno-RASPBERRY-FIXED.ino`
- Backend fix: `backend/app/api/sessions.py`
- Guide originale: `ESP32_SOGGIORNO_SETUP_GUIDE.md`

## 📝 Note Tecniche

### Endpoint Backend Disponibili

#### Sessions
- ✅ `GET /api/sessions/active` - Ottiene sessione attiva
- ✅ `GET /api/sessions/{id}` - Dettagli sessione
- ✅ `GET /api/sessions` - Tutte le sessioni

#### Living Room Puzzles
- ✅ `GET /api/sessions/{id}/livingroom-puzzles/state` - Stato puzzle
- ✅ `POST /api/sessions/{id}/livingroom-puzzles/tv/complete`
- ✅ `POST /api/sessions/{id}/livingroom-puzzles/pianta/complete`
- ✅ `POST /api/sessions/{id}/livingroom-puzzles/condizionatore/complete`

### Comportamento LED

| Puzzle | Initial | Active | Completed |
|--------|---------|--------|-----------|
| TV | - | - | GPIO 32 HIGH |
| Pianta LED | OFF | RED (GPIO 5) | GREEN (GPIO 17) |
| Condiz LED | OFF | RED (GPIO 19) | GREEN (GPIO 18) |

### Fallback Mode

Se l'endpoint `/api/sessions/active` fallisce:
- ESP32 usa `session_id = 999` come fallback
- Continua a pollare gli endpoint puzzle normalmente
- Funziona per testing con sessione 999 sempre disponibile

---

**Status:** ✅ FIX COMPLETATO  
**Testing:** Pronto per flash su ESP32
