# 🐳 Escape Room 3D - Docker Setup Completo

> **✅ Progetto completamente dockerizzato - Frontend + Backend + Database + MQTT**

---

## 🎯 Quick Start Rapido

```bash
cd escape-room-3d
./docker.sh start
```

Aspetta 5-10 minuti e apri: **http://localhost**

---

## 📦 Cosa Include

Questo setup Docker include:

- ✅ **Frontend** - React + Vite servito da Nginx (porta 80)
- ✅ **Backend** - FastAPI con API REST e WebSocket (porta 3000 interna)
- ✅ **Database** - PostgreSQL 15 per la persistenza dati
- ✅ **MQTT Broker** - Mosquitto per comunicazioni IoT (ESP32)
- ✅ **Reverse Proxy** - Nginx gestisce /api, /ws, e /mqtt
- ✅ **Health Checks** - Monitoraggio automatico dei servizi
- ✅ **Volumes Persistenti** - I dati sopravvivono ai riavvii
- ✅ **Script di Gestione** - Comandi semplici per tutto

---

## 📁 File Principali

```
escape-room-3d/
├── 📄 .env                      # ✅ Configurazione (GIÀ PRONTO!)
├── 🔧 docker.sh                 # ✅ Script gestione (eseguibile)
├── 📚 GUIDA_DOCKER.md           # ✅ Guida completa in italiano
├── 🐳 docker-compose.yml        # ✅ Orchestrazione servizi
├── 🏗️ Dockerfile                # ✅ Build frontend
├── ⚙️ nginx.conf                # ✅ Configurazione reverse proxy
└── backend/
    ├── 🏗️ Dockerfile            # ✅ Build backend
    └── mosquitto/
        └── config/
            └── mosquitto.conf   # ✅ Config MQTT broker
```

---

## 🚀 Comandi Principali

### Comando Unico (Script)

```bash
# Vedi tutti i comandi disponibili
./docker.sh help

# Comandi base
./docker.sh start     # Avvia tutto
./docker.sh stop      # Ferma tutto
./docker.sh restart   # Riavvia
./docker.sh logs      # Vedi logs
./docker.sh status    # Status servizi
./docker.sh health    # Health check

# Comandi avanzati
./docker.sh backup    # Backup database
./docker.sh update    # Aggiorna app
./docker.sh clean     # Pulisci tutto
```

### Comandi Docker Compose Diretti

```bash
# Avvia
docker compose up -d

# Ferma
docker compose down

# Logs
docker compose logs -f

# Status
docker compose ps
```

---

## 🌐 URL Applicazione

Una volta avviato, l'app è disponibile su:

```
Frontend:     http://localhost
API:          http://localhost/api
WebSocket:    ws://localhost/ws
MQTT:         mqtt://localhost:1883
MQTT WebSocket: ws://localhost:9001
```

### Da Rete Locale (Raspberry Pi)

Trova l'IP con `hostname -I`, poi:

```
http://TUO_IP    (es: http://192.168.1.100)
```

**IMPORTANTE:** Configura CORS nel file `.env` con il tuo IP!

---

## ⚙️ Configurazione

Il file `.env` è **già configurato e pronto**! 

### Modifiche Opzionali

#### Cambia Porta Frontend
```env
FRONTEND_PORT=8080
```

#### Aggiungi IP per Accesso Remoto
```env
CORS_ORIGINS=http://localhost,http://192.168.1.100
```

#### Per Raspberry Pi con RAM Limitata
```env
# Raspberry Pi 3 (1GB)
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M

# Raspberry Pi 4 (2GB)
DB_MEMORY_LIMIT=512M
MQTT_MEMORY_LIMIT=128M
```

---

## 📚 Documentazione

| File | Descrizione |
|------|-------------|
| **[GUIDA_DOCKER.md](GUIDA_DOCKER.md)** | 📘 Guida completa in italiano |
| **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** | 📗 Guida deployment dettagliata |
| **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** | 📙 Quick start guide |
| **[docker.sh](docker.sh)** | 🔧 Script con tutti i comandi |

