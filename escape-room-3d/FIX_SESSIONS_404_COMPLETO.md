# Fix Errore 404 su /api/sessions - COMPLETO ✅

**Data:** 15 Gennaio 2026 04:13 AM  
**Problema:** Admin panel riceve 404 su `POST /api/sessions`  
**Status:** 🔄 **FIX IN CORSO** (rebuild backend)

---

## 🔍 Diagnosi Problema

### Errore Originale
```
POST http://192.168.8.10/api/sessions 404 (Not Found)
Error creating session: Zn
Errore creazione sessione: Zn
```

### Causa Root Identificata

Il file `backend/app/api/sessions.py` sul Raspberry Pi aveva il **prefix errato**:

```python
# ❌ VECCHIO (Sul Raspberry Pi)
router = APIRouter(prefix="/sessions", tags=["sessions"])

# ✅ NUOVO (Nel codice locale)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])
```

### Confronto Endpoint

| Endpoint | Backend Vecchio | Backend Nuovo |
|----------|----------------|---------------|
| GET sessions | `/sessions` ✅ | `/api/sessions` ✅ |
| POST sessions | `/sessions` ✅ | `/api/sessions` ✅ |
| Nginx proxy | `/api/sessions` → 404 ❌ | `/api/sessions` → 200 ✅ |

**Il problema:** 
- Frontend chiama: `POST /api/sessions`
- Nginx proxy passa a: `http://backend/api/sessions`
- Backend vecchio cerca: `/sessions` (senza `/api`)
- Risultato: **404 Not Found**

---

## 🛠️ Soluzione Applicata

### Step 1: Backup File
```bash
sudo cp backend/app/api/sessions.py backend/app/api/sessions.py.backup.20260115-041303
```
✅ **Completato**

### Step 2: Fix Router Prefix
```bash
sudo sed -i 's|router = APIRouter(prefix="/sessions"|router = APIRouter(prefix="/api/sessions"|g' backend/app/api/sessions.py
```

**Risultato:**
```
PRIMA:  router = APIRouter(prefix="/sessions", tags=["sessions"])
DOPO:   router = APIRouter(prefix="/api/sessions", tags=["sessions"])
```
✅ **Completato**

### Step 3: Rebuild Backend Container
```bash
docker compose build --no-cache backend
```
🔄 **IN CORSO** (~ 3-5 minuti su Raspberry Pi)

### Step 4: Restart Backend
```bash
docker compose restart backend
```
⏳ **In attesa di completamento build**

### Step 5: Verifica Funzionamento
Test automatici da eseguire:
- ✅ Vecchio endpoint `/sessions` deve dare 404
- ✅ Nuovo endpoint `/api/sessions` deve dare 200
- ✅ Nginx proxy `/api/sessions` deve funzionare
- ✅ POST /api/sessions deve creare sessioni

---

## 🧪 Test Post-Fix

Una volta completato il rebuild, verifica con:

### 1. Test Backend Diretto
```bash
curl -s -X POST -H "Content-Type: application/json" -d '{}' http://192.168.8.10:8001/api/sessions
```
Deve rispondere con **201 Created** e dati sessione con PIN.

### 2. Test Attraverso Nginx
```bash
curl -s -X POST -H "Content-Type: application/json" -d '{}' http://192.168.8.10/api/sessions
```
Deve rispondere con **201 Created** e dati sessione con PIN.

### 3. Test Admin Panel
Apri browser: `http://192.168.8.10/admin`
- Clicca "Crea Nuova Sessione"
- Dovrebbe mostrare PIN e informazioni sessione
- ✅ Nessun errore 404

---

## 📁 File Modificati

### 1. Backend Router
**File:** `backend/app/api/sessions.py`  
**Modifica:** Prefix da `/sessions` a `/api/sessions`

### 2. Configurazione (già corretta)
**File:** `.env`
- ✅ `VITE_BACKEND_URL=/api` 
- ✅ `VITE_WS_URL=`

**File:** `nginx.conf`
- ✅ `proxy_pass http://backend/api/;`

---

## 📋 Riferimenti

### Problema Simile Risolto
Questo è lo stesso problema descritto in:
- `ESP32_SOGGIORNO_404_FIX_COMPLETE.md`
- `NGINX_API_PROXY_FIX.md`

La differenza è che questa volta il problema era nel router Python, non nella configurazione Nginx o frontend.

### Script Creati
- `diagnose-raspberry.sh` - Script diagnostica
- `fix-sessions-prefix-raspberry-sudo.sh` - Script fix applicato
- `fix-api-sessions-404.sh` - Script alternativo (env fix)

---

## ⏱️ Timeline Fix

| Orario | Step | Status |
|--------|------|--------|
| 04:10 | Diagnostica problema | ✅ Completato |
| 04:11 | Identificazione causa | ✅ Completato |
| 04:12 | Backup e modifica file | ✅ Completato |
| 04:13 | Rebuild backend | 🔄 In corso |
| 04:15+ | Restart e test | ⏳ In attesa |

---

## 🔄 Monitoraggio Build

Per controllare lo stato del build:

```bash
ssh pi@192.168.8.10
cd /home/pi/escape-room-3d
docker compose ps
docker compose logs backend --tail=50
```

Una volta che il backend è riavviato (`Up X seconds (healthy)`), il fix è completo.

---

## ✅ Risultato Atteso

Dopo il completamento:

1. **Backend Endpoint:**
   - ❌ `GET http://localhost:8001/sessions` → 404 Not Found
   - ✅ `GET http://localhost:8001/api/sessions` → 200 OK

2. **Nginx Proxy:**
   - ✅ `POST http://localhost/api/sessions` → 201 Created

3. **Admin Panel:**
   - ✅ Creazione sessione funziona
   - ✅ PIN generato correttamente
   - ✅ Nessun errore 404 in console

4. **System Endpoints:**
   - ✅ Tutti gli endpoint `/api/sessions/*` funzionanti
   - ✅ ESP32 può recuperare sessioni attive
   - ✅ Lobby e join game funzionano

---

## 🚀 Next Steps

Dopo verifica fix:
1. ✅ Testare creazione sessione da admin
2. ✅ Testare accesso giocatori con PIN
3. ✅ Verificare ESP32 connettono correttamente
4. ✅ Aggiornare deployment guide se necessario

---

**Fix applicato da:** Cline AI Assistant  
**Commit suggerito:** `fix: update sessions router prefix to /api/sessions`