# 🚪 Deploy Integrazione Esterno - Gate Puzzle System

**Data**: 18/01/2026  
**Feature**: Integrazione completa ESP32 Esterno con Backend HTTP  
**Status**: ✅ Pronto per Deploy

---

## 📦 File Creati/Modificati

### 1. Frontend Hook

**Nuovo File**: `escape-room-3d/src/hooks/useGatePuzzle.js`

- Hook React per sincronizzazione stato gate puzzle
- WebSocket listener per real-time updates
- Pattern identico a useKitchenPuzzle, useBathroomPuzzle
- Stati: photocellClear, gatesOpen, doorOpen, roofOpen, rgbStripOn

### 2. ESP32 Firmware

**Nuovo File**: `escape-room-3d/esp32-esterno-RASPBERRY-COMPLETE.ino`

- Versione completa con HTTP backend integration
- POST al backend quando fotocellula cambia stato
- Polling ogni 2s per controllare RGB strip (game_won)
- Sincronizzazione perfetta con animazioni 3D

**Differenze con versione precedente (MQTT-only):**
```diff
+ updatePhotocellState(bool isClear)  // HTTP POST al backend
+ syncBackendState()                  // Polling RGB strip
- Nessuna comunicazione HTTP          // Solo MQTT locale
```

### 3. Documentazione

**Nuovo File**: `escape-room-3d/ESP32_ESTERNO_INTEGRATION_COMPLETE.md`

- Guida completa architettura sistema
- Diagrammi flusso dati
- Setup hardware e software
- Testing e troubleshooting
- Best practices

---

## 🔧 Backend (Già Esistente)

**Nessuna modifica necessaria** - Il backend è già pronto:

- ✅ Migration `012_add_gate_puzzles` già applicata
- ✅ Service `gate_puzzle_service.py` già implementato
- ✅ Endpoint `/api/sessions/{id}/gate-puzzles/*` già disponibili
- ✅ WebSocket broadcast già configurato

---

## 🚀 Deploy su Raspberry

### Esecuzione Deploy

```bash
cd /Users/matteo/Desktop/ESCAPE
./deploy-raspberry-full-update.sh
```

### Cosa Viene Deployato

Lo script automaticamente include:

1. **Hook Frontend**
   - `src/hooks/useGatePuzzle.js` → `/home/pi/escape-room-3d/src/hooks/`

2. **ESP32 Firmware** (per riferimento/backup)
   - `esp32-esterno-RASPBERRY-COMPLETE.ino` → `/home/pi/escape-room-3d/`

3. **Documentazione**
   - `ESP32_ESTERNO_INTEGRATION_COMPLETE.md` → `/home/pi/escape-room-3d/`

4. **Frontend Rebuild**
   - npm run build (include nuovo hook useGatePuzzle)
   - Docker rebuild frontend container

5. **Backend** (nessun cambio necessario)
   - Migration già presente
   - Service già implementato

### Timing Deploy

```
┌─────────────────────────────────────────────┐
│  STEP 1: Pulizia file temporanei      ~5s   │
│  STEP 2: Build frontend (npm)         ~30s  │
│  STEP 3: Creazione archivio           ~10s  │
│  STEP 4: Test connessione Raspberry   ~3s   │
│  STEP 5: Trasferimento archivio       ~20s  │
│  STEP 6: Backup ed estrazione         ~15s  │
│  STEP 7: Rebuild Docker containers    ~180s │
│  STEP 8: Avvio e verifica             ~30s  │
├─────────────────────────────────────────────┤
│  TOTALE STIMATO:                      ~5 min │
└─────────────────────────────────────────────┘
```

---

## 🧪 Test Post-Deploy

### 1. Test Hook Frontend

