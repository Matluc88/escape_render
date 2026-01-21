# 🐳 Guida Docker - Escape Room 3D

Guida completa per eseguire il progetto Escape Room 3D con Docker (frontend e backend).

---

## 📋 Indice

1. [Quick Start](#-quick-start-5-minuti)
2. [Prerequisiti](#-prerequisiti)
3. [Struttura del Progetto](#-struttura-del-progetto)
4. [Configurazione](#-configurazione)
5. [Comandi Principali](#-comandi-principali)
6. [Accesso all'Applicazione](#-accesso-allapplicazione)
7. [Troubleshooting](#-troubleshooting)
8. [Deployment su Raspberry Pi](#-deployment-su-raspberry-pi)

---

## 🚀 Quick Start (5 minuti)

```bash
# 1. Entra nella directory del progetto
cd escape-room-3d

# 2. Avvia tutto (il file .env è già configurato)
./docker.sh start

# 3. Aspetta che il build completi (5-10 minuti la prima volta)

# 4. Apri il browser
open http://localhost
```

**Fatto!** L'applicazione è in esecuzione su http://localhost

---

## 📦 Prerequisiti

### Su Mac/PC

1. **Docker Desktop** installato
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/

2. Verifica l'installazione:
   ```bash
   docker --version
   docker compose version
   ```

### Su Raspberry Pi

1. **Docker** installato:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. Riavvia o fai logout/login

3. Verifica:
   ```bash
   docker --version
   ```

---

## 🏗️ Struttura del Progetto

Il sistema Docker è composto da 4 servizi:

```
┌─────────────────────────────────────┐
│  Frontend (React + Vite + Nginx)   │  ← Porta 80
│  - Serve l'app React                │
│  - Reverse proxy per API/WS         │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│  Backend (FastAPI)                  │  ← Porta 3000 (interna)
│  - API REST                          │
│  - WebSocket                         │
└──────┬───────────────┬──────────────┘
       │               │
┌──────┴────────┐  ┌──┴──────────────┐
│  PostgreSQL   │  │  MQTT Broker    │
│  Database     │  │  (Mosquitto)    │
└───────────────┘  └─────────────────┘
```

**File principali:**
- `docker-compose.yml` - Orchestrazione dei servizi
- `Dockerfile` - Build del frontend
- `backend/Dockerfile` - Build del backend
- `.env` - Configurazione (già pronto)
- `docker.sh` - Script per gestire tutto
- `nginx.conf` - Configurazione reverse proxy

---

## ⚙️ Configurazione

Il file `.env` è già configurato e pronto all'uso! 

### Configurazione Base (già presente)

```env
# Database
POSTGRES_USER=escape_user
POSTGRES_PASSWORD=Escape2024!SecurePassword
POSTGRES_DB=escape_db

# Frontend
FRONTEND_PORT=80
VITE_BACKEND_URL=/api
VITE_WS_URL=/ws

# MQTT
MQTT_PORT=1883
MQTT_WS_PORT=9001
```

### Personalizzazioni Opzionali

#### 1. Cambiare la porta del frontend

Nel file `.env`:
```env
FRONTEND_PORT=8080  # invece di 80
```

#### 2. Per uso su Raspberry Pi in rete locale

Nel file `.env`:
```env
# Trova l'IP del Raspberry Pi con: hostname -I
RASPBERRY_PI_IP=192.168.1.100  # sostituisci con il tuo IP

# Aggiungi l'IP ai CORS
CORS_ORIGINS=http://localhost,http://192.168.1.100
```

#### 3. Generare una nuova SECRET_KEY (per produzione)

```bash
openssl rand -base64 32
```

Poi copia il risultato nel file `.env`:
```env
SECRET_KEY=<la-tua-chiave-generata>
```

---

## 🎮 Comandi Principali

### Uso dello Script `docker.sh`

Lo script `docker.sh` semplifica tutte le operazioni:

```bash
# Vedere tutti i comandi disponibili
./docker.sh help
```

### Comandi Base

```bash
# 🚀 Avviare l'applicazione
./docker.sh start

# 🛑 Fermare l'applicazione
./docker.sh stop

# 🔄 Riavviare l'applicazione
./docker.sh restart

# 📊 Vedere lo status
./docker.sh status

# 📝 Vedere i logs (tutti i servizi)
./docker.sh logs

# 📝 Vedere i logs di un servizio specifico
./docker.sh logs frontend
./docker.sh logs backend
./docker.sh logs db
./docker.sh logs mqtt

# 🌐 Mostrare gli URL dell'app
./docker.sh urls

# 🏥 Health check
./docker.sh health
```

### Comandi Avanzati

```bash
# 🔨 Rebuild completo (forza ricompilazione)
./docker.sh build

# 🔄 Aggiornare l'app (pull da git + rebuild)
./docker.sh update

# 💾 Backup del database
./docker.sh backup

# 📥 Restore del database
./docker.sh restore backups/backup_20241223_150000.sql

# 🔧 Aprire una shell nel backend
./docker.sh shell backend

# 🧹 Pulizia completa (rimuove tutto)
./docker.sh clean
```

### Comandi Docker Compose Diretti

Se preferisci usare direttamente `docker compose`:

```bash
# Avvia in background
docker compose up -d

# Avvia con rebuild
docker compose up -d --build

# Ferma tutto
docker compose down

# Vedi i logs
docker compose logs -f

# Vedi lo status
docker compose ps

# Riavvia un servizio specifico
docker compose restart backend

# Esegui un comando in un container
docker compose exec backend python -c "print('Hello')"
```

---

## 🌐 Accesso all'Applicazione

### Locale (Mac/PC)

```
Frontend:    http://localhost
API:         http://localhost/api
WebSocket:   ws://localhost/ws
MQTT:        mqtt://localhost:1883
```

### Rete Locale (Raspberry Pi)

Trova l'IP del Raspberry Pi:
```bash
hostname -I
# Output: 192.168.1.100
```

Poi accedi da qualsiasi dispositivo sulla stessa rete:
```
Frontend:    http://192.168.1.100
API:         http://192.168.1.100/api
WebSocket:   ws://192.168.1.100/ws
MQTT:        mqtt://192.168.1.100:1883
```

**Importante:** Assicurati che il CORS sia configurato con l'IP corretto nel file `.env`!

---

## 🐛 Troubleshooting

### I container non partono

```bash
# Vedi cosa è successo
./docker.sh logs

# Vedi lo status
./docker.sh status

# Controlla i requisiti
docker --version
docker compose version
```

### Frontend non raggiungibile

```bash
# Controlla il container frontend
./docker.sh logs frontend

# Verifica che la porta 80 sia libera
sudo lsof -i :80

# Cambia porta in .env se necessario
FRONTEND_PORT=8080
./docker.sh restart
```

### Backend non risponde

```bash
# Vedi i logs del backend
./docker.sh logs backend

# Verifica che il database sia pronto
./docker.sh logs db

# Health check
./docker.sh health
```

### Database non si avvia

```bash
# Vedi errori
./docker.sh logs db

# Riduci la memoria se su Raspberry Pi 3
# Nel file .env:
DB_MEMORY_LIMIT=256M
./docker.sh restart
```

### Errore "port already allocated"

La porta è già in uso. Opzioni:

1. **Ferma il processo che usa la porta:**
   ```bash
   # Trova cosa usa la porta 80
   sudo lsof -i :80
   # Ferma il processo
   sudo kill <PID>
   ```

2. **Cambia porta nel file `.env`:**
   ```env
   FRONTEND_PORT=8080
   ```

### Build molto lento su Raspberry Pi

Normale alla prima esecuzione (10-30 minuti).

**Consigli:**
- Usa un SSD invece della SD card
- Chiudi altre applicazioni
- Aumenta lo swap:
  ```bash
  sudo dphys-swapfile swapoff
  sudo nano /etc/dphys-swapfile
  # CONF_SWAPSIZE=2048
  sudo dphys-swapfile setup
  sudo dphys-swapfile swapon
  ```

### CORS Error nel browser

Assicurati che il backend abbia il tuo IP nei CORS.

Nel file `.env`:
```env
CORS_ORIGINS=http://localhost,http://TUO_IP
```

Poi riavvia:
```bash
./docker.sh restart
```

### Out of Memory su Raspberry Pi

Riduci i limiti di memoria nel file `.env`:

```env
# Per Raspberry Pi 3 (1GB RAM)
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M

# Per Raspberry Pi 4 (2GB RAM)
DB_MEMORY_LIMIT=512M
MQTT_MEMORY_LIMIT=128M
```

---

## 🥧 Deployment su Raspberry Pi

### 1. Prepara il Raspberry Pi

```bash
# Aggiorna il sistema
sudo apt update && sudo apt upgrade -y

# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Logout e login
```

### 2. Trasferisci il progetto

**Opzione A: Da Git**
```bash
git clone <url-repository>
cd escape-room-3d
```

**Opzione B: Via rsync/scp**
```bash
# Dal tuo Mac/PC
rsync -avz escape-room-3d/ pi@192.168.1.100:~/escape-room-3d/
```

### 3. Configura l'ambiente

```bash
cd escape-room-3d

# Il file .env è già configurato, ma verifica:
nano .env

# Trova l'IP del Raspberry Pi
hostname -I
# Output: 192.168.1.100

# Modifica CORS nel .env
# CORS_ORIGINS=http://localhost,http://192.168.1.100
```

### 4. Avvia l'applicazione

```bash
# Avvio automatico
./docker.sh start

# Aspetta 10-30 minuti per il primo build
# Monitora i progressi:
./docker.sh logs
```

### 5. Verifica

```bash
# Status
./docker.sh status

# Health check
./docker.sh health

# URL
./docker.sh urls
```

### 6. Accedi da altri dispositivi

Da qualsiasi dispositivo sulla stessa rete:
```
http://192.168.1.100
```

### 7. (Opzionale) Avvio automatico al boot

Crea un servizio systemd:

```bash
sudo nano /etc/systemd/system/escape-room.service
```

Contenuto:
```ini
[Unit]
Description=Escape Room 3D Docker
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/escape-room-3d
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=pi

[Install]
WantedBy=multi-user.target
```

Abilita:
```bash
sudo systemctl daemon-reload
sudo systemctl enable escape-room
sudo systemctl start escape-room
```

---

## 📊 Monitoraggio

### Vedere le risorse usate

```bash
# Statistiche in tempo reale
docker stats

# Oppure con lo script
./docker.sh status
```

### Log Rotation (produzione)

Docker gestisce automaticamente i log, ma puoi configurare:

```bash
# Nel file docker-compose.yml, aggiungi per ogni servizio:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Backup Automatici

Crea un cron job:

```bash
crontab -e
```

Aggiungi:
```cron
# Backup giornaliero alle 2:00 AM
0 2 * * * cd /home/pi/escape-room-3d && ./docker.sh backup
```

---

## 🎯 Best Practices

### Sviluppo

```bash
# Usa i logs per il debug
./docker.sh logs backend

# Riavvia solo il servizio modificato
docker compose restart backend

# Rebuild solo un servizio
docker compose build backend
docker compose up -d backend
```

### Produzione

1. ✅ Cambia tutte le password nel file `.env`
2. ✅ Genera una nuova `SECRET_KEY`
3. ✅ Configura backup automatici
4. ✅ Usa un SSD invece della SD card (Raspberry Pi)
5. ✅ Monitora le risorse con `docker stats`
6. ✅ Configura log rotation
7. ✅ Testa il health check regolarmente

---

## 📚 Documentazione Aggiuntiva

- **DOCKER_README.md** - README generale Docker
- **DOCKER_DEPLOYMENT_GUIDE.md** - Guida deployment dettagliata (inglese)
- **DOCKER_QUICKSTART.md** - Quick start (inglese)
- **Makefile** - Comandi make alternativi

---

## 🆘 Aiuto

### Comandi utili per il debug

```bash
# Vedi tutti i container (anche quelli fermi)
docker ps -a

# Vedi i volumi
docker volume ls

# Vedi le reti
docker network ls

# Ispeziona un container
docker inspect escape-frontend

# Vedi l'uso del disco
docker system df

# Pulisci risorse inutilizzate
docker system prune -a
```

### Risorse

- Docker Docs: https://docs.docker.com/
- Docker Compose Docs: https://docs.docker.com/compose/
- Nginx Docs: https://nginx.org/en/docs/
- FastAPI Docs: https://fastapi.tiangolo.com/

---

## 🎉 Successo!

Se tutto funziona, dovresti vedere:

```bash
./docker.sh status
```

Output:
```
✅ Frontend: Running
✅ Backend: Running
✅ Database: Running
✅ MQTT: Running
```

E l'app dovrebbe essere accessibile su http://localhost!

---

**Buon lavoro! 🚀**