---

## 🏗️ Architettura

```
┌──────────────────────────────────────┐
│        🌍 Utente (Browser)          │
└──────────────┬───────────────────────┘
               │ http://localhost
┌──────────────▼───────────────────────┐
│  🚪 Nginx (Reverse Proxy) :80       │
│  ├─ / → Frontend (React)            │
│  ├─ /api → Backend                  │
│  ├─ /ws → WebSocket                 │
│  └─ /mqtt → MQTT WebSocket          │
└──────────────┬───────────────────────┘
               │
   ┌───────────┼────────────┐
   │           │            │
┌──▼──────┐ ┌─▼───────┐ ┌─▼────────┐
│ Frontend│ │ Backend │ │   MQTT   │
│  React  │ │ FastAPI │ │Mosquitto │
│  Vite   │ │  :3000  │ │ :1883    │
└─────────┘ └────┬────┘ └──────────┘
                 │
          ┌──────▼──────┐
          │ PostgreSQL  │
          │   :5432     │
          └─────────────┘
```

---

## 🐛 Troubleshooting Rapido

### Container non partono
```bash
./docker.sh logs
docker ps -a
```

### Porta 80 già in uso
```bash
# Cambia porta nel .env
FRONTEND_PORT=8080
./docker.sh restart
```

### CORS Error
```bash
# Nel .env, aggiungi il tuo IP
CORS_ORIGINS=http://localhost,http://TUO_IP
./docker.sh restart
```

### Out of Memory (Raspberry Pi)
```bash
# Nel .env, riduci i limiti
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M
./docker.sh restart
```