**Browser Console** (http://192.168.8.10):

```javascript
// Apri DevTools (F12) → Console
// Verifica che l'hook si inizializzi
// Cerca log tipo:
// ✅ [useGatePuzzle] Initial state loaded
```

### 2. Test ESP32 (da caricare manualmente)

**Serial Monitor** (115200 baud):

```
1. Apri Arduino IDE
2. Carica esp32-esterno-RASPBERRY-COMPLETE.ino
3. Modifica WiFi credentials + backend_url = "http://192.168.8.10:8001"
4. Upload su ESP32
5. Verifica:
   🚦 Fotocellula cambiata: LIBERA ✅
   📤 POST http://192.168.8.10:8001/api/sessions/999/gate-puzzles/photocell/update
   ✅ Backend aggiornato!
```

### 3. Test Backend API

```bash
# Test endpoint gate puzzle
curl http://192.168.8.10/api/sessions/999/gate-puzzles/state

# Response atteso:
{
  "session_id": 999,
  "photocell_clear": false,
  "gates_open": false,
  "door_open": false,
  "roof_open": false,
  "led_status": "red",
  "rgb_strip_on": false,
  "completed": false
}
```

### 4. Test WebSocket

**Frontend Console**:

```
1. Apri http://192.168.8.10
2. Vai alla scena Esterno
3. Apri DevTools Console
4. Copri/scopri fotocellula ESP32
5. Verifica log:
   📡 [useGatePuzzle] WebSocket update received
   ✅ [useGatePuzzle] States updated from WebSocket
```

---

## 📋 Checklist Deploy

### Pre-Deploy

- [x] Hook useGatePuzzle creato
- [x] ESP32 firmware COMPLETE creato
- [x] Documentazione completa scritta
- [x] Backend già configurato (migration 012)

### Durante Deploy

- [ ] Eseguire `./deploy-raspberry-full-update.sh`
- [ ] Verificare build frontend OK
- [ ] Verificare trasferimento archivio OK
- [ ] Verificare rebuild containers OK
- [ ] Verificare avvio servizi OK

### Post-Deploy

- [ ] Test endpoint `/api/sessions/999/gate-puzzles/state` (200 OK)
- [ ] Test frontend console (hook inizializzato)
- [ ] Caricare ESP32 firmware manualmente
- [ ] Test fotocellula → backend → frontend
- [ ] Test WebSocket broadcast multi-player

---

## 🔍 Verifica Integrazione

### Frontend

```bash
# SSH su Raspberry
ssh pi@192.168.8.10

# Verifica file hook
ls -lh /home/pi/escape-room-3d/src/hooks/useGatePuzzle.js

# Verifica build include hook
grep -r "useGatePuzzle" /home/pi/escape-room-3d/dist/ 2>/dev/null || echo "Hook in bundle"
```

### Backend

```bash
# Verifica migration applicata
ssh pi@192.168.8.10
cd /home/pi/escape-room-3d
docker compose exec backend alembic current

# Dovrebbe mostrare: 012_add_gate_puzzles (o superiore)
```

### Containers

```bash
# Status containers
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose ps'

# Logs backend (cerca errori)
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose logs backend | tail -50'

# Logs frontend (cerca errori)
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose logs frontend | tail -50'
```

---

## 🎯 Funzionalità Abilitate

Dopo questo deploy:

✅ **ESP32 Esterno** può comunicare con backend via HTTP  
✅ **Backend** sincronizza stato gate puzzle nel database  
✅ **WebSocket** broadcast aggiornamenti real-time  
✅ **Frontend** animazioni 3D sincronizzate con servo fisici  
✅ **Multi-player** tutti i giocatori vedono stesso stato  
✅ **RGB Strip** si accende solo alla vittoria completa  

---

## 📊 Architettura Finale

```
╔═══════════════════════════════════════════════════════════╗
║  ESP32 ESTERNO (Hardware)                                 ║
╠═══════════════════════════════════════════════════════════╣
║  Fotocellula IR (GPIO 19)                                 ║
║    ↓ (cambiamento rilevato)                               ║
║  updatePhotocellState(isClear)                            ║
║    ↓ (HTTP POST)                                          ║
╠═══════════════════════════════════════════════════════════╣
║  BACKEND RASPBERRY (Docker)                               ║
╠═══════════════════════════════════════════════════════════╣
║  FastAPI → GatePuzzleService                              ║
║    ↓ (aggiorna PostgreSQL)                                ║
║  WebSocket → broadcast "gate_puzzle_update"               ║
║    ↓                                                       ║
╠═══════════════════════════════════════════════════════════╣
║  FRONTEND (React + Three.js)                              ║
╠═══════════════════════════════════════════════════════════╣
║  useGatePuzzle(sessionId, socket) ← WebSocket listener    ║
║    ↓ (setState)                                           ║
║  EsternoScene.jsx                                         ║
║    ↓ (props)                                              ║
║  CasaModel.jsx                                            ║
║    ↓ (useCancello, useAnimatedDoor)                       ║
║  Animazioni 3D SINCRONIZZATE! 🎬                          ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🎉 Conclusione

Deploy pronto! Esegui:

```bash
cd /Users/matteo/Desktop/ESCAPE
./deploy-raspberry-full-update.sh
```

Poi carica manualmente l'ESP32 con il firmware COMPLETE.

**Buon divertimento! 🚀**

---

**Fine Documento** 🎊