# ⚡ Render Quick Start - Escape Room 3D

## 🚀 Deploy in 5 Minuti

### 📋 Checklist Pre-Deploy
- [ ] Account GitHub attivo
- [ ] Repository su GitHub (https://github.com/Matluc88/escape-room-3d)
- [ ] Account Render.com creato

---

## 🎯 STEP 1: Database (2 min)

```
1. Render Dashboard → New + → PostgreSQL
2. Configurazione:
   Name: escape-house-db
   Database: escape_db
   User: escape_user
   Region: Frankfurt
   Plan: Free
3. Create Database
4. ⚠️ COPIA "Internal Database URL"
```

**Esempio URL**:
```
postgresql://escape_user:xyz123@dpg-abc/escape_db
```

---

## 🎯 STEP 2: Backend (3 min)

```
1. Dashboard → New + → Web Service
2. Connect GitHub: escape-room-3d
3. Configurazione:
   Name: escape-house-backend
   Region: Frankfurt
   Branch: clean-main
   Root Directory: backend
   Runtime: Docker
   Plan: Free
```

### Environment Variables:
```bash
DATABASE_URL=<paste_internal_url_from_step1>
SECRET_KEY=<generate_random_32_chars>
CORS_ORIGINS=https://escape-room-3d.onrender.com
WS_PORT=3000
```

**Genera SECRET_KEY**:
```bash
openssl rand -base64 32
```

```
4. Create Web Service
5. ⚠️ COPIA "Service URL" (es: https://escape-house-backend.onrender.com)
```

---

## 🎯 STEP 3: Frontend (2 min)

```
1. Dashboard → New + → Static Site
2. Connect GitHub: escape-room-3d
3. Configurazione:
   Name: escape-room-3d
   Region: Frankfurt
   Branch: clean-main
   Root Directory: . (root)
   Build Command: npm install && npm run build
   Publish Directory: dist
   Plan: Free
```

### Environment Variables:
```bash
VITE_BACKEND_URL=<paste_backend_url_from_step2>
VITE_WS_URL=<same_as_backend_url>
```

```
4. Create Static Site
```

---

## 🎯 STEP 4: Finalize (1 min)

### 4.1 Aggiorna CORS Backend
```
1. Backend Service → Environment
2. CORS_ORIGINS → Edit
3. Aggiungi frontend URL:
   https://escape-room-3d.onrender.com,https://escape-house-backend.onrender.com
4. Save (si riavvia automaticamente)
```

### 4.2 Database Migration
```
Backend Service → Shell (tab in alto)

Esegui:
cd /app
alembic upgrade head
```

---

## ✅ Test Finale

### Backend:
```bash
curl https://escape-house-backend.onrender.com/health
# ✅ Risposta: {"status":"healthy"}
```

### Frontend:
```
Apri: https://escape-room-3d.onrender.com
✅ Dovrebbe caricare la scena 3D
```

### API Docs:
```
https://escape-house-backend.onrender.com/docs
```

---

## 🔧 Troubleshooting Rapido

### Backend non parte?
```bash
# 1. Controlla logs: Backend Service → Logs
# 2. Verifica DATABASE_URL sia Internal URL (dpg-xxx, non dpg-xxx-a.frankfurt...)
# 3. Verifica SECRET_KEY configurata
```

### Frontend errore CORS?
```bash
# 1. Verifica CORS_ORIGINS nel backend include frontend URL
# 2. Rebuild backend: Manual Deploy → Deploy Latest Commit
```

### Database connection error?
```bash
# Usa INTERNAL URL, non External:
✅ postgresql://user:pass@dpg-xxx/db
❌ postgresql://user:pass@dpg-xxx-a.frankfurt-postgres.render.com/db
```

---

## 📊 URL Finali

Dopo deploy dovresti avere:

| Servizio | URL |
|----------|-----|
| **Frontend** | https://escape-room-3d.onrender.com |
| **Backend** | https://escape-house-backend.onrender.com |
| **API Docs** | https://escape-house-backend.onrender.com/docs |
| **Database** | Internal URL (privato) |

---

## 💡 Tips

### Auto-Deploy
✅ Ogni push su `clean-main` → auto-deploy
⚙️ Disabilita in produzione: Service Settings → Auto-Deploy: OFF

### Free Tier Limits
- Backend dorme dopo 15 min inattività (cold start ~30s)
- Database: 1 GB, eliminato dopo 90 giorni inattività
- WebSocket timeout dopo 5 minuti

### Monitoring
```
Dashboard → Service → Logs
Dashboard → Service → Metrics
```

---

## 🎓 Guida Completa

Per dettagli avanzati, troubleshooting e best practices:
📖 **RENDER_DEPLOYMENT_GUIDE.md**

---

## 🚨 Note Importanti

### MQTT Non Supportato
Render **non supporta** Mosquitto MQTT. Alternative:
- Usa broker esterno (HiveMQ Cloud, CloudMQTT)
- Deploy completo su VPS con Docker Compose

### Backup Database
Free tier non ha backup automatici:
```bash
# Backup manuale
pg_dump <EXTERNAL_URL> > backup.sql
```

---

**Tempo totale**: ~8 minuti
**Costo**: $0 (Free tier)
**Ultimo update**: 27 Dicembre 2025