**Per troubleshooting completo:** [GUIDA_DOCKER.md](GUIDA_DOCKER.md#-troubleshooting)

---

## 🥧 Raspberry Pi Deployment

### Setup Rapido

```bash
# 1. Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Trasferisci il progetto
git clone <repo-url>
cd escape-room-3d

# 3. Configura IP nel .env
nano .env
# Aggiungi il tuo IP in CORS_ORIGINS

# 4. Avvia
./docker.sh start

# 5. Monitora (prima build: 10-30 minuti)
./docker.sh logs
```

### Accesso Remoto

```bash
# Trova l'IP del Raspberry Pi
hostname -I

# Accedi da qualsiasi dispositivo sulla rete
http://192.168.1.100  (sostituisci con il tuo IP)
```

**Guida completa:** [GUIDA_DOCKER.md](GUIDA_DOCKER.md#-deployment-su-raspberry-pi)

---

## 💾 Backup & Restore

```bash
# Backup automatico
./docker.sh backup
# Salva in: backups/backup_YYYYMMDD_HHMMSS.sql

# Restore
./docker.sh restore backups/backup_20241223_150000.sql
```

---

## 🔒 Sicurezza (Produzione)

Prima di andare in produzione:

- [ ] Cambia `POSTGRES_PASSWORD` nel file `.env`
- [ ] Genera nuova `SECRET_KEY` con: `openssl rand -base64 32`
- [ ] Aggiorna `CORS_ORIGINS` con IP/domini corretti
- [ ] Configura backup automatici (cron)
- [ ] Abilita HTTPS (Caddy/Traefik)
- [ ] Configura firewall (UFW su Raspberry Pi)

---

## 📊 Monitoraggio

```bash
# Status e risorse
./docker.sh status

# Statistiche in tempo reale
docker stats

# Health check
./docker.sh health

# Logs specifici
./docker.sh logs backend
./docker.sh logs frontend
./docker.sh logs db
./docker.sh logs mqtt
```

---

## 🎓 Esempi Uso

### Sviluppo Locale

```bash
# Avvia tutto
./docker.sh start

# Vedi logs del backend mentre sviluppi
./docker.sh logs backend

# Riavvia solo il backend dopo modifiche
docker compose restart backend

# Ferma quando hai finito
./docker.sh stop
```

### Produzione su Raspberry Pi

```bash
# Setup iniziale
./docker.sh start

# Verifica che tutto funzioni
./docker.sh health

# Configura backup automatico (crontab)
crontab -e
# 0 2 * * * cd ~/escape-room-3d && ./docker.sh backup

# Monitora regolarmente
./docker.sh status
```

---

## 🔄 Aggiornamenti

```bash
# Aggiorna da Git e riavvia
./docker.sh update

# Oppure manualmente
git pull
docker compose up -d --build
```

---

## 🆘 Supporto

### Problemi?

1. **Controlla i logs:** `./docker.sh logs`
2. **Verifica lo status:** `./docker.sh status`
3. **Health check:** `./docker.sh health`
4. **Leggi la guida:** [GUIDA_DOCKER.md](GUIDA_DOCKER.md)

### Comandi Debug Utili

```bash
# Vedi tutti i container
docker ps -a

# Vedi i volumi
docker volume ls

# Ispeziona un container
docker inspect escape-frontend

# Vedi uso disco
docker system df

# Pulisci risorse inutilizzate
docker system prune -a
```

---

## ✅ Checklist Pre-Deploy

### Locale (Mac/PC)
- [x] Docker Desktop installato
- [x] File .env presente (già configurato)
- [x] Script docker.sh eseguibile
- [ ] Esegui `./docker.sh start`
- [ ] Apri http://localhost
- [ ] Verifica che funzioni

### Raspberry Pi
- [ ] Docker installato
- [ ] Progetto trasferito sul Pi
- [ ] IP del Pi trovato (`hostname -I`)
- [ ] CORS configurato nel .env con IP del Pi
- [ ] Esegui `./docker.sh start`
- [ ] Aspetta 10-30 min (prima build)
- [ ] Accedi da rete locale
- [ ] Configura backup automatici
- [ ] (Opzionale) Configura avvio automatico

---

## 🎉 Risultato Finale

Quando tutto funziona:

```bash
$ ./docker.sh status

╔════════════════════════════════════════════════╗
║   🏠 Escape Room 3D - Gestione Docker 🐳      ║
╚════════════════════════════════════════════════╝

ℹ️  Status dei container:

NAME              IMAGE                    STATUS        PORTS
escape-frontend   escape-room-3d-frontend  Up 10 min     0.0.0.0:80->80/tcp
escape-backend    escape-room-3d-backend   Up 10 min     3000/tcp
escape-db         postgres:15-alpine       Up 10 min     5432/tcp
escape-mqtt       eclipse-mosquitto:2      Up 10 min     0.0.0.0:1883->1883/tcp

ℹ️  Uso risorse:
NAME              CPU %     MEM USAGE       NET I/O
escape-frontend   0.01%     50MiB / 8GiB    1.5kB / 2kB
escape-backend    0.50%     150MiB / 8GiB   5kB / 3kB
escape-db         0.10%     80MiB / 512MiB  3kB / 2kB
escape-mqtt       0.05%     20MiB / 128MiB  1kB / 1kB
```

E l'app è disponibile su: **http://localhost** 🎊

---

## 📞 Contatti & Risorse

- **Repository:** [GitHub Link]
- **Docker Docs:** https://docs.docker.com/
- **FastAPI:** https://fastapi.tiangolo.com/
- **React:** https://react.dev/

---

## 🏆 Features

- ✅ Multi-stage build ottimizzato
- ✅ Health checks automatici
- ✅ Gestione risorse per Raspberry Pi
- ✅ Reverse proxy Nginx
- ✅ Volumi persistenti
- ✅ Restart automatico container
- ✅ Backup/restore database
- ✅ Script gestione completo
- ✅ Documentazione italiana
- ✅ Pronto per produzione

---

**Creato con ❤️ per Escape Room 3D**

**Buon deployment! 🚀🐳**
