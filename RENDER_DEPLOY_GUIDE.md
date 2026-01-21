# 🚀 Guida Deploy su Render

Questa guida spiega come deployare l'intero progetto Escape Room 3D su Render.com utilizzando il file `render.yaml`.

## 📋 Prerequisiti

- ✅ Account Render.com (gratuito)
- ✅ Repository GitHub configurata: https://github.com/Matluc88/escape_render
- ✅ Git LFS installato (per i modelli 3D .glb)

## 🏗️ Architettura

Il progetto è composto da 3 servizi:

1. **Frontend** - React + Vite + Three.js (`escape-room-3d/`)
2. **Backend** - FastAPI + WebSocket + MQTT (`escape-room-3d/backend/`)
3. **Database** - PostgreSQL

## 🔧 Configurazione Render

### Metodo 1: Blueprint (Consigliato)

1. **Accedi a Render.com**
   - Vai su https://render.com
   - Login con GitHub

2. **Crea un nuovo Blueprint**
   - Click su "New" → "Blueprint"
   - Seleziona la repository: `Matluc88/escape_render`
   - Render rileverà automaticamente il file `render.yaml`

3. **Configura le variabili d'ambiente**
   
   Per il **Backend** (`escape-room-backend`):
   ```
   CORS_ORIGINS=https://escape-room-frontend.onrender.com,http://localhost:5173
   ```
   
   Le altre variabili sono configurate automaticamente:
   - `DATABASE_URL` → connessione automatica al database
   - `JWT_SECRET` → generato automaticamente
   - `MQTT_HOST` → localhost
   - `MQTT_PORT` → 1883
   - `WS_PORT` → 3000

4. **Deploy**
   - Click su "Apply"
   - Render creerà automaticamente tutti e 3 i servizi
   - Tempo stimato: 10-15 minuti per il primo deploy

### Metodo 2: Manuale

Se preferisci creare i servizi uno alla volta:

#### A. Database

1. Click "New" → "PostgreSQL"
2. Nome: `escape-room-db`
3. Database: `escape_db`
4. User: `escape_user`
5. Plan: `Free`

#### B. Backend

1. Click "New" → "Web Service"
2. Connetti GitHub repository: `Matluc88/escape_render`
3. Configurazione:
   - **Name**: `escape-room-backend`
   - **Root Directory**: `escape-room-3d/backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Health Check Path**: `/health`
4. Environment Variables:
   ```
   DATABASE_URL=[copia da PostgreSQL internal connection string]
   CORS_ORIGINS=https://escape-room-frontend.onrender.com
   MQTT_HOST=localhost
   MQTT_PORT=1883
   WS_PORT=3000
   ```
5. Click "Create Web Service"

#### C. Frontend

1. Click "New" → "Static Site"
2. Connetti GitHub repository: `Matluc88/escape_render`
3. Configurazione:
   - **Name**: `escape-room-frontend`
   - **Root Directory**: `escape-room-3d`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:
   ```
   VITE_WS_URL=https://escape-room-backend.onrender.com
   VITE_API_URL=https://escape-room-backend.onrender.com
   ```
5. Click "Create Static Site"

## 🔍 Verifica Deploy

### 1. Backend

Visita: `https://escape-room-backend.onrender.com/`

Dovresti vedere:
```json
{
  "name": "Escape House Backend",
  "version": "1.0.0",
  "status": "running",
  "mqtt_connected": false,
  "websocket_connections": 0
}
```

Health check: `https://escape-room-backend.onrender.com/health`

### 2. Frontend

Visita: `https://escape-room-frontend.onrender.com/`

Dovresti vedere la landing page dell'Escape Room 3D.

### 3. Database

Nel dashboard Render:
- Verifica che lo stato sia "Available"
- Controlla i logs per eventuali errori

## 🐛 Troubleshooting

### Errore: "Root directory does not exist"
- ✅ Risolto con il nuovo `render.yaml` che specifica `rootDir`

### Frontend non si connette al Backend
- Verifica che `VITE_WS_URL` punti all'URL corretto del backend
- Controlla che `CORS_ORIGINS` nel backend includa l'URL del frontend

### Backend non si connette al Database
- Verifica che `DATABASE_URL` sia configurato correttamente
- Controlla i logs del backend per errori di connessione
- Il database potrebbe richiedere 2-3 minuti per essere ready

### Modelli 3D (.glb) non caricano
- Assicurati che Git LFS sia installato: `git lfs install`
- Verifica che il build command includa: `git lfs pull`

### Build lento del Frontend
- Il primo build può richiedere 10-15 minuti a causa dei file LFS
- I deploy successivi sono più veloci grazie alla cache

## 📊 Monitoraggio

### Logs

- **Backend**: Dashboard Render → escape-room-backend → Logs
- **Frontend**: Dashboard Render → escape-room-frontend → Build Logs
- **Database**: Dashboard Render → escape-room-db → Logs

### Metriche

Render Free Plan include:
- ✅ 750 ore/mese per web services
- ✅ 100 GB bandwidth/mese
- ✅ Sleep automatico dopo 15 min di inattività
- ✅ Database PostgreSQL 256 MB

## 🔄 Aggiornamenti

### Deploy Automatico

Il deploy è automatico ad ogni push su `main`:

```bash
git add .
git commit -m "Update: descrizione modifiche"
git push origin main
```

Render rileverà il push e avvierà automaticamente il deploy.

### Deploy Manuale

Nel dashboard Render:
1. Seleziona il servizio
2. Click "Manual Deploy" → "Deploy latest commit"

## 🔒 Sicurezza

### Variabili Sensibili

Non committare mai:
- ❌ `.env` con credenziali
- ❌ `DATABASE_URL` nel codice
- ❌ `JWT_SECRET` hardcoded

Usa sempre le Environment Variables di Render.

### CORS

Il backend è configurato per accettare richieste solo da:
- Frontend su Render
- Localhost (per sviluppo)

Aggiorna `CORS_ORIGINS` se cambi l'URL del frontend.

## 💰 Costi

**Piano Free** (attuale):
- ✅ Backend + Frontend + Database = **$0/mese**
- ⚠️ Sleep dopo 15 minuti di inattività
- ⚠️ Database limitato a 256 MB

**Per Produzione** (consigliato):
- Backend: $7/mese (sempre attivo)
- Database: $7/mese (1 GB storage)
- Frontend: Gratuito
- **Totale: $14/mese**

## 📞 Supporto

- 📧 Documentazione Render: https://render.com/docs
- 💬 Community Forum: https://community.render.com
- 🐛 GitHub Issues: https://github.com/Matluc88/escape_render/issues

---

## ✅ Checklist Deploy

- [ ] Account Render.com creato
- [ ] Repository GitHub connessa
- [ ] File `render.yaml` presente nella root
- [ ] Blueprint creato su Render
- [ ] Variabile `CORS_ORIGINS` configurata
- [ ] Tutti e 3 i servizi "Available"
- [ ] Backend health check funzionante
- [ ] Frontend accessibile
- [ ] WebSocket connesso (verifica console browser)
- [ ] Database connesso (verifica logs backend)

🎉 **Deploy completato!** Il tuo Escape Room 3D è online!