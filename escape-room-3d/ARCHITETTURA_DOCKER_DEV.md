# Architettura Docker - Sviluppo vs Produzione

## 🎯 DUE AMBIENTI DOCKER SEPARATI

Il progetto ha **DUE stack Docker completamente separati**:

---

## 🟢 STACK PRODUZIONE (Gioco Completo)

### 📦 escape-backend
- **Container ID tipo**: 3d15c3035425
- **Immagine**: escape-room-3d-backend
- **Porta**: `3000 → 3000`
- **Ruolo**: API backend (FastAPI)
- **Include**: Logica di gioco, WebSocket, API REST
- **Comando avvio**: `docker-compose up -d` (dalla root)

### 🎮 escape-frontend
- **Container ID tipo**: 3ded32b619af
- **Immagine**: escape-room-3d-frontend
- **Porta**: `80 → 80`
- **Ruolo**: Frontend React + Three.js **CONTAINERIZZATO**
- **Include**: Build produzione del frontend
- **Accesso**: http://localhost:80

### 🗄️ escape-db
- **Container ID tipo**: 3daa6cd25c96
- **Immagine**: postgres:15-alpine
- **Porta**: ❌ Nessuna esposta (solo rete Docker interna)
- **Ruolo**: Database PostgreSQL produzione
- **Persistenza**: Volume Docker

### 📡 escape-mqtt
- **Container ID tipo**: 7dafbf121a14
- **Immagine**: eclipse-mosquitto:2
- **Porta**: `1883 → 1883` (MQTT)
- **Ruolo**: Broker MQTT produzione
- **Uso**: Comunicazione con ESP32

```yaml
# docker-compose.yml (root) - Stack PRODUZIONE
services:
  backend:
    container_name: escape-backend
    ports: ["3000:3000"]
  
  frontend:
    container_name: escape-frontend
    ports: ["80:80"]
  
  db:
    container_name: escape-db
    # Nessuna porta esposta
  
  mqtt:
    container_name: escape-mqtt
    ports: ["1883:1883"]
```

---

## 🟡 STACK SVILUPPO (Solo Backend con Hot-Reload)

### ⚙️ escape-backend-dev
- **Container ID tipo**: 804105cc7835
- **Immagine**: backend-web
- **Porta**: `8001 → 3000` ⚠️ **MAPPA INTERNO 3000 SU ESTERNO 8001**
- **Ruolo**: Backend API in modalità sviluppo
- **Volume mount**: `./backend/app → /app` (hot-reload automatico)
- **Comando avvio**: `cd backend && docker-compose up -d`

### 🗄️ escape-db-dev
- **Container ID tipo**: e040107ebabe
- **Immagine**: postgres:15-alpine
- **Porta**: `5433 → 5432` ⚠️ **Diversa da produzione!**
- **Ruolo**: Database PostgreSQL sviluppo
- **Separato**: Database completamente isolato da produzione

### 📡 escape-mqtt-dev
- **Container ID tipo**: 41cd4a0ed315
- **Immagine**: eclipse-mosquitto:2
- **Porta**: `1884 → 1883` ⚠️ **Diversa da produzione!**
- **Ruolo**: Broker MQTT sviluppo
- **Separato**: Broker isolato per test

### 🎨 Frontend Vite (NON containerizzato)
- **Processo**: Node.js locale
- **Porta**: `5173`
- **Ruolo**: Frontend React + Three.js in modalità DEV
- **Hot-reload**: Automatico Vite
- **Comando avvio**: `npm run dev` (dalla root)

```yaml
# backend/docker-compose.yml - Stack SVILUPPO
services:
  web:  # ⚠️ Nome servizio: "web", non "backend-dev"!
    container_name: escape-backend-dev
    ports: ["8001:3000"]  # Porta ESTERNA 8001!
    volumes:
      - ./app:/app  # Hot-reload
  
  db:
    container_name: escape-db-dev
    ports: ["5433:5432"]
  
  mqtt:
    container_name: escape-mqtt-dev
    ports: ["1884:1883"]
```

---

## 🔧 CONFIGURAZIONE SVILUPPO

### Frontend Dev (Vite - Porta 5173)
```bash
cd escape-room-3d
npm run dev
```

**Variabile d'ambiente**: `.env.local`
```env
VITE_BACKEND_URL=http://localhost:8001  # ⚠️ USA PORTA 8001 (backend-dev)!
```

### Backend Dev (Container - Porta 8001)
```bash
cd escape-room-3d/backend
docker-compose up -d
```

**Configurazione**: `backend/docker-compose.dev.yml`
- Volume mounting per hot-reload
- Porta esterna: 8001
- Porta interna: 3000

---

## 🔄 WORKFLOW SVILUPPO

### 1. Avvio Ambiente Dev
```bash
# 1. Avvia backend-dev container (porta 8001)
cd escape-room-3d/backend
docker-compose up -d

# 2. Avvia frontend Vite (porta 5173)
cd ..
npm run dev
```

