# 🚀 Sistema di Caricamento Spawn Asincrono

## 📋 Panoramica

Sistema completo per il caricamento asincrono delle posizioni di spawn dalle API/database, con overlay di caricamento visivo e gestione degli errori.

## 🏗️ Architettura

### Backend (PostgreSQL + FastAPI)

#### 1. **Modello Database** (`backend/app/models/room.py`)
```python
class Room(Base):
    spawn_position_x: Optional[float] = None
    spawn_position_y: Optional[float] = None
    spawn_position_z: Optional[float] = None
    spawn_yaw: Optional[float] = None
```

#### 2. **Migration Alembic** (`002_add_spawn_data.py`)
- Aggiunge colonne spawn al database
- Popola valori di default per tutte le stanze

#### 3. **API Endpoint** (`backend/app/api/rooms.py`)
```python
GET /api/rooms/{room_name}
# Ritorna: { id, name, spawn_position_x, spawn_position_y, spawn_position_z, spawn_yaw }
```

### Frontend (React + Three.js)

#### 1. **API Client** (`src/utils/api.js`)
```javascript
export async function fetchRoomSpawnPosition(roomName) {
  // Fetch da backend con fallback a localStorage
  // Cache automatica in localStorage
}
```

#### 2. **Utility Helper** (`src/utils/cameraPositioning.js`)
```javascript
export async function getCapturedPosition(roomName) {
  // Prova backend API
  // Fallback a localStorage
  // Fallback a null (usa default GLB)
}
```

#### 3. **Loading Overlay** (`src/components/UI/LoadingOverlay.jsx`)
- Componente generico riutilizzabile
- Animazione spinner CSS
- Messaggio personalizzabile

#### 4. **Scene Components**
Tutte le 5 scene implementano il pattern:

```javascript
const [spawnData, setSpawnData] = useState(null)
const [isLoadingSpawn, setIsLoadingSpawn] = useState(true)

useEffect(() => {
  const load = async () => {
    try {
      const captured = await getCapturedPosition('roomName')
      setSpawnData(captured ? { position, yaw } : null)
    } catch (e) {
      setSpawnData(null)
    } finally {
      setIsLoadingSpawn(false)
    }
  }
  load()
}, [])

if (isLoadingSpawn) {
  return <LoadingOverlay message="Caricamento..." />
}
```

## 🎯 Scene Implementate

| Scena | Room Name | Status |
|-------|-----------|--------|
| **KitchenScene** | `cucina` | ✅ |
| **LivingRoomScene** | `soggiorno` | ✅ |
| **BathroomScene** | `bagno` | ✅ |
| **BedroomScene** | `camera` | ✅ |
| **EsternoScene** | `esterno` | ✅ |

## 🔄 Flusso di Caricamento

### 1. **Mount Componente**
```
Component Mount
    ↓
isLoadingSpawn = true
    ↓
Render LoadingOverlay
```

### 2. **Caricamento Asincrono**
```
useEffect()
    ↓
getCapturedPosition(roomName)
    ↓
┌─────────────────────────┐
│ 1. API Backend          │ (PostgreSQL)
│    ↓ ERRORE             │
│ 2. localStorage         │ (Cache)
│    ↓ VUOTO              │
│ 3. null                 │ (Fallback a GLB default)
└─────────────────────────┘
    ↓
setSpawnData(result)
setIsLoadingSpawn(false)
```

### 3. **Render Scena**
```
isLoadingSpawn === false
    ↓
Render Canvas + FPSController
    ↓
spawnData ? API_POSITION : GLB_DEFAULT
```

## 📊 Priorità Spawn Position

### Priority Chain
```
1. 🥇 API Backend (PostgreSQL)
   - Dati centralizzati e persistenti
   - Sincronizzati tra dispositivi
   
2. 🥈 localStorage (Cache browser)
   - Fallback offline
   - Dati catturati con tasto N
   
3. 🥉 GLB Model Marker
   - Nodo "INIZIO_*" nel file 3D
   - Posizione definita in Blender
   
4. 🔻 Room Center (Bounding Box)
   - Centro geometrico della stanza
   - Fallback matematico
   
5. ⚠️ Origin (0, 0, 0)
   - Ultimo fallback di emergenza
```

## 🎨 UI Components

### LoadingOverlay
```jsx
<LoadingOverlay message="Caricamento cucina..." />
```

