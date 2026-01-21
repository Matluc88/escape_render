# 🚀 Escape Room 3D - Deployment Produzione Docker

## 📦 Configurazione Completa Pronta!

Tutto è pronto per mandare in produzione l'applicazione Escape Room 3D con Docker!

---

## 📂 File di Deployment Creati

### 🔧 Configurazione
- ✅ **`.env.production`** - Variabili ambiente produzione
- ✅ **`docker-compose.yml`** - Orchestrazione servizi (già esistente)
- ✅ **`Dockerfile`** - Build frontend (già esistente)
- ✅ **`backend/Dockerfile`** - Build backend (già esistente)
- ✅ **`nginx.conf`** - Configurazione reverse proxy (già esistente)

### 🚀 Script di Deployment
- ✅ **`deploy-production.sh`** - Deploy automatico completo
- ✅ **`backup.sh`** - Backup automatico database e configurazioni
- ✅ **`restore.sh`** - Restore da backup
- ✅ **`Makefile.production`** - Comandi rapidi per gestione

### 📚 Documentazione
- ✅ **`GUIDA_DEPLOYMENT_PRODUZIONE.md`** - Guida completa dettagliata
- ✅ **`QUICK_START_PRODUZIONE.md`** - Quick start per deploy rapido
- ✅ **`README_PRODUZIONE.md`** - Questo file (overview)

---

## ⚡ Deploy in 3 Step

### 1. Configura Ambiente
```bash
# Modifica .env.production con le tue password
nano .env.production

# OBBLIGATORIO - Cambia:
# - POSTGRES_PASSWORD
# - SECRET_KEY
# - CORS_ORIGINS
```

### 2. Esegui Deploy
```bash
# Deploy automatico
./deploy-production.sh
```

### 3. Verifica
```bash
# Controlla stato
docker compose --env-file .env.production ps

# Test applicazione
curl http://localhost/health
```

✅ **Fatto! Applicazione online su http://localhost**

---

## 🎯 Comandi Rapidi con Makefile

```bash
# Deploy
make -f Makefile.production deploy

# Status
make -f Makefile.production status

# Logs
make -f Makefile.production logs

# Backup
make -f Makefile.production backup

# Health check
make -f Makefile.production health

# Lista tutti i comandi
make -f Makefile.production help
```

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                  │
│             Frontend + Reverse Proxy                │
└────────────┬──────────────────────┬─────────────────┘
             │                      │
    ┌────────▼────────┐    ┌───────▼────────┐
    │   Backend API    │    │  MQTT Broker   │
    │   FastAPI:3000   │    │  Port 1883     │
    └────────┬─────────┘    └────────────────┘
             │
    ┌────────▼─────────┐
    │   PostgreSQL     │
    │   Database       │
    └──────────────────┘
```

### Servizi
- **Frontend**: React + Vite + Nginx (porta 80)
- **Backend**: FastAPI + Python 3.11 (porta interna 3000)
- **Database**: PostgreSQL 15 Alpine
- **MQTT**: Eclipse Mosquitto 2 (porte 1883, 9001)

### Features
- ✅ Multi-stage build per ottimizzazione
- ✅ Health checks su tutti i servizi
- ✅ Auto-restart in caso di crash
- ✅ Volumi persistenti per dati
- ✅ Rete Docker isolata
- ✅ Reverse proxy Nginx configurato
- ✅ Compressione gzip
- ✅ Cache statica ottimizzata
- ✅ WebSocket support
- ✅ MQTT WebSocket proxy
- ✅ Ottimizzato per Raspberry Pi

---

## 📊 Gestione Operativa

### Monitoring
```bash
# Stato in tempo reale
make -f Makefile.production status

# Risorse utilizzate
docker stats

# Logs live
make -f Makefile.production logs
```

### Backup
```bash
# Backup automatico
make -f Makefile.production backup

# Restore
make -f Makefile.production restore BACKUP=20241218_220000
```

### Manutenzione
```bash
# Restart
make -f Makefile.production restart

# Update
make -f Makefile.production update

# Pulizia
make -f Makefile.production clean
```

---

## 🛡️ Checklist Pre-Produzione

### Sicurezza
- [ ] Password database modificata
- [ ] Secret key modificata
- [ ] CORS origins configurato per il tuo dominio
- [ ] Firewall configurato (solo porte necessarie)
- [ ] HTTPS/SSL configurato (Let's Encrypt consigliato)

### Operatività
- [ ] Backup automatici schedulati (cron)
- [ ] Monitoring configurato
- [ ] Alerting impostato
- [ ] Piano di disaster recovery definito

### Performance
- [ ] Limiti risorse configurati
- [ ] Cache configurata
- [ ] CDN per asset statici (opzionale)
- [ ] Database ottimizzato

---

## 📍 Porte e Accessi

### Porte Pubbliche
- **80** - Frontend HTTP (modificabile in .env.production)
- **1883** - MQTT Broker
- **9001** - MQTT WebSocket

### Porte Interne
- **3000** - Backend API (non esposta, via proxy)
- **5432** - PostgreSQL (non esposta)

### URLs
- Frontend: `http://localhost` o `http://<IP-SERVER>`
- API: `http://localhost/api`
- WebSocket: `ws://localhost/ws`
- MQTT: `mqtt://localhost:1883`

