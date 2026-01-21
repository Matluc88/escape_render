# 🗄️ Sistema Database per Spawn Positions

## 📋 Panoramica

Sistema completo per gestire le posizioni di spawn delle stanze tramite **database PostgreSQL** invece di coordinate hardcoded, con cache localStorage per performance.

---

## 🎯 Vantaggi

✅ **Coordinate centralizzate** - Modificabili senza redeploy frontend  
✅ **Cache intelligente** - localStorage con TTL 1 ora  
✅ **Fallback robusto** - Se API offline, usa coordinate hardcoded  
✅ **Multi-ambiente** - Dev/Staging/Prod possono avere coordinate diverse  
✅ **API RESTful** - Endpoint GET/POST per leggere/aggiornare posizioni  

---

## 🏗️ Architettura

```
┌─────────────────┐
│   PostgreSQL    │  ← Coordinate salvate in tabella 'rooms'
└────────┬────────┘
         │
    ┌────▼────┐
    │  FastAPI │  ← Endpoint /api/rooms/{name}/spawn
    └────┬────┘
         │
    ┌────▼────┐
    │ Frontend │  ← Caricamento async + cache localStorage
    └─────────┘
```

---

## 📦 Componenti Implementati

### **Backend**

#### 1. **Modello Database** (`backend/app/models/room.py`)
```python
spawn_data = Column(JSON, nullable=True)
# Formato: {"position": {"x": -1.02, "y": 0, "z": 0.11}, "yaw": -4.01359}
```

#### 2. **Migration Alembic** (`backend/alembic/versions/002_add_spawn_data.py`)
- Aggiunge colonna `spawn_data` a tabella `rooms`
- Popola con coordinate esistenti da `cameraPositioning.js`

#### 3. **Schema Pydantic** (`backend/app/schemas/room.py`)
```python
class SpawnDataResponse(BaseModel):
    position: Position3D  # {x, y, z}
    yaw: float            # Rotazione in radianti
```

#### 4. **Endpoint API** (`backend/app/api/rooms.py`)
- `GET /api/rooms/{room_name}/spawn` - Ottieni posizione spawn
- `POST /api/rooms/{room_name}/spawn` - Aggiorna posizione spawn

---

### **Frontend**

#### 1. **Client API** (`src/utils/api.js`)
```javascript
// Fetch con cache localStorage (TTL 1 ora)
fetchSpawnPosition('cucina')

// Aggiorna su database (invalidando cache)
updateSpawnPosition('cucina', {position: {x, y, z}, yaw})

// Utility
clearSpawnCache()
```

#### 2. **CameraPositioning** (`src/utils/cameraPositioning.js`)
```javascript
// Ora è ASYNC e carica da API
const spawn = await getCapturedPosition('cucina')
// PRIORITÀ: 1) API Database 2) Fallback hardcoded 3) null
```

#### 3. **KitchenScene** (`src/components/scenes/KitchenScene.jsx`)
- Caricamento **async** all'avvio
- Attende che spawn sia disponibile prima di creare FPSController
- Loading overlay copre eventuali flash visivi

---

## 🚀 Setup & Test

### **1. Applicare Migration al Database**

```bash
cd escape-room-3d/backend

# Opzione A: Usa Python module
python -m alembic upgrade head

# Opzione B: Se hai alembic installato globalmente
alembic upgrade head
```

**Output atteso:**
```
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, add spawn_data to rooms
```

### **2. Verificare che le Coordinate siano nel DB**

```bash
# Connettiti al database
psql -U your_user -d your_database

# Query per vedere le coordinate
SELECT name, spawn_data FROM rooms;
```

**Output atteso:**
```
   name    |                       spawn_data                        
-----------+--------------------------------------------------------
 cucina    | {"position": {"x": -1.02, "y": 0, "z": 0.11}, "yaw": -4.01359}
 bagno     | {"position": {"x": 1.35, "y": 0, "z": 0.52}, "yaw": -2.5992}
 camera    | {"position": {"x": -0.33, "y": 0, "z": -0.9}, "yaw": -5.7128}
 soggiorno | {"position": {"x": 0.74, "y": 0, "z": -0.87}, "yaw": -1.3464}
```

### **3. Avviare Backend**

```bash
cd escape-room-3d/backend
python -m uvicorn app.main:app --reload
```

### **4. Testare API Endpoint**

```bash
# Test GET spawn position
curl http://localhost:8000/api/rooms/cucina/spawn

# Output atteso:
# {
#   "position": {"x": -1.02, "y": 0, "z": 0.11},
#   "yaw": -4.01359
# }
```

### **5. Testare Frontend**

```bash
cd escape-room-3d
npm run dev
```

