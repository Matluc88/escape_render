# 🚀 Guida Completa Deployment su Render

## 📋 Panoramica

Questa guida ti accompagna passo passo nel deployment del progetto Escape Room 3D su Render.com, includendo frontend, backend e database PostgreSQL.

---

## ⚠️ Limitazioni Render

### **MQTT Broker non supportato**
Render.com **non supporta** servizi MQTT (Mosquitto). Per usare l'integrazione ESP32:
- **Opzione 1**: Usa un servizio MQTT esterno (es. HiveMQ Cloud, CloudMQTT)
- **Opzione 2**: Deploy backend su un VPS (DigitalOcean, AWS) con Docker Compose completo

### **WebSocket Limitations**
Render Free tier ha limitazioni sui WebSocket:
- Timeout dopo 5 minuti di inattività
- Riconnessioni potrebbero essere necessarie

---

## 🎯 Architettura su Render

```
┌─────────────────────────────────────────┐
│         Render Dashboard                │
├─────────────────────────────────────────┤
│                                         │
│  📦 PostgreSQL Database (Free)          │
│     └─ escape-house-db                  │
│                                         │
│  🐍 Backend Web Service (Free)          │
│     └─ FastAPI + Python                 │
│     └─ URL: escape-house-backend.onrender.com
│                                         │
│  ⚛️  Frontend Static Site (Free)        │
│     └─ React + Vite                     │
│     └─ URL: escape-room-3d.onrender.com │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📝 Pre-requisiti

- [x] Account GitHub con repository pronto
- [x] Account Render.com (gratuito: https://render.com)
- [x] Repository GitHub: https://github.com/Matluc88/escape-room-3d

---

## 🔧 STEP 1: Setup Account Render

### 1.1 Registrazione
1. Vai su https://render.com
2. Clicca **"Get Started"**
3. Scegli **"Sign in with GitHub"**
4. Autorizza Render ad accedere ai tuoi repository

### 1.2 Collegamento Repository
Render richiede accesso al repository GitHub:
- Autorizza accesso a **Matluc88/escape-room-3d**
- O consenti accesso a tutti i repository

---

## 🗄️ STEP 2: Deploy Database PostgreSQL

### 2.1 Creazione Database
1. Nel Dashboard Render, clicca **"New +"** → **"PostgreSQL"**
2. Configura:
   - **Name**: `escape-house-db`
   - **Database**: `escape_db`
   - **User**: `escape_user`
   - **Region**: Frankfurt (o più vicina all'Italia)
   - **Plan**: **Free** (adatto per sviluppo)
3. Clicca **"Create Database"**

### 2.2 Info Connessione
Render genererà automaticamente:
```
Internal Database URL: postgresql://escape_user:PASSWORD@dpg-xxx/escape_db
External Database URL: postgresql://escape_user:PASSWORD@dpg-xxx-a.frankfurt-postgres.render.com/escape_db
```

**⚠️ IMPORTANTE**: Salva questi URL! Li userai nel backend.

### 2.3 Limitazioni Free Tier
- **Storage**: 1 GB
- **Scadenza**: Database eliminato dopo 90 giorni di inattività
- **Backup**: Non disponibili in free tier

---

## 🐍 STEP 3: Deploy Backend (FastAPI)

### 3.1 Creazione Web Service
1. Dashboard Render → **"New +"** → **"Web Service"**
2. Connetti repository: **Matluc88/escape-room-3d**
3. Configura:
   - **Name**: `escape-house-backend`
   - **Region**: Frankfurt (stessa del database!)
   - **Branch**: `clean-main`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker**
   - **Plan**: **Free**

### 3.2 Build Settings
Render userà automaticamente il Dockerfile presente in `backend/`:
- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `backend`

### 3.3 Variabili Ambiente

Clicca **"Advanced"** → **"Add Environment Variable"**

#### Variabili Obbligatorie:

```bash
# Database (Copia Internal Database URL dal database creato)
DATABASE_URL=postgresql://escape_user:PASSWORD@dpg-xxx/escape_db

# JWT Secret (Genera una chiave sicura)
SECRET_KEY=GENERA_UNA_CHIAVE_SICURA_QUI

# CORS Origins (URL del frontend - da configurare dopo)
CORS_ORIGINS=https://escape-room-3d.onrender.com,https://escape-house-backend.onrender.com

# WebSocket
WS_PORT=3000
```

#### Generare SECRET_KEY sicura:
```bash
# Su Mac/Linux:
openssl rand -base64 32