---

## 🔍 Troubleshooting

### Container non si avvia
```bash
docker compose --env-file .env.production logs
docker compose --env-file .env.production up -d --force-recreate
```

### Database non si connette
```bash
docker exec escape-db pg_isready -U escape_user
docker compose --env-file .env.production logs db
```

### Frontend non raggiungibile
```bash
curl http://localhost/health
docker exec escape-frontend nginx -t
```

### Logs dettagliati
```bash
# Backend
make -f Makefile.production logs-backend

# Frontend
make -f Makefile.production logs-frontend

# Database
make -f Makefile.production logs-db
```

---

## 📚 Documentazione

### Guide Complete
- **QUICK_START_PRODUZIONE.md** - Guida rapida (5 minuti)
- **GUIDA_DEPLOYMENT_PRODUZIONE.md** - Guida completa e dettagliata

### Configurazione
- **docker-compose.yml** - Definizione servizi
- **Dockerfile** - Build frontend
- **backend/Dockerfile** - Build backend
- **nginx.conf** - Configurazione Nginx
- **.env.production** - Variabili ambiente

### Script
- **deploy-production.sh** - Deploy automatico
- **backup.sh** - Backup automatico
- **restore.sh** - Restore da backup
- **Makefile.production** - Comandi gestione

---

## 🚀 Next Steps

### 1. Configurazione Base
```bash
# Modifica variabili ambiente
nano .env.production

# Deploy
./deploy-production.sh
```

### 2. Configurazione Avanzata (Opzionale)

#### HTTPS con Let's Encrypt
```bash
# Installa Certbot
sudo apt install certbot python3-certbot-nginx

# Ottieni certificato
sudo certbot --nginx -d tuodominio.com
```

#### Backup Automatici
```bash
# Aggiungi a crontab
crontab -e

# Backup giornaliero alle 2 AM
0 2 * * * cd /path/to/escape-room-3d && ./backup.sh
```

#### Monitoring con Portainer
```bash
docker volume create portainer_data
docker run -d -p 9000:9000 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

### 3. Test e Verifica
```bash
# Health check completo
make -f Makefile.production health

# Test carico (opzionale)
# Installa Apache Bench
sudo apt install apache2-utils

# Test 1000 richieste, 10 concorrenti
ab -n 1000 -c 10 http://localhost/
```

---

## 🎓 Best Practices

### Sicurezza
- ✅ Usa password forti generate casualmente
- ✅ Configura HTTPS in produzione
- ✅ Limita accesso porte non necessarie
- ✅ Aggiorna regolarmente le immagini Docker
- ✅ Monitora logs per attività sospette

### Backup
- ✅ Backup automatici giornalieri
- ✅ Testa restore periodicamente
- ✅ Conserva backup offsite
- ✅ Strategia 3-2-1 (3 copie, 2 media, 1 offsite)

### Monitoring
- ✅ Configura alerting per container down
- ✅ Monitora uso risorse (CPU, RAM, disco)
- ✅ Centralizza logs
- ✅ Health check periodici

### Performance
- ✅ Usa SSD per database
- ✅ Configura cache appropriata
- ✅ Ottimizza database periodicamente
- ✅ Considera CDN per asset statici

---

## 📞 Supporto

### Documentazione
- Consulta GUIDA_DEPLOYMENT_PRODUZIONE.md per dettagli
- Usa Makefile.production per comandi rapidi

### Debug
```bash
# Logs dettagliati
docker compose --env-file .env.production logs

# Configurazione
docker compose --env-file .env.production config

# Shell container
docker exec -it escape-backend bash
```

### Issues
Se riscontri problemi:
1. Controlla i logs
2. Verifica la configurazione
3. Consulta sezione Troubleshooting
4. Apri una issue sul repository

---

## ✅ Checklist Deployment

- [ ] Docker e Docker Compose installati
- [ ] File .env.production configurato
- [ ] Password e secret modificati
- [ ] Script resi eseguibili (chmod +x)
- [ ] Deploy eseguito con successo
- [ ] Health check OK
- [ ] Applicazione accessibile
- [ ] Backup configurato
- [ ] Monitoring attivo
- [ ] Firewall configurato
- [ ] HTTPS configurato (produzione)

---

## 🎉 Conclusione

Tutto è pronto per il deployment in produzione!

**Deploy rapido**: Leggi `QUICK_START_PRODUZIONE.md`  
**Guida completa**: Leggi `GUIDA_DEPLOYMENT_PRODUZIONE.md`  
**Comandi rapidi**: Usa `Makefile.production`

Buon deployment! 🚀

---

**📅 Creato**: 18 Dicembre 2024  
**✍️ Progetto**: Escape Room 3D  
**🔖 Versione**: 1.0.0
