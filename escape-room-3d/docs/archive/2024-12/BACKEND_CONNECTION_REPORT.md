# 🔍 REPORT SISTEMA - Backend Connection Analysis

**Data Check:** 29/12/2025, 17:00
**Generato automaticamente dopo analisi completa del sistema**

---

## ✅ STATO SISTEMA: OPERATIVO

---

## 📦 CONTAINER DOCKER ATTIVI

### Stack: Backend-Dev (3 container)

| Nome Container | Immagine | Status | Porte Mappate |
|---|---|---|---|
| **escape-backend-dev** | backend-web | ✅ Healthy (1+ ora) | `0.0.0.0:8001` → `3000` |
| **escape-db-dev** | postgres:15-alpine | ✅ Healthy (1+ ora) | `0.0.0.0:5433` → `5432` |
| **escape-mqtt-dev** | eclipse-mosquitto:2 | ✅ Running (1+ ora) | `0.0.0.0:1884` → `1883`<br>`0.0.0.0:9002` → `9001` |

**⚠️ NOTA IMPORTANTE:**  
Le porte esterne sono **CUSTOM** (non standard) per evitare conflitti con altri servizi:
- Backend: **8001** (non 3000)
- Database: **5433** (non 5432)
- MQTT: **1884/9002** (non 1883/9001)

---

## 🏥 HEALTH CHECK BACKEND

```json
{
  "status": "healthy",
  "mqtt": "connected",
  "websocket_clients": 0
}
```

**Endpoint testato:** `http://localhost:8001/health`  
**Risultato:** ✅ **Backend completamente funzionante**

---

## 📝 CONFIGURAZIONE .env.local

**File:** `escape-room-3d/.env.local`

### ✅ CONFIGURAZIONE CORRETTA (Aggiornata)

```bash
# Override per sviluppo locale con backend Docker
# Backend usa porta 8001 (mappata da container interno 3000)
VITE_BACKEND_URL=http://localhost:8001
VITE_WS_URL=http://localhost:8001
```

**Correzione Applicata:**  
- ❌ Prima: `http://localhost:3000` (ERRATO)
- ✅ Dopo: `http://localhost:8001` (CORRETTO)

---

## 🔗 A QUALE BACKEND SI COLLEGANO I LINK?

### 📊 Risposta Definitiva

**TUTTI i link frontend** (`http://localhost:5173/*`) si collegano a:

```
┌─────────────────────────────────────┐
│   Browser                           │
│   http://localhost:5173/...         │
└──────────────┬──────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   Vite Dev Server :5173              │
│   (Frontend React)                   │
│   VITE_BACKEND_URL=localhost:8001    │
└──────────────┬───────────────────────┘
               │
               ↓ fetch('http://localhost:8001/api/...')
               │
┌──────────────┴───────────────────────┐
│   Docker Container                   │
│   escape-backend-dev                 │
│   Porta 8001 → 3000 (interno)        │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────┴───────────────────────┐
│   escape-db-dev (PostgreSQL)         │
│   Porta 5433 → 5432                  │
└──────────────────────────────────────┘
```

---

## 🎯 TABELLA COLLEGAMENTI PER OGNI LINK

| Link Frontend | Server Frontend | Backend | Database | MQTT |
|---|---|---|---|---|
| `http://localhost:5173/play/test-session/cucina?name=Admin` | Vite :5173 | escape-backend-dev<br>`:8001` | escape-db-dev<br>`:5433` | escape-mqtt-dev<br>`:1884/:9002` |
| `http://localhost:5173/dev/cucina` | Vite :5173 | escape-backend-dev<br>`:8001` | escape-db-dev<br>`:5433` | escape-mqtt-dev<br>`:1884/:9002` |
| `http://localhost:5173/s/.../cucina` | Vite :5173 | escape-backend-dev<br>`:8001` | escape-db-dev<br>`:5433` | escape-mqtt-dev<br>`:1884/:9002` |
| `http://localhost:5173/admin` | Vite :5173 | escape-backend-dev<br>`:8001` | escape-db-dev<br>`:5433` | escape-mqtt-dev<br>`:1884/:9002` |

**Conclusione:** Un unico backend per tutti i link! ✅

---

## 🚀 COME AVVIARE IL SISTEMA

### Setup Giornaliero Consigliato

```bash
# 1. Verifica container backend attivi
docker ps

# Dovresti vedere: escape-backend-dev, escape-db-dev, escape-mqtt-dev

# 2. Se non sono attivi, avviali
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d/backend
docker-compose up -d

# 3. Torna alla root del progetto
cd ..

# 4. Avvia frontend con Vite
npm run dev

# 5. Apri browser
# http://localhost:5173/play/test-session/cucina?name=Admin
```

---

## 🔧 COMANDI UTILI

### Verifica Health Backend
```bash
curl http://localhost:8001/health
```

### Logs Container
```bash
# Backend logs
docker logs escape-backend-dev -f

# Database logs
docker logs escape-db-dev -f

# MQTT logs
docker logs escape-mqtt-dev -f
```

### Restart Container
```bash
cd backend
docker-compose restart backend
```

### Stop Tutti i Container
```bash
cd backend
docker-compose down
```

---

## ⚠️ PROBLEMI RISOLTI

### ❌ Problema Iniziale
- Avevi **2 stack Docker** attivi contemporaneamente
- Stack completo (`escape-room-3d`) in conflitto con backend-dev
- File `.env.local` puntava a porta **3000** invece di **8001**

### ✅ Soluzione Applicata
1. ✅ Fermato stack completo (`docker-compose down`)
2. ✅ Mantenuto solo stack backend-dev
3. ✅ Corretto `.env.local` con porta **8001**

---

## 📋 CHECKLIST SVILUPPO

Prima di iniziare a lavorare:

- [x] Container backend-dev attivi (`docker ps`)
- [x] Backend healthy (`curl localhost:8001/health`)
- [x] `.env.local` configurato correttamente (porta 8001)
- [ ] `npm run dev` avviato
- [ ] Browser aperto su `localhost:5173`

---

## 🎓 INFO TECNICHE

### Porte Container Interne vs Esterne

**Backend Container:**
- Porta interna: `3000` (FastAPI ascolta qui)
- Porta esposta: `8001` (mappata da Docker)
- Frontend chiama: `http://localhost:8001`

**Database Container:**
- Porta interna: `5432` (PostgreSQL standard)
- Porta esposta: `5433` (mappata da Docker)
- Accessibile con: `psql -h localhost -p 5433 -U escape_user`

**MQTT Container:**
- Porta interna: `1883` (MQTT standard), `9001` (WebSocket)
- Porte esposte: `1884`, `9002`
- Dispositivi ESP32 devono connettersi a `IP_SERVER:1884`

---

## 📚 DOCUMENTI CORRELATI

- `SCENE_ROUTES_REFERENCE.md` - Guida completa route e link scene
- `LINK_SVILUPPO_SCENE.md` - Quick reference link sviluppo
- `ARCHITETTURA_DOCKER_DEV.md` - Architettura Docker dettagliata
- `.env.local` - Configurazione backend URL

---

## ✅ CONCLUSIONE

Il tuo sistema è **completamente configurato e funzionante**:

✅ Backend Docker attivo e healthy  
✅ Database PostgreSQL connesso  
✅ MQTT broker operativo  
✅ `.env.local` corretto con porta 8001  
✅ Pronto per `npm run dev`

**Prossimi passi:**
```bash
npm run dev
```

Poi apri: `http://localhost:5173/play/test-session/cucina?name=Admin`

---

**🎮 Buon Sviluppo!**

_Report generato il 29/12/2025 alle 17:00_