**Features:**
- Spinner CSS animato
- Messaggio personalizzato
- Overlay semi-trasparente
- Responsive
- Zero dipendenze esterne

### Styling
```css
.loading-overlay { /* Full screen centered */ }
.loading-spinner { /* Rotating border animation */ }
.loading-text { /* Fade-in animation */ }
```

## 🔧 Configurazione Backend

### 1. **Database**
```bash
cd backend
docker-compose up -d  # PostgreSQL + Mosquitto
```

### 2. **Migration**
```bash
alembic upgrade head  # Applica 002_add_spawn_data.py
```

### 3. **Server**
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. **Verifica API**
```bash
curl http://localhost:8000/api/rooms/cucina
# Output: {"id": 1, "name": "cucina", "spawn_position_x": -2.5, ...}
```

## 📝 Environment Variables

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost/escape_room
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
```

## 🧪 Testing

### Test API Endpoint
```bash
# Kitchen
curl http://localhost:8000/api/rooms/cucina

# Living Room
curl http://localhost:8000/api/rooms/soggiorno

# Bathroom
curl http://localhost:8000/api/rooms/bagno

# Bedroom
curl http://localhost:8000/api/rooms/camera

# Outside
curl http://localhost:8000/api/rooms/esterno
```

### Test Frontend
```bash
npm run dev
# Apri browser e naviga tra le stanze
# Console log mostra il caricamento:
# "[Kitchen] 🔍 CARICAMENTO spawn position async - START"
# "[Kitchen] ✅ Usando coordinate da API/cache"
```

## 🚨 Gestione Errori

### Backend Non Disponibile
```javascript
try {
  const response = await fetch('/api/rooms/cucina')
} catch (error) {
  console.warn('[API] Backend non raggiungibile, uso localStorage')
  // Fallback a localStorage automatico
}
```

### localStorage Vuoto
```javascript
const cached = localStorage.getItem('captured_positions')
if (!cached) {
  console.info('[localStorage] Nessuna cache, uso default GLB')
  return null // Usa spawn point dal modello 3D
}
```

### GLB Senza Marker
```javascript
if (!modelRef.spawnPoint) {
  console.warn('[GLB] Nessun marker INIZIO_*, uso room center')
  return calculateRoomCenter(boundaryLimits)
}
```

## 📈 Performance

### Metriche Attese
- **API Response Time**: < 100ms (localhost)
- **Loading Overlay Duration**: ~50-200ms
- **localStorage Access**: < 1ms
- **GLB Parse**: 0ms (già caricato)

### Ottimizzazioni
1. ✅ **Async/Await**: Non blocca il render
2. ✅ **Cache localStorage**: Riduce chiamate API
3. ✅ **Fallback Chain**: Sempre una posizione valida
4. ✅ **Loading State**: UX chiara durante il caricamento

## 🔐 Sicurezza

### CORS
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["GET", "POST", "PUT", "DELETE"],
)
```

### Validazione Input
```python
# backend/app/api/rooms.py
@router.get("/rooms/{room_name}")
async def get_room(room_name: str):
    if room_name not in VALID_ROOMS:
        raise HTTPException(404, "Room not found")
```

## 📚 Documentazione Correlata

- `DATABASE_SPAWN_SYSTEM.md` - Dettagli del database
- `COLLISION_SYSTEM_INTEGRATION.md` - Sistema collisioni
- `ANIMATION_SYSTEM_ARCHITECTURE.md` - Sistema animazioni

## 🎯 Future Improvements

### Possibili Estensioni
1. **Multiplayer Sync**: WebSocket per posizioni real-time
2. **Admin Panel**: UI per modificare spawn da browser
3. **A/B Testing**: Test diverse posizioni spawn
4. **Analytics**: Traccia quali spawn sono più usate
5. **Hotspot System**: Spawn multipli per stanza (teleport rapido)

## ✅ Checklist Implementazione

- [x] Backend database schema
- [x] Alembic migration con dati default
- [x] API endpoint GET /api/rooms/{name}
- [x] Frontend API client con cache
- [x] LoadingOverlay component
- [x] KitchenScene async loading
- [x] LivingRoomScene async loading
- [x] BathroomScene async loading
- [x] BedroomScene async loading
- [x] EsternoScene async loading
- [x] Error handling e fallback
- [x] Console logging per debug
- [x] Documentazione completa

---

**Status**: ✅ **PRODUZIONE READY**

Ultima modifica: 14/12/2025, 20:52
