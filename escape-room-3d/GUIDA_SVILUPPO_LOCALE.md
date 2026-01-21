# 🛠️ GUIDA SVILUPPO LOCALE CON BACKEND

## 📋 PROBLEMA RISOLTO

**Problema originale:**
- In sviluppo locale (`npm run dev`), le coordinate spawn cambiavano al refresh
- Backend NON era attivo → frontend usava coordinate FALLBACK hardcoded (vecchie/sbagliate)
- In produzione Docker tutto funzionava perché backend + database erano attivi

**Soluzione:**
- Creato **ambiente di sviluppo Docker separato** (porte diverse da produzione)
- Frontend locale legge coordinate dal database PostgreSQL
- Coordinate **sempre corrette** e **mai cambiano** al refresh!

---

## 🎯 SETUP COMPLETATO

### File Creati:

1. **`backend/docker-compose.dev.yml`**
   - Stack Docker per sviluppo con porte diverse da produzione
   - Backend: `localhost:8001` (prod: 8000)
   - Database: `localhost:5433` (prod: 5432)
   - MQTT: `localhost:1884` (prod: 1883)

2. **`.env.local`**
   - Configurazione frontend per puntare al backend sviluppo
   - `VITE_BACKEND_URL=http://localhost:8001`
   - `VITE_WS_URL=ws://localhost:8001`

---

## 🚀 COME SVILUPPARE

### STEP 1: Avviare Backend Docker (Sviluppo)

```bash
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml up -d
```

**Servizi avviati:**
- ✅ PostgreSQL (sviluppo) su porta 5433
- ✅ Backend FastAPI su porta 8001
- ✅ MQTT Broker su porta 1884
- ✅ Coordinate spawn caricate dal database

**Verifica:**
```bash
curl http://localhost:8001/health
# Output: {"status":"healthy","mqtt":"connected","websocket_clients":0}
```

### STEP 2: Avviare Frontend (Vite)

```bash
cd escape-room-3d
npm run dev
```

**Frontend:**
- Parte su `http://localhost:5174`
- Legge coordinate da `http://localhost:8001` (backend sviluppo)
- File `.env.local` viene caricato automaticamente da Vite

### STEP 3: Sviluppare!

Ora puoi:
- ✅ Modificare codice frontend → hot reload immediato
- ✅ Coordinate spawn **sempre dal database** → mai cambiano!
- ✅ Backend e database isolati da produzione
- ✅ Testare tutto localmente prima del deploy

---

## 🔍 VERIFICA COORDINATE SPAWN

### Controllare tutte le coordinate nel database:

```bash
# Cucina
curl http://localhost:8001/rooms/cucina/spawn | python3 -m json.tool

# Soggiorno
curl http://localhost:8001/rooms/soggiorno/spawn | python3 -m json.tool

# Bagno
curl http://localhost:8001/rooms/bagno/spawn | python3 -m json.tool

# Camera
curl http://localhost:8001/rooms/camera/spawn | python3 -m json.tool
```

### Modificare coordinate (se necessario):

```bash
curl -X POST http://localhost:8001/rooms/cucina/spawn \
  -H "Content-Type: application/json" \
  -d '{"position":{"x":-4.02,"y":0.5,"z":-1.19},"yaw":-1.6}'
```

---

## 🏭 DEPLOY IN PRODUZIONE

### STEP 1: Stop Backend Sviluppo

```bash
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml down
```

### STEP 2: Build Produzione

```bash
cd escape-room-3d
docker-compose build
```

### STEP 3: Deploy su Raspberry Pi

```bash
# Opzione A: Docker Compose locale
docker-compose up -d

# Opzione B: Deploy remoto (se hai configurato)
./deploy-raspberry.sh
```

**IMPORTANTE:**
- Produzione usa file `.env.docker` (NON `.env.local`)
- Porte produzione: Frontend:80, Backend:8000, DB:5432
- Database produzione è SEPARATO da sviluppo

