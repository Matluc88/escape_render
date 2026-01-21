# ESP32 SOGGIORNO - Fix 404 Endpoints + Frontend Rebuild

## 🔴 PROBLEMA ORIGINALE

**Data**: 15 Gennaio 2026, ore 21:00  
**Sintomo**: ESP32 Soggiorno riceveva errori 404 su nuovi endpoint:
- `GET /api/game-completion/door-leds` → 404
- `GET /api/sessions/{id}/livingroom-puzzles/door-servo-status` → 404  
- `GET /api/sessions/{id}/livingroom-puzzles/fan-status` → 404

## ✅ FIX BACKEND (Completato)

### 1. Endpoint Aggiunti
**File**: `backend/app/api/game_completion.py`
```python
@router.get("/game-completion/door-leds")
def get_door_leds_global(db: Session = Depends(get_db)):
    # Auto-resolve active session
```

**File**: `backend/app/api/livingroom_puzzles.py`
```python
@router.get("/sessions/{session_id}/livingroom-puzzles/door-servo-status")
@router.get("/sessions/{session_id}/livingroom-puzzles/fan-status")
```

### 2. Database Migration
**File**: `backend/app/alembic/versions/add_livingroom_hardware_columns.py`
- Aggiunte colonne: `door_servo_should_close`, `fan_should_run`

### 3. Deploy Backend
- Trasferito su Raspberry Pi via `escape-room-backend-endpoint-fix.tar.gz`
- Migration applicata con successo
- Backend testato: ✅ Tutti endpoint 200 OK

---

## 🔴 PROBLEMA SECONDARIO SCOPERTO

**Sintomo**: Dopo fix backend, le animazioni ESP32 (MAG1/MAG2) non partivano più!
- Frontend mostrava `currentStatus: undefined`
- WebSocket riceveva eventi ma non triggera animazioni
- Browser console: `index-UMEL07JN.js` (vecchio hash)

### Causa Root
1. **Deploy precedente "messaggi accavallati"** (18:26) aveva introdotto codice nel frontend
2. **Frontend Docker** sul Raspberry usava codice VECCHIO compilato
3. Docker Compose **rebuild usava cache** invece di nuovo codice
4. JavaScript compilato era del **15 Gen ore 21:47**, NON 23:36

### Problemi Tecnici
- `docker compose up -d frontend` ricompilava da sorgenti VECCHI sul Raspberry
- Tutti i layer Docker erano `CACHED` → codice vecchio
- File `index-UMEL07JN.js` rimasto invariato dopo "riavvio"

---

## ✅ SOLUZIONE FINALE

### Step 1: Trasferimento Codice Sorgente Aggiornato
```bash
# Su Mac
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
tar czf ../escape-room-source-fix.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.tar.gz' .

# Trasferimento al Raspberry  
sshpass -p "escape" scp escape-room-source-fix.tar.gz pi@192.168.8.10:/home/pi/
```

### Step 2: Backup e Sostituzione Codice
```bash
# Sul Raspberry
cd /home/pi
mv escape-room-3d escape-room-3d.backup-$(date +%Y%m%d-%H%M%S)
mkdir escape-room-3d
cd escape-room-3d
tar xzf ../escape-room-source-fix.tar.gz
```

### Step 3: Rebuild Completo (NO CACHE)
```bash
cd /home/pi/escape-room-3d

# Stop everything
docker compose down

# Remove old images
docker rmi -f $(docker images -q escape-room-3d-*)
docker system prune -f

# Rebuild from scratch
docker compose build --no-cache

# Start everything
docker compose up -d
```

---

## 🎯 VERIFICHE POST-FIX

### Backend Endpoints (✅ GIÀ VERIFICATI)
```bash
curl http://192.168.8.10:8001/api/game-completion/door-leds
curl http://192.168.8.10:8001/api/sessions/1000/livingroom-puzzles/door-servo-status
curl http://192.168.8.10:8001/api/sessions/1000/livingroom-puzzles/fan-status
```

### Frontend Rebuild
1. Verificare nuovo hash JavaScript:
```bash
docker exec escape-frontend ls -lh /usr/share/nginx/html/assets/*.js
# Deve mostrare file diverso da: index-UMEL07JN.js
```

2. Browser hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)

### Test Animazioni ESP32
1. Reset puzzle: `POST /api/sessions/1000/livingroom-puzzles/reset`
2. Trigger MAG1: `POST /api/sessions/1000/livingroom-puzzles/tv/complete`
3. Verificare nel browser che:
   - `livingRoomPuzzle.tvStatus` diventa `"completed"`
   - Animazione divano parte automaticamente
   - LED pianta diventa rosso

---

## 📝 LEZIONI APPRESE

### ⚠️ ERRORE DA EVITARE
**MAI** fare deploy solo del backend senza verificare che il frontend sia aggiornato!

### ✅ PROCEDURA CORRETTA PER DEPLOY
1. **Sempre trasferire codice sorgente aggiornato**
2. **Sempre rebuild con `--no-cache` dopo update codice**
3. **Verificare hash file JavaScript** prima di dichiarare fix completo
4. **Testare end-to-end** (ESP32 → Backend → Frontend → Animazione)

### 🔄 Perché Docker Compose Rebuild Non Basta
- Docker Compose cerca di ottimizzare usando cache
- Se i file sorgente sul server sono vecchi, ricompila codice vecchio
- **Soluzione**: Trasferire sempre sorgenti aggiornati PRIMA di rebuild

---

## 📊 TIMELINE COMPLETA

| Ora | Evento |
|-----|--------|
| 18:26 | Deploy "messaggi accavallati" - introduce bug |
| 21:00 | Segnalazione errori 404 ESP32 |
| 21:30 | Fix backend + migration → Endpoint 200 OK |
| 21:47 | Deploy frontend (ma codice vecchio sul Raspberry!) |
| 23:30 | Scoperto: frontend usa JavaScript vecchio (index-UMEL07JN.js) |
| 23:36 | Build nuovo frontend su Mac (index-iywTFq0u.js) |
| 23:37 | Tentativo load immagine → Docker Compose rebuild da cache vecchia |
| 23:50 | Trasferimento sorgenti aggior nati (130MB) |
| 23:53 | **Rebuild completo con --no-cache IN CORSO** |

---

## 🚀 PROSSIMI PASSI

1. ⏳ Attendere completamento rebuild (~5-10 minuti)
2. ✅ Verificare nuovo hash JavaScript nel container
3. 🧪 Testare MAG1/MAG2 con ESP32 fisico
4. 📝 Documentare procedura deploy definitiva

---

**Autore**: Sistema diagnostico Escape Room  
**Data Fix**: 15 Gennaio 2026, 23:53  
**Status**: 🔨 Rebuild in corso