# Oppure Python:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Variabili Opzionali (per MQTT esterno):
```bash
MQTT_HOST=broker.hivemq.com  # O altro broker esterno
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

### 3.4 Health Check
- **Health Check Path**: `/health`
- Render verificherà ogni minuto che il backend risponda

### 3.5 Deploy
1. Clicca **"Create Web Service"**
2. Render inizierà il build (tempo: 3-5 minuti)
3. Monitora i log per verificare successo

### 3.6 URL Backend
Una volta deployato, avrai un URL tipo:
```
https://escape-house-backend.onrender.com
```

**Testa il backend**:
```bash
curl https://escape-house-backend.onrender.com/health
# Risposta: {"status":"healthy"}
```

---

## ⚛️ STEP 4: Deploy Frontend (React + Vite)

### 4.1 Creazione Static Site
1. Dashboard Render → **"New +"** → **"Static Site"**
2. Connetti repository: **Matluc88/escape-room-3d**
3. Configura:
   - **Name**: `escape-room-3d`
   - **Region**: Frankfurt
   - **Branch**: `clean-main`
   - **Root Directory**: `.` (root del progetto)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 4.2 Variabili Ambiente

Aggiungi le seguenti variabili:

```bash
# URL Backend (usa l'URL del backend deployato)
VITE_BACKEND_URL=https://escape-house-backend.onrender.com