**Nel browser:**
1. Apri console dev (F12)
2. Clicca su "Cucina"
3. Osserva i log:

```
[API] 🌐 Fetching spawn from backend: /api/rooms/cucina/spawn
[API] ✅ Fetched and cached spawn for cucina: {position: {...}, yaw: -4.01}
[CameraPositioning] ✅ Loaded spawn from API for cucina
[KitchenScene] ✅ Usando coordinate da API/cache
```

4. **Ricarica la pagina** → Dovrebbe caricare da cache:

```
[API] ✅ Using cached spawn for cucina (age: 5s)
```

---

## 🔧 Debugging

### **Problema: API non raggiungibile**

**Sintomo:** Frontend usa fallback
```
[API] ❌ Error fetching spawn for cucina: Network Error
[CameraPositioning] 📦 Using FALLBACK for cucina
```

**Soluzione:**
1. Verifica che backend sia in esecuzione: `http://localhost:8000/docs`
2. Controlla `VITE_BACKEND_URL` in `.env`
3. Verifica CORS settings in `backend/app/main.py`

---

### **Problema: Migration non applicata**

**Sintomo:**
```sql
ERROR: column "spawn_data" does not exist
```

**Soluzione:**
```bash
cd escape-room-3d/backend
python -m alembic upgrade head
```

---

### **Problema: Cache vecchia**

**Sintomo:** Frontend usa coordinate obsolete

**Soluzione (nella console browser):**
```javascript
// Cancella cache specifica
localStorage.removeItem('spawn_cucina')

// Oppure cancella tutte le cache spawn
Object.keys(localStorage)
  .filter(k => k.startsWith('spawn_'))
  .forEach(k => localStorage.removeItem(k))
```

---

## 📝 Come Aggiornare Coordinate

### **Metodo 1: Tasto N (Cattura In-Game)**

1. Posizionati nel punto giusto
2. Premi `N` per catturare
3. Salva con nome stanza (es: "cucina")
4. Le coordinate vengono salvate in `localStorage`
5. *TODO: Implementare POST automatico al backend*

### **Metodo 2: API Manuale**

```bash
curl -X POST http://localhost:8000/api/rooms/cucina/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "position": {"x": -1.5, "y": 0, "z": 0.2},
    "yaw": -4.0
  }'
```

### **Metodo 3: SQL Diretto**

```sql
UPDATE rooms 
SET spawn_data = '{"position": {"x": -1.5, "y": 0, "z": 0.2}, "yaw": -4.0}'::json 
WHERE name = 'cucina';
```

---

## 🎯 Testing Checklist

- [ ] Migration applicata con successo
- [ ] Backend in esecuzione su porta 8000
- [ ] Frontend in esecuzione su porta 5173
- [ ] GET `/api/rooms/cucina/spawn` ritorna coordinate
- [ ] Console log mostra caricamento da API
- [ ] Refresh pagina → Cache localStorage funziona
- [ ] Backend offline → Fallback a coordinate hardcoded funziona
- [ ] Posizione spawn corretta in-game (no flash camera da letto)

---

## 📊 Performance

### **Con Backend Online**
- **Primo caricamento:** ~50-100ms (fetch API)
- **Caricamenti successivi:** <5ms (localStorage cache)

### **Con Backend Offline**
- **Fallback immediato:** <1ms (coordinate hardcoded)

---

## 🔮 Future Enhancements

1. **Admin UI** - Pannello per modificare coordinate via interfaccia
2. **Auto-save** - Tasto N salva anche su database (POST automatico)
3. **Versioning** - Storico modifiche coordinate
4. **Multi-room batch update** - Aggiorna tutte le stanze insieme
5. **Import/Export** - Backup/restore coordinate JSON

---

## 📚 File Modificati

### Backend
- ✅ `backend/app/models/room.py`
- ✅ `backend/app/schemas/room.py`
- ✅ `backend/app/api/rooms.py`
- ✅ `backend/alembic/versions/002_add_spawn_data.py`

### Frontend
- ✅ `src/utils/api.js`
- ✅ `src/utils/cameraPositioning.js`
- ✅ `src/components/scenes/KitchenScene.jsx`

---

## 🆘 Supporto

**Log importanti da controllare:**
- `[API]` - Operazioni API e cache
- `[CameraPositioning]` - Caricamento coordinate
- `[KitchenScene]` - Integrazione spawn position

**Documenti correlati:**
- `DEBUG_TELETRASPORTO.md` - Problema originale "primo click camera da letto"
- `COLLISION_SYSTEM_INTEGRATION.md` - Sistema collisioni

---

*Creato: 14/12/2025 - Sistema Database Spawn Positions v1.0*
