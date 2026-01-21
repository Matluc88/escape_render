# 🚀 Guida Deployment GitHub - Escape Room 3D

## 📋 Panoramica

Questo documento descrive come il progetto Escape Room 3D è stato caricato su GitHub e come gestirlo in futuro.

---

## 🔗 Repository GitHub

- **Repository Origin**: https://github.com/Matluc88/escape-room-3d.git
- **Repository Escape2**: https://github.com/Matluc88/ESCAPE2.0.git
- **Branch principale**: `clean-main`
- **Ultimo commit**: `6005ea9` - Update: Sistema spawn coordinato, fix race condition e documentazione aggiornata

---

## 📁 Struttura Progetto su GitHub

Il repository contiene:

### **Frontend** (React + Three.js + Vite)
```
/src/               # Codice sorgente React
  /components/      # Componenti React e 3D
    /3D/           # Modelli e scene Three.js
    /scenes/       # Scene specifiche (Bedroom, Kitchen, etc.)
    /UI/           # Componenti interfaccia utente
  /hooks/          # Custom React hooks
  /pages/          # Pagine dell'applicazione
  /utils/          # Utilities e helper functions
  /store/          # State management

/public/           # Asset statici
  /models/         # Modelli 3D (.glb files)
```

### **Backend** (FastAPI + PostgreSQL)
```
/backend/
  /app/
    /api/          # Endpoint REST API
    /models/       # Modelli database SQLAlchemy
    /schemas/      # Pydantic schemas
    /services/     # Business logic
    /websocket/    # WebSocket handlers
    /mqtt/         # MQTT integration per ESP32
  /alembic/        # Database migrations
```

### **Infrastruttura Docker**
```
docker-compose.yml       # Orchestrazione servizi
Dockerfile              # Build frontend
backend/Dockerfile      # Build backend
nginx.conf             # Reverse proxy
```

### **Documentazione**
```
/docs/                  # Documentazione tecnica
*.md                   # Guide varie (oltre 50 documenti!)
```

---

## 🔒 File Protetti (.gitignore)

I seguenti file **NON** sono caricati su GitHub per motivi di sicurezza:

### **File di Configurazione Sensibili**
- `.env` - Variabili ambiente locali
- `.env.local` - Override locali
- `backend/.env` - Configurazione backend
- `.env.production` - Configurazione produzione

### **Database e Backup**
- `*.sql` - Dump database
- `dev_full_dump.sql` - Backup sviluppo
- `postgres_backup*.sql` - Backup automatici
- `/backups/` - Directory backup completi

### **File Temporanei**
- `*.bak` - File backup
- `*.tar.gz` - Archivi compressi
- `/node_modules/` - Dipendenze npm
- `/dist/` - Build di produzione

### **File di Sistema**
- `.DS_Store` - File macOS
- `Thumbs.db` - File Windows

---

## 🔐 File di Esempio Inclusi

Per facilitare il setup, sono inclusi file di esempio:

- `.env.example` - Template variabili ambiente
- `backend/.env.example` - Template backend
- `.env.docker` - Configurazione Docker pronta all'uso

---

## 📦 Come Clonare e Configurare

### 1. **Clone del Repository**
```bash
git clone https://github.com/Matluc88/escape-room-3d.git
cd escape-room-3d
```

### 2. **Configurazione File Ambiente**
```bash
# Copia i file di esempio
cp .env.docker .env
cp backend/.env.example backend/.env

# IMPORTANTE: Modifica .env e backend/.env con le tue configurazioni
```

### 3. **Avvio con Docker**
```bash
# Avvio completo (consigliato)
./docker.sh up

# Oppure direttamente con docker-compose
docker-compose up -d
```

### 4. **Avvio Sviluppo Locale**
```bash
# Frontend
npm install
npm run dev

# Backend (in altra finestra terminale)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 🔄 Workflow Git Consigliato

### **Fare Modifiche e Push**
```bash
# 1. Verifica stato
git status

# 2. Aggiungi modifiche
git add .

# 3. Commit con messaggio descrittivo
git commit -m "Descrizione modifiche"

# 4. Push su GitHub
git push origin clean-main
```

### **Sincronizzare con Repository Remoto**
```bash
# Pull ultimi aggiornamenti
git pull origin clean-main