# WebSocket URL (stesso del backend)
VITE_WS_URL=https://escape-house-backend.onrender.com
```

### 4.3 Configurazione Avanzata

#### Rewrite Rules (già in render.yaml):
Serve per il routing React (SPA):
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

#### Headers Cache:
```yaml
headers:
  - path: /*
    name: Cache-Control
    value: public, max-age=0, must-revalidate
```

### 4.4 Git LFS (se usi modelli 3D pesanti)
Se hai file GLB grandi (>100MB) tracciati con Git LFS:
```bash
buildCommand: git lfs install && git lfs pull && npm install && npm run build
```

### 4.5 Deploy
1. Clicca **"Create Static Site"**
2. Build time: 2-4 minuti (dipende dalla dimensione dei modelli 3D)
3. Monitora i log

### 4.6 URL Frontend
```
https://escape-room-3d.onrender.com
```

---

## 🔄 STEP 5: Configurazione Post-Deployment

### 5.1 Aggiorna CORS Backend
Ora che hai l'URL del frontend, aggiorna la variabile `CORS_ORIGINS` nel backend:

1. Vai al backend service su Render
2. **Environment** → **CORS_ORIGINS**
3. Modifica con:
```
https://escape-room-3d.onrender.com,https://escape-house-backend.onrender.com
```
4. Salva → Il backend si riavvierà automaticamente

### 5.2 Database Migrations
Esegui le migration del database:

#### Opzione A: Shell Render
1. Backend service → **"Shell"** (tab in alto)
2. Esegui:
```bash
cd /app
alembic upgrade head
```

#### Opzione B: Localmente
```bash
# Usa External Database URL
export DATABASE_URL="postgresql://escape_user:PASSWORD@dpg-xxx-a.frankfurt-postgres.render.com/escape_db"
cd backend
alembic upgrade head
```

### 5.3 Verifica Deployment

#### Test Backend:
```bash
# Health check
curl https://escape-house-backend.onrender.com/health

# API Docs
open https://escape-house-backend.onrender.com/docs
```

#### Test Frontend:
1. Apri https://escape-room-3d.onrender.com
2. Verifica che la scena 3D si carichi
3. Testa login/registrazione
4. Controlla la console browser per errori

---

## 📊 Monitoring e Logs

### Visualizzare Logs
1. Vai al servizio su Render Dashboard
2. Tab **"Logs"**
3. Logs in tempo reale del servizio

### Metriche
- **CPU/Memory Usage**: Disponibile nel dashboard
- **Request Count**: Statistiche richieste HTTP
- **Build History**: Cronologia deploy

---

## 🔧 Troubleshooting

### ❌ Backend non si avvia

**Problema**: Build fallisce o service crashato
```bash
# Controlla logs:
# Dashboard → Backend Service → Logs

# Errori comuni:
# 1. DATABASE_URL mancante o errato
# 2. Requirements.txt incompleto
# 3. Porte configurate male
```

**Soluzione**:
```bash
# 1. Verifica variabili ambiente
# 2. Controlla che DATABASE_URL usi Internal URL
# 3. Assicurati che SECRET_KEY sia configurata
```

### ❌ Frontend errore 500

**Problema**: Frontend non carica o errore CORS

**Soluzione**:
1. Verifica `VITE_BACKEND_URL` sia corretto
2. Controlla CORS_ORIGINS nel backend include frontend URL
3. Rebuild frontend dopo modifiche env vars

### ❌ Database connection refused

**Problema**: Backend non si connette al database

**Soluzione**:
```bash
# Usa Internal Database URL (più veloce e sicuro)
DATABASE_URL=postgresql://user:pass@dpg-xxx/db  # ✅ INTERNO
# NON:
DATABASE_URL=postgresql://user:pass@dpg-xxx-a.frankfurt-postgres.render.com/db  # ❌ ESTERNO
```

### ❌ WebSocket non funziona

**Problema**: Real-time features non funzionano

**Soluzione**:
- Render Free tier ha timeout WebSocket di 5 minuti
- Implementa reconnection logic nel frontend
- Considera upgrade a paid tier per produzione

### ❌ Build troppo lento

**Problema**: Build frontend richiede 10+ minuti

**Soluzione**:
```bash
# Rimuovi dipendenze non necessarie
# Ottimizza modelli 3D (comprimi GLB files)
# Considera lazy loading per modelli pesanti
```

---

## 💰 Costi e Limiti Free Tier

### Render Free Tier include:

#### PostgreSQL Database
- ✅ 1 GB storage
- ✅ Connessioni illimitate (ma lente)
- ❌ No backup automatici
- ⏰ Eliminato dopo 90 giorni inattività

#### Web Service (Backend)
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ Deploy automatici
- ⏰ Sleep dopo 15 min inattività (cold start ~30s)
- 🔄 Riavvio automatico ogni notte

#### Static Site (Frontend)
- ✅ 100 GB bandwidth/mese
- ✅ CDN globale
- ✅ SSL automatico
- ✅ No cold starts

### Upgrade a Paid Plans

Se il progetto va in produzione, considera upgrade:
- **Backend**: $7/mese (no sleep, più potente)
- **Database**: $7/mese (backup, più storage)
- **Total**: ~$14/mese per setup professionale

---

## 🎓 Best Practices

### 1. **Ambiente di Staging**
Crea un secondo set di servizi per testing:
```
- escape-room-3d-staging (frontend)
- escape-house-backend-staging (backend)
- escape-house-db-staging (database)
```

### 2. **Variabili Ambiente Sensibili**
✅ Usa sempre environment variables
❌ Mai committare password/secret nel codice

### 3. **Deploy Automatico**
Render supporta auto-deploy:
- Push su `clean-main` → auto-deploy
- Disabilita per produzione (deploy manuale)

### 4. **Monitoring**
Configura notifiche:
- Render Dashboard → Service → **Notifications**
- Email quando build fallisce
- Slack/Discord webhook per deploy

### 5. **Database Backup**
Free tier non ha backup automatici:
```bash
# Backup manuale periodico
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 🔐 Sicurezza

### Checklist Sicurezza:

- [ ] `SECRET_KEY` generata random (min 32 caratteri)
- [ ] `CORS_ORIGINS` limitato a domini specifici
- [ ] Database usa Internal URL (non External)
- [ ] SSL/HTTPS automatico su tutti i servizi ✅
- [ ] Variabili ambiente mai nel codice
- [ ] `.env` files in `.gitignore` ✅

---

## 📚 Risorse Utili

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Deploy FastAPI](https://render.com/docs/deploy-fastapi)
- [Deploy React](https://render.com/docs/deploy-vite)
- [PostgreSQL](https://render.com/docs/databases)

### Il Tuo Progetto
- **Repository**: https://github.com/Matluc88/escape-room-3d
- **Backend render.yaml**: `backend/render.yaml`
- **Frontend render.yaml**: `render.yaml`

---

## 🚀 Deploy Rapido (TL;DR)

### 1. Database
```
Dashboard → New → PostgreSQL
Name: escape-house-db
Plan: Free
Create Database → Copia Internal URL
```

### 2. Backend
```
Dashboard → New → Web Service
Repo: escape-room-3d, branch: clean-main
Root: backend, Runtime: Docker
Env vars:
  DATABASE_URL=<internal_url>
  SECRET_KEY=<random_32_chars>
  CORS_ORIGINS=https://escape-room-3d.onrender.com
Create → Copia URL backend
```

### 3. Frontend
```
Dashboard → New → Static Site
Repo: escape-room-3d, branch: clean-main
Build: npm install && npm run build
Publish: dist
Env vars:
  VITE_BACKEND_URL=<backend_url>
  VITE_WS_URL=<backend_url>
Create
```

### 4. Finalize
```
Backend → Update CORS_ORIGINS con URL frontend
Backend Shell → alembic upgrade head
Test: Apri frontend URL
```

---

## 🎉 Conclusioni

Dopo questa guida dovresti avere:

✅ Database PostgreSQL funzionante su Render
✅ Backend FastAPI deployato con API docs
✅ Frontend React 3D accessibile pubblicamente
✅ SSL/HTTPS automatico su tutti i servizi
✅ Auto-deploy da GitHub configurato

**URL Finali**:
- Frontend: `https://escape-room-3d.onrender.com`
- Backend: `https://escape-house-backend.onrender.com`
- API Docs: `https://escape-house-backend.onrender.com/docs`

---

**Ultimo aggiornamento**: 27 Dicembre 2025
**Versione**: 1.0

*Guida creata per il deployment del progetto Escape Room 3D su Render.com*