---

## 🗂️ ARCHITETTURA

```
SVILUPPO (Mac)
├─ Frontend: npm run dev → localhost:5174
├─ Backend Docker: localhost:8001
├─ PostgreSQL Docker: localhost:5433
└─ MQTT Docker: localhost:1884

PRODUZIONE (Raspberry Pi / Docker)
├─ Frontend: nginx → porta 80
├─ Backend: FastAPI → porta 8000 (interna)
├─ PostgreSQL: porta 5432 (interna)
└─ MQTT: porta 1883
```

---

## ⚙️ COMANDI UTILI

### Backend Sviluppo:

```bash
# Avviare
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml up -d

# Fermare
docker-compose -f docker-compose.dev.yml down

# Logs
docker-compose -f docker-compose.dev.yml logs -f web

# Riavviare (dopo modifiche backend)
docker-compose -f docker-compose.dev.yml restart web

# Reset completo database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Frontend:

```bash
# Sviluppo
npm run dev

# Build produzione
npm run build

# Pulire cache localStorage
# Apri console browser: localStorage.clear()
```

### Verifica setup:

```bash
# Backend attivo?
curl http://localhost:8001/health

# Database ha rooms?
curl http://localhost:8001/rooms

# Coordinate spawn cucina?
curl http://localhost:8001/rooms/cucina/spawn
```

---

## 🐛 TROUBLESHOOTING

### "Connection refused" su localhost:8001

```bash
# Verifica che backend sia avviato
docker ps | grep escape-backend-dev

# Riavvia backend
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml restart web
```

### "Coordinate spawn cambiano ancora!"

1. Verifica che `.env.local` sia caricato:
   ```bash
   # In console dev tools browser
   console.log(import.meta.env.VITE_BACKEND_URL)
   # Deve mostrare: http://localhost:8001
   ```

2. Pulisci localStorage:
   ```javascript
   // In console browser
   localStorage.clear()
   location.reload()
   ```

3. Verifica che backend risponda:
   ```bash
   curl http://localhost:8001/rooms/cucina/spawn
   ```

### "Conflitto di porte"

Se porte 8001/5433/1884 sono occupate, modifica `backend/docker-compose.dev.yml`:
```yaml
ports:
  - "8002:3000"  # Backend su 8002 invece di 8001
```

---

## ✅ CHECKLIST SVILUPPO

Prima di iniziare a sviluppare:

- [ ] Backend Docker avviato (`docker ps | grep escape-backend-dev`)
- [ ] Health check OK (`curl http://localhost:8001/health`)
- [ ] Coordinate spawn nel database (`curl http://localhost:8001/rooms/cucina/spawn`)
- [ ] Frontend Vite avviato (`npm run dev`)
- [ ] Browser aperto su `http://localhost:5174`
- [ ] Console browser senza errori di connessione

---

## 📝 NOTE IMPORTANTI

1. **`.env.local` NON va committato su Git**
   - È già in `.gitignore`
   - Usato solo per sviluppo locale

2. **Database sviluppo è SEPARATO da produzione**
   - Volume Docker: `postgres_dev_data`
   - Puoi resettarlo senza toccare produzione

3. **Porte diverse = Zero conflitti**
   - Sviluppo: 8001, 5433, 1884
   - Produzione: 8000, 5432, 1883

4. **Coordinate sempre dal database PostgreSQL**
   - NO localStorage come fonte principale
   - localStorage solo come cache con TTL 1 ora

---

## 🎉 VANTAGGI

✅ **Backend sempre attivo in sviluppo**
✅ **Coordinate sempre corrette dal database**
✅ **Hot reload frontend funziona**
✅ **Ambiente identico a produzione**
✅ **Zero conflitti con stack produzione**
✅ **Testi tutto prima del deploy**

---

**Creato il:** 17/12/2025
**Setup completato e testato:** ✅
