# 🐳 Guida al Deployment Docker - Escape Room 3D

Guida completa per il deployment dell'applicazione Escape Room 3D su Raspberry Pi utilizzando Docker e Docker Compose.

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Prerequisiti](#prerequisiti)
3. [Architettura Docker](#architettura-docker)
4. [Installazione su Raspberry Pi](#installazione-su-raspberry-pi)
5. [Configurazione](#configurazione)
6. [Deployment](#deployment)
7. [Gestione e Manutenzione](#gestione-e-manutenzione)
8. [Troubleshooting](#troubleshooting)
9. [Ottimizzazioni](#ottimizzazioni)

---

## 🎯 Panoramica

Questa configurazione Docker permette di eseguire l'intera applicazione Escape Room 3D su un Raspberry Pi con un singolo comando. L'applicazione è composta da 4 servizi containerizzati:

- **Frontend**: React + Vite + Nginx (porta 80)
- **Backend**: FastAPI (porta interna 3000)
- **Database**: PostgreSQL 15
- **MQTT Broker**: Eclipse Mosquitto (porte 1883, 9001)

### ✨ Vantaggi

✅ **Portabile**: funziona su qualsiasi sistema con Docker  
✅ **Isolato**: ogni servizio nel suo container  
✅ **Scalabile**: facile aggiungere servizi  
✅ **Persistente**: dati salvati in volumes  
✅ **Ottimizzato**: build multi-stage per dimensioni ridotte  
✅ **ARM-ready**: compatibile con Raspberry Pi 3/4/5  

---

## 🔧 Prerequisiti

### Hardware Consigliato

| Componente | Minimo | Consigliato |
|------------|--------|-------------|
| **Raspberry Pi** | 3B+ | 4B (4GB RAM) o superiore |
| **RAM** | 2GB | 4GB+ |
| **Storage** | 16GB | 32GB+ (SD Card Classe 10 o SSD) |
| **Connessione** | WiFi | Ethernet |

### Software

- **Raspberry Pi OS** (64-bit consigliato)
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** (per clonare il repository)

---

## 🏗️ Architettura Docker

```
┌─────────────────────────────────────────────────┐
│                   Raspberry Pi                   │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │          Frontend Container               │  │
│  │         (Nginx + React App)               │  │
│  │              Port: 80                     │  │
│  └────────┬─────────────────────────────────┘  │
│           │ Reverse Proxy                       │
│           ▼                                      │
│  ┌──────────────────────────────────────────┐  │
│  │         Backend Container                 │  │
│  │          (FastAPI + Python)               │  │
│  │         Internal Port: 3000               │  │
│  └──────┬────────────────────────┬──────────┘  │
│         │                        │              │
│         ▼                        ▼              │
│  ┌─────────────┐         ┌─────────────────┐  │
│  │  Database   │         │   MQTT Broker    │  │
│  │ (PostgreSQL)│         │  (Mosquitto)     │  │
│  │  Port: 5432 │         │  Ports: 1883,    │  │
│  │             │         │        9001      │  │
│  └─────────────┘         └─────────────────┘  │
│                                                  │
│  Volumes Persistenti:                            │
│  • postgres_data                                 │
│  • mosquitto_data                                │
│  • mosquitto_log                                 │
└──────────────────────────────────────────────────┘
```

### Network Flow

1. **Browser** → `http://raspberry-pi-ip:80` → **Nginx (Frontend)**
2. **Frontend** → `/api/*` → **Nginx Proxy** → **Backend**
3. **Frontend** → `/ws/*` → **Nginx Proxy** → **Backend WebSocket**
4. **Frontend** → `/mqtt` → **Nginx Proxy** → **MQTT WebSocket**
5. **Backend** → **PostgreSQL** (interno)
6. **Backend** → **MQTT** (interno)

---

## 🚀 Installazione su Raspberry Pi

### Step 1: Installa Docker

```bash
# Installa Docker
curl -fsSL https://get.docker.com | sh

# Aggiungi l'utente al gruppo docker
sudo usermod -aG docker $USER

# Logout e login per applicare i cambiamenti
# oppure esegui: newgrp docker
```

### Step 2: Installa Docker Compose

```bash
# Verifica se Docker Compose è già installato
docker compose version

# Se non è installato:
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Step 3: Clona il Repository

```bash
cd ~
git clone <url-repository>
cd escape-room-3d
```

### Step 4: Verifica i File

```bash
# Dovresti avere questi file:
ls -la
# Dockerfile
# docker-compose.yml
# nginx.conf
# .env.docker
# .dockerignore
# deploy-raspberry.sh
```

---

## ⚙️ Configurazione

### 1. Crea il File .env

```bash
# Copia il template
cp .env.docker .env

# Modifica con il tuo editor preferito
nano .env
```

### 2. Parametri Importanti da Configurare

```bash
# ⚠️ IMPORTANTE: Cambia questi valori in produzione!

# Database
POSTGRES_PASSWORD=TuaPasswordSicura123!

# Backend Security
SECRET_KEY=genera-una-chiave-sicura-di-almeno-32-caratteri-random

# CORS - Aggiungi l'IP del tuo Raspberry Pi
CORS_ORIGINS=http://localhost,http://192.168.1.XXX

# Porta Frontend (default 80)
FRONTEND_PORT=80
```

### 3. Ottimizzazioni per il Tuo Raspberry Pi

#### Raspberry Pi 3B/3B+
```bash
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M
```

#### Raspberry Pi 4 (2GB RAM)
```bash
DB_MEMORY_LIMIT=512M
MQTT_MEMORY_LIMIT=128M
```

#### Raspberry Pi 4/5 (4GB+ RAM)
```bash
DB_MEMORY_LIMIT=1G
MQTT_MEMORY_LIMIT=256M
```

### 4. Genera una Secret Key Sicura

```bash
# Metodo 1: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Metodo 2: OpenSSL
openssl rand -base64 32

# Copia il risultato in .env come SECRET_KEY
```

---

## 🎬 Deployment

### Metodo 1: Script Automatico (Consigliato)

```bash
# Rendi eseguibile lo script
chmod +x deploy-raspberry.sh

# Esegui il deployment
./deploy-raspberry.sh
```

Lo script:
1. ✅ Verifica i prerequisiti
2. ✅ Controlla la configurazione
3. ✅ Builda le immagini Docker
4. ✅ Avvia tutti i servizi
5. ✅ Mostra lo stato finale e gli URL

### Metodo 2: Manuale

```bash
# 1. Crea il file .env
cp .env.docker .env
nano .env

# 2. Build delle immagini (richiede 10-30 minuti)
docker-compose build

# 3. Avvia i servizi
docker-compose up -d

# 4. Verifica lo stato
docker-compose ps

# 5. Vedi i logs
docker-compose logs -f
```

### Prima Inizializzazione del Database

```bash
# Accedi al container backend
docker exec -it escape-backend bash

# Esegui le migrazioni
cd /app
alembic upgrade head

# (Opzionale) Seed dei dati iniziali
python -m app.services.seed_service

# Esci dal container
exit
```

---

## 🛠️ Gestione e Manutenzione

### Comandi Base

```bash
# Vedi lo stato dei container
docker-compose ps

# Vedi i logs in tempo reale
docker-compose logs -f

# Vedi logs di un singolo servizio
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f mqtt

# Ferma i servizi
docker-compose stop

# Riavvia i servizi
docker-compose restart

# Riavvia un singolo servizio
docker-compose restart backend

# Avvia i servizi
docker-compose start

# Ferma ed elimina i container (mantiene i dati)
docker-compose down

# Ferma ed elimina TUTTO (inclusi i volumi - ATTENZIONE!)
docker-compose down -v
```

### Aggiornamento dell'Applicazione

```bash
# 1. Ferma i servizi
docker-compose down

# 2. Aggiorna il codice
git pull

# 3. Rebuild delle immagini
docker-compose build

# 4. Riavvia i servizi
docker-compose up -d

# 5. Esegui le migrazioni se necessario
docker exec -it escape-backend alembic upgrade head
```

### Backup

#### Backup del Database

```bash
# Backup
docker exec escape-db pg_dump -U escape_user escape_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20250101.sql | docker exec -i escape-db psql -U escape_user escape_db
```

#### Backup dei Volumi

```bash
# Backup volume PostgreSQL
docker run --rm -v escape-room-3d_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore
docker run --rm -v escape-room-3d_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

### Monitoraggio

```bash
# Uso risorse
docker stats

# Spazio disco
docker system df

# Pulizia immagini non usate
docker system prune -a
```

---

## 🔍 Troubleshooting

### Problema: Container non si avvia

```bash
# Vedi gli errori
docker-compose logs

# Verifica lo stato
docker-compose ps

# Riavvia forzatamente
docker-compose down
docker-compose up -d
```

### Problema: Frontend non raggiungibile

```bash
# Verifica che Nginx sia in ascolto
docker exec escape-frontend nginx -t

# Verifica i logs
docker-compose logs frontend

# Verifica la porta
sudo netstat -tulpn | grep :80
```

### Problema: Backend non risponde

```bash
# Verifica i logs
docker-compose logs backend

# Verifica la connessione al database
docker exec escape-backend python -c "from app.database import engine; print(engine.url)"

# Entra nel container per debug
docker exec -it escape-backend bash
```

### Problema: Database non si connette

```bash
# Verifica che il database sia healthy
docker-compose ps db

# Prova la connessione
docker exec escape-db pg_isready -U escape_user

# Vedi i logs del database
docker-compose logs db
```

### Problema: MQTT non funziona

```bash
# Verifica la configurazione
docker exec escape-mqtt cat /mosquitto/config/mosquitto.conf

# Testa la connessione
docker exec escape-mqtt mosquitto_sub -h localhost -t test -v

# In un altro terminale
docker exec escape-mqtt mosquitto_pub -h localhost -t test -m "hello"
```

### Problema: Memoria Insufficiente

```bash
# Verifica l'uso della memoria
free -h

# Riduci i limiti in .env
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M

# Riavvia
docker-compose down
docker-compose up -d
```

### Problema: Build Lenta su Raspberry Pi

```bash
# Abilita BuildKit per build più veloci
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Rebuild
docker-compose build
```

---

## ⚡ Ottimizzazioni

### 1. Usa un SSD invece di SD Card

Le SD Card sono molto lente. Usa un SSD USB per prestazioni migliori:

```bash
# Sposta i dati Docker su SSD
sudo systemctl stop docker
sudo mv /var/lib/docker /mnt/ssd/docker
sudo ln -s /mnt/ssd/docker /var/lib/docker
sudo systemctl start docker
```

### 2. Overclock del Raspberry Pi (Opzionale)

Modifica `/boot/config.txt`:

```bash
# Per Raspberry Pi 4
over_voltage=6
arm_freq=2000
gpu_freq=750
```

### 3. Swap File (per Raspberry Pi con poca RAM)

```bash
# Crea uno swap file da 2GB
sudo dfallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendi permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Abilita Log Rotation

Crea `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Riavvia Docker:
```bash
sudo systemctl restart docker
```

### 5. Avvio Automatico al Boot

```bash
# I container sono già configurati con restart: unless-stopped
# Verifica che Docker parta al boot
sudo systemctl enable docker

# Controlla lo stato
sudo systemctl status docker
```

---

## 🌐 Accesso da Altri Dispositivi

### 1. Trova l'IP del Raspberry Pi

```bash
hostname -I
# Esempio output: 192.168.1.100
```

### 2. Configura CORS

Modifica `.env`:

```bash
CORS_ORIGINS=http://localhost,http://192.168.1.100,http://192.168.1.100:80
```

### 3. Riavvia il Backend

```bash
docker-compose restart backend
```

### 4. Accedi dall'App

Apri il browser su qualsiasi dispositivo nella stessa rete:

```
http://192.168.1.100
```

### 5. Firewall (se abilitato)

```bash
# Apri le porte necessarie
sudo ufw allow 80/tcp
sudo ufw allow 1883/tcp
sudo ufw allow 9001/tcp
```

---

## 📊 URL e Porte

| Servizio | URL/Porta | Descrizione |
|----------|-----------|-------------|
| **Frontend** | `http://<raspberry-ip>:80` | Interfaccia Web |
| **API** | `http://<raspberry-ip>/api` | REST API |
| **WebSocket** | `ws://<raspberry-ip>/ws` | WebSocket Backend |
| **MQTT** | `mqtt://<raspberry-ip>:1883` | MQTT Broker |
| **MQTT WebSocket** | `ws://<raspberry-ip>:9001` | MQTT over WebSocket |
| **Health Check** | `http://<raspberry-ip>/health` | Status dell'app |

---

## 📝 Note Finali

### Sicurezza

- ⚠️ Cambia sempre le password di default in produzione
- ⚠️ Usa una SECRET_KEY forte
- ⚠️ Mantieni Docker e il sistema aggiornati
- ⚠️ Usa HTTPS in produzione (con Traefik o Caddy)

### Performance

- 💡 Un SSD migliora drasticamente le performance
- 💡 Raspberry Pi 4/5 con 4GB+ RAM è consigliato per uso intensivo
- 💡 Considera un sistema di raffreddamento attivo

### Backup

- 💾 Fai backup regolari del database
- 💾 Testa i restore dei backup periodicamente
- 💾 Mantieni i backup in un posto sicuro (non solo sul Raspberry Pi)

---

## 🆘 Supporto

Per problemi o domande:

1. Controlla i logs: `docker-compose logs`
2. Verifica la sezione [Troubleshooting](#troubleshooting)
3. Apri una issue sul repository

---

## 📄 Licenza

[Inserisci qui la tua licenza]

---

**Buon deployment! 🚀**