### 2. Modifica Codice
- **Backend**: Modifichi file in `backend/app/` → container si riavvia automaticamente
- **Frontend**: Modifichi file in `src/` → Vite hot-reload automatico

### 3. Riavvio Backend Dopo Fix
```bash
# ⚠️ USA IL NOME SERVIZIO CORRETTO: "web"
cd escape-room-3d/backend
docker-compose restart web  # Nome servizio nel docker-compose.yml

# OPPURE usa il nome container:
docker restart escape-backend-dev
```

---

## 📊 TABELLA RIEPILOGATIVA COMPLETA

### 🟢 Ambiente PRODUZIONE
| Componente | Container | Porta | Accesso | Note |
|------------|-----------|-------|---------|------|
| **Backend API** | escape-backend | 3000→3000 | http://localhost:3000 | Stack completo |
| **Frontend** | escape-frontend | 80→80 | http://localhost:80 | Build produzione |
| **Database** | escape-db | (interno) | Solo rete Docker | PostgreSQL 15 |
| **MQTT** | escape-mqtt | 1883→1883 | mqtt://localhost:1883 | Broker produzione |

### 🟡 Ambiente SVILUPPO
| Componente | Container | Porta | Accesso | Hot-Reload |
|------------|-----------|-------|---------|------------|
| **Frontend Vite** | ❌ (locale) | 5173 | http://localhost:5173 | ✅ Automatico |
| **Backend API** | escape-backend-dev | 8001→3000 | http://localhost:8001 | ✅ Volume mount |
| **Database** | escape-db-dev | 5433→5432 | localhost:5433 | - |
| **MQTT** | escape-mqtt-dev | 1884→1883 | mqtt://localhost:1884 | - |

---

## ⚠️ ERRORI COMUNI

### ❌ Errore 1: Riavviare container sbagliato
```bash
# SBAGLIATO (riavvia produzione, non dev!)
docker-compose restart backend

# CORRETTO (riavvia dev)
cd backend && docker-compose restart backend-dev
```

### ❌ Errore 2: Frontend usa porta sbagliata
```env
# SBAGLIATO (usa produzione)
VITE_BACKEND_URL=http://localhost:3000

# CORRETTO (usa dev)
VITE_BACKEND_URL=http://localhost:8001
```

### ❌ Errore 3: Fix non applicato
- **Problema**: Modifichi il codice ma container non riavvia
- **Causa**: Docker non ha volume mount o cache vecchia
- **Soluzione**: 
  ```bash
  cd backend
  docker-compose down
  docker-compose up -d --build
  ```

---

## 🚀 COMANDI RAPIDI

```bash
# ═══════════════════════════════════════════════════
# SVILUPPO (usa nome servizio "web")
# ═══════════════════════════════════════════════════

# Log backend-dev live
cd backend && docker-compose logs -f web

# Restart backend-dev (dopo fix codice)
cd backend && docker-compose restart web

# Rebuild backend-dev (dopo cambio dipendenze)
cd backend && docker-compose up -d --build

# Stop tutto stack dev
cd backend && docker-compose down

# ═══════════════════════════════════════════════════
# PRODUZIONE
# ═══════════════════════════════════════════════════

# Log produzione
docker-compose logs -f backend

# Restart produzione
docker-compose restart backend

# Stop tutto stack produzione
docker-compose down

# ═══════════════════════════════════════════════════
# UTILITÀ GENERALI
# ═══════════════════════════════════════════════════

# Stato tutti i containers escape
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "escape|NAME"

# Restart diretto via nome container
docker restart escape-backend-dev
docker restart escape-backend

# Reset database dev (perdita dati!)
cd backend && docker-compose down -v && docker-compose up -d
```

---

## 📝 NOTE IMPORTANTI

1. **Due database separati**: postgres-escape (prod) e postgres-escape-dev (dev)
2. **Frontend Vite** si collega SEMPRE a porta **8001** (backend-dev)
3. **escape-backend** (porta 3000) è per test stack completo, NON per sviluppo
4. Quando applichi fix backend, riavvia **escape-backend-dev**, non escape-backend

---

## 🎓 QUANDO USARE COSA

### Usa escape-backend-dev (8001)
- ✅ Sviluppo quotidiano
- ✅ Test API changes
- ✅ Debug backend
- ✅ Hot reload

### Usa escape-backend (3000)
- ✅ Test integrazione completa
- ✅ Test prima del deploy
- ✅ Demo
- ✅ Produzione locale

---

## 🔍 VERIFICHE RAPIDE

```bash
# 1. Verifica backend-dev attivo
curl http://localhost:8001/docs

# 2. Verifica frontend Vite attivo
curl http://localhost:5173

# 3. Verifica variabile ambiente frontend
cat .env.local | grep VITE_BACKEND_URL

# 4. Verifica containers attivi
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep escape
```

Risultato atteso:
```
escape-backend-dev   0.0.0.0:8001->3000/tcp  ← QUESTO per sviluppo
escape-backend       0.0.0.0:3000->3000/tcp  ← QUESTO per produzione
```
