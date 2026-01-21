# 🚀 Quick Start - Deployment Produzione

## ⚡ Deploy Rapido (5 minuti)

### 1️⃣ Configura Ambiente

```bash
# Entra nella directory
cd escape-room-3d

# Copia e modifica file ambiente
cp .env.production .env.production.local
nano .env.production.local
```

**⚠️ OBBLIGATORIO - Cambia questi valori:**

```bash
# Genera password database
openssl rand -base64 32
# → POSTGRES_PASSWORD=<incolla-qui>

# Genera secret key
openssl rand -base64 48
# → SECRET_KEY=<incolla-qui>

# Imposta il tuo dominio
# → CORS_ORIGINS=https://tuodominio.com
```

### 2️⃣ Deploy Automatico

```bash
# Rinomina file configurazione
mv .env.production.local .env.production

# Esegui deployment
./deploy-production.sh
```

✅ **Fatto!** L'applicazione sarà disponibile su: `http://localhost`

---

## 🎯 Comandi Principali

```bash
# Deploy completo
./deploy-production.sh

# Oppure usa Makefile
make -f Makefile.production deploy

# Visualizza stato
make -f Makefile.production status

# Visualizza logs
make -f Makefile.production logs

# Backup
make -f Makefile.production backup

# Lista tutti i comandi
make -f Makefile.production help
```

---

## 📦 Cosa Include il Deployment

### Servizi Attivi
- ✅ **Frontend** (React + Vite + Nginx) - Porta 80
- ✅ **Backend** (FastAPI + Python) - API REST
- ✅ **Database** (PostgreSQL 15)
- ✅ **MQTT Broker** (Mosquitto) - Porte 1883, 9001

### Features
- ✅ Multi-stage build ottimizzato
- ✅ Health checks automatici
- ✅ Auto-restart in caso di crash
- ✅ Nginx reverse proxy configurato
- ✅ Volumi persistenti per dati
- ✅ Rete isolata per container
- ✅ Limiti risorse configurabili
- ✅ Ottimizzato per Raspberry Pi

---

## 🔧 Comandi Utili Docker Compose

```bash
# Stato container
docker compose --env-file .env.production ps

# Logs in tempo reale
docker compose --env-file .env.production logs -f

# Restart singolo servizio
docker compose --env-file .env.production restart backend

# Stop tutto
docker compose --env-file .env.production down

# Rebuild e restart
docker compose --env-file .env.production up -d --build
```

---

## 💾 Backup & Restore

### Backup
```bash
# Backup automatico completo
./backup.sh

# Backup manuale database
docker exec escape-db pg_dump -U escape_user -F c escape_db > backup.dump
```

### Restore
```bash
# Lista backup disponibili
./restore.sh

# Restore specifico
./restore.sh 20241218_220000
```

---

## 🏥 Verifica Salute Applicazione

```bash
# Test frontend
curl http://localhost/health

# Test backend API
curl http://localhost/api/health

# Test database
docker exec escape-db pg_isready -U escape_user

# Status tutti i container
docker ps | grep escape-

# Risorse utilizzate
docker stats
```

---

## 🔍 Troubleshooting Rapido

### Container non si avvia
```bash
# Verifica logs
docker compose --env-file .env.production logs

# Ricostruisci da zero
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d --build --force-recreate
```

### Database non si connette
```bash
# Verifica password in .env.production
cat .env.production | grep POSTGRES_PASSWORD

# Test connessione
docker exec escape-db psql -U escape_user -d escape_db -c "SELECT 1"
```

### Frontend non raggiungibile
```bash
# Verifica porta esposta
docker ps | grep escape-frontend

# Test health
wget --spider http://localhost/health

# Reload Nginx
docker exec escape-frontend nginx -s reload
```

### Spazio disco esaurito
```bash
# Verifica spazio
docker system df

# Pulizia
docker system prune -a
docker volume prune
```

---

## 📊 Monitoring

### Logs in tempo reale
```bash
# Tutti i servizi
docker compose --env-file .env.production logs -f

# Servizio specifico
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f frontend
docker compose --env-file .env.production logs -f db
```

### Risorse
```bash
# Monitor risorse live
docker stats

# Dettagli container
docker inspect escape-backend

# Processi nel container
docker top escape-backend
```

---

## 🛡️ Checklist Sicurezza Pre-Produzione

- [ ] ✅ Password database modificata
- [ ] ✅ Secret key modificata  
- [ ] ✅ CORS origins configurato
- [ ] ✅ Firewall configurato (solo porte 22, 80, 443)
- [ ] ✅ HTTPS/SSL configurato (Let's Encrypt)
- [ ] ✅ Backup automatici schedulati
- [ ] ✅ Monitoring attivo
- [ ] ✅ Logs centralizzati
- [ ] ✅ Aggiornamenti programmati

---

## 📍 Porte Utilizzate

| Servizio | Porta Interna | Porta Esterna | Descrizione |
|----------|---------------|---------------|-------------|
| Frontend | 80 | 80 (configurabile) | Web UI |
| Backend | 3000 | - (via proxy) | API REST |
| Database | 5432 | - (interno) | PostgreSQL |
| MQTT | 1883 | 1883 | MQTT Broker |
| MQTT WS | 9001 | 9001 | MQTT WebSocket |

---

## 🌐 Accesso Applicazione

### Locale
- Frontend: `http://localhost`
- API: `http://localhost/api`
- WebSocket: `ws://localhost/ws`

### Rete Locale
```bash
# Trova IP del server
hostname -I | awk '{print $1}'

# Accedi da altri dispositivi
http://<IP-SERVER>
```

### Produzione
- Configura dominio e HTTPS
- Usa reverse proxy con SSL
- Esempio: `https://tuodominio.com`

---

## 🚀 Update Applicazione

```bash
# Pull nuove modifiche da git
git pull

# Rebuild e restart
docker compose --env-file .env.production down
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d

# Oppure usa Makefile
make -f Makefile.production update
```

---

## 📚 Documentazione Completa

Per maggiori dettagli consulta:
- **GUIDA_DEPLOYMENT_PRODUZIONE.md** - Guida completa
- **docker-compose.yml** - Configurazione servizi
- **Makefile.production** - Tutti i comandi disponibili
- **.env.production** - Variabili ambiente

---

## 🆘 Supporto

**Problema?** Segui questo ordine:
1. Controlla i logs: `docker compose logs`
2. Verifica la configurazione: `docker compose config`
3. Consulta GUIDA_DEPLOYMENT_PRODUZIONE.md
4. Usa il Troubleshooting rapido sopra

---

**🎉 Buon deployment!**