# In caso di conflitti, risolvi manualmente e poi:
git add .
git commit -m "Risolti conflitti"
git push origin clean-main
```

---

## 📊 Componenti del Progetto

### **Frontend**
- **React 18** + **Vite** - Build tool veloce
- **Three.js** / **@react-three/fiber** - Rendering 3D
- **@react-three/drei** - Helper 3D
- **Socket.IO** - WebSocket real-time
- **Zustand** - State management

### **Backend**
- **FastAPI** - Framework Python async
- **PostgreSQL** - Database relazionale
- **SQLAlchemy** - ORM
- **Alembic** - Migration database
- **Socket.IO** - WebSocket server
- **Paho MQTT** - Client MQTT per ESP32

### **Infrastruttura**
- **Docker** + **Docker Compose** - Containerizzazione
- **Nginx** - Reverse proxy
- **Mosquitto** - MQTT broker

---

## 🎯 Branch Strategy

Attualmente si usa un branch principale:

- **clean-main**: Branch di sviluppo e produzione

### **Suggerimento per il Futuro**
Considera di adottare una strategia branch più strutturata:

```
main          → Produzione stabile
develop       → Sviluppo attivo
feature/*     → Nuove funzionalità
hotfix/*      → Fix urgenti
```

---

## 📝 Database Migrations

Le migration del database sono gestite con Alembic:

### **Creare Nuova Migration**
```bash
cd backend
alembic revision --autogenerate -m "Descrizione modifica"
```

### **Applicare Migration**
```bash
alembic upgrade head
```

### **Rollback**
```bash
alembic downgrade -1
```

---

## 🔧 Configurazioni Importanti

### **CORS (Cross-Origin Resource Sharing)**
Il backend accetta richieste da:
- `http://localhost`
- `http://localhost:80`
- `http://localhost:3000`

Modifica in `.env`:
```env
CORS_ORIGINS=http://localhost,http://192.168.x.x
```

### **Database**
Configurazione in `.env`:
```env
POSTGRES_USER=escape_user
POSTGRES_PASSWORD=TUA_PASSWORD_SICURA
POSTGRES_DB=escape_db
```

### **MQTT per ESP32**
```env
MQTT_PORT=1883
MQTT_WS_PORT=9001
```

---

## 🚨 Sicurezza: COSA NON FARE

❌ **Non committare MAI**:
- Password o chiavi API in chiaro
- File `.env` con credenziali reali
- Dump completi del database con dati sensibili
- Token di autenticazione

✅ **Sempre**:
- Usa variabili d'ambiente per dati sensibili
- Controlla `.gitignore` prima di committare
- Usa `git status` per verificare cosa stai per committare
- Genera password forti per produzione

---

## 📚 Documentazione Disponibile

Il progetto include oltre **50 documenti** di guida:

### **Setup e Deployment**
- `README.md` - Guida principale
- `GUIDA_DOCKER.md` - Setup Docker completo
- `AVVIO_RAPIDO.md` - Quick start
- `DOCKER_QUICKSTART.md` - Docker veloce

### **Sistemi Specifici**
- `LOBBY_SYSTEM_GUIDE.md` - Sistema lobby multiplayer
- `KITCHEN_PUZZLE_INTEGRATION.md` - Puzzle cucina
- `ANIMATION_EDITOR_GUIDE.md` - Editor animazioni
- `SPAWN_COORDINATES_REFERENCE.md` - Coordinate spawn

### **Fix e Troubleshooting**
- `SPAWN_DOCKER_FIX_FINALE.md` - Fix spawn in Docker
- `KITCHEN_LED_FIX_FINALE.md` - Fix LED cucina
- `WEBSOCKET_LED_COMPLETE_FIX.md` - Fix WebSocket

---

## 🎮 Testing

### **Frontend**
```bash
npm run dev         # Sviluppo
npm run build       # Build produzione
npm run preview     # Preview build
```

### **Backend**
```bash
# Test manuale API
curl http://localhost:3000/api/health

# Con Docker
curl http://localhost/api/health
```

### **Database**
```bash
# Accesso al database
docker exec -it escape-room-db psql -U escape_user -d escape_db

# Query di test
SELECT * FROM game_sessions LIMIT 5;
```

---

## 🔗 Collegamenti Utili

- **Repository Origin**: https://github.com/Matluc88/escape-room-3d
- **FastAPI Docs**: http://localhost:3000/docs (sviluppo)
- **Frontend Dev**: http://localhost:5173 (npm run dev)
- **Frontend Prod**: http://localhost (Docker)

---

## 📞 Supporto

Per problemi o domande:
1. Controlla la documentazione in `/docs/`
2. Verifica i file `*_FIX.md` per problemi noti
3. Consulta `GUIDA_DOCKER.md` per problemi Docker

---

## 🎉 Conclusioni

Il progetto è ora completamente su GitHub con:

✅ **Frontend React + Three.js** completo
✅ **Backend FastAPI + PostgreSQL** funzionante
✅ **Docker Compose** per deployment facile
✅ **Documentazione** estensiva (50+ guide)
✅ **Sistema di sicurezza** con .gitignore configurato
✅ **MQTT Integration** per ESP32
✅ **WebSocket** per comunicazione real-time

**Ultimo update**: 27 Dicembre 2025
**Commit**: `6005ea9`
**Branch**: `clean-main`

---

*Documento creato automaticamente durante il deployment su GitHub*
