# 🐳 Docker Setup - Escape Room 3D

✅ **Configurazione Docker Completata!**

L'applicazione Escape Room 3D è ora completamente dockerizzata e pronta per il deployment su Raspberry Pi.

---

## 📦 File Creati

```
escape-room-3d/
├── Dockerfile                    # Container frontend (React + Nginx)
├── docker-compose.yml            # Orchestratore dei servizi
├── nginx.conf                    # Configurazione Nginx + reverse proxy
├── .env.docker                   # Template variabili d'ambiente
├── .dockerignore                 # File esclusi dalla build
├── deploy-raspberry.sh           # Script deployment automatico
├── Makefile                      # Comandi rapidi (make help)
├── DOCKER_DEPLOYMENT_GUIDE.md    # Guida completa (LEGGI QUESTO!)
└── DOCKER_QUICKSTART.md          # Quick start guide
```

---

## 🚀 Come Iniziare

### Opzione 1: Leggi la Guida Completa
👉 **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** - Documentazione completa

### Opzione 2: Quick Start
👉 **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** - Avvio rapido in 5 minuti

### Opzione 3: Usa il Makefile

```bash
# Vedi tutti i comandi disponibili
make help

# Inizializza l'ambiente
make init

# Deploy completo (automatico)
make deploy

# Oppure manualmente:
make build    # Build delle immagini
make up       # Avvia i servizi
make logs     # Vedi i logs

# Altri comandi utili:
make ps           # Status dei servizi
make restart      # Riavvia tutto
make backup-db    # Backup database
make urls         # Mostra gli URL dell'app
```

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────┐
│           Raspberry Pi (Host)           │
│                                         │
│  Frontend (Nginx) :80                  │
│       ↓                                 │
│  Backend (FastAPI) :3000 (interno)     │
│       ↓              ↓                  │
│  PostgreSQL      MQTT Broker           │
│    :5432         :1883, :9001          │
│   (interno)       (interno)             │
└─────────────────────────────────────────┘
```

**Accesso esterno:**
- Frontend: `http://raspberry-pi-ip:80`
- API: `http://raspberry-pi-ip/api`
- WebSocket: `ws://raspberry-pi-ip/ws`
- MQTT: `mqtt://raspberry-pi-ip:1883`

---

## ⚡ Comandi Rapidi

### Deployment su Raspberry Pi

```bash
# 1. Clona il repository
git clone <url-repo>
cd escape-room-3d

# 2. Configura l'ambiente
cp .env.docker .env
nano .env  # Modifica password e configurazioni

# 3. Deploy automatico
./deploy-raspberry.sh

# 4. Verifica che tutto funzioni
make ps
make logs
```

### Uso Quotidiano

```bash
# Avvia
make up

# Ferma
make down

# Vedi logs
make logs

# Riavvia
make restart

# Backup database
make backup-db

# Aggiorna l'app
make update
```

---

## 📋 Checklist Pre-Deployment

- [ ] Docker installato sul Raspberry Pi
- [ ] Docker Compose installato
- [ ] File `.env` configurato
- [ ] Password cambiate in `.env`
- [ ] `SECRET_KEY` generata
- [ ] `CORS_ORIGINS` configurato con IP Raspberry Pi
- [ ] Porte firewall aperte (80, 1883, 9001)
- [ ] (Opzionale) SSD montato per prestazioni migliori

---

## 🎯 Requisiti Hardware

| Raspberry Pi | RAM | Storage | Note |
|--------------|-----|---------|------|
| **3B+** | 1GB | 16GB+ | Minimo, prestazioni base |
| **4B (2GB)** | 2GB | 32GB+ | Buone prestazioni |
| **4B (4GB+)** | 4-8GB | 32GB+ | Ottime prestazioni |
| **5** | 4-8GB | 32GB+ | Migliori prestazioni |

**Consigliato:** Raspberry Pi 4/5 con 4GB+ RAM e SSD

---

## 🔧 Configurazione Ottimale

### File .env Essenziali

```bash
# Database
POSTGRES_PASSWORD=TuaPasswordSicura123!

# Backend
SECRET_KEY=genera-chiave-con-openssl-rand-base64-32

# CORS - Sostituisci con IP reale
CORS_ORIGINS=http://localhost,http://192.168.1.XXX

# Limiti memoria (adatta al tuo Raspberry Pi)
DB_MEMORY_LIMIT=512M     # 1G per Pi 4/5 con 4GB+
MQTT_MEMORY_LIMIT=128M   # 256M per Pi 4/5 con 4GB+
```

### Genera Secret Key

```bash
openssl rand -base64 32
```

---

## 🌐 Accesso Remoto

### 1. Trova l'IP del Raspberry Pi

```bash
hostname -I
# Output: 192.168.1.100
```

### 2. Configura CORS in .env

```bash
CORS_ORIGINS=http://localhost,http://192.168.1.100
```

### 3. Riavvia il Backend

```bash
make restart
```

### 4. Accedi dall'App

Da qualsiasi dispositivo nella stessa rete:
```
http://192.168.1.100
```

---

## 📊 Monitoraggio

```bash
# Status dei servizi
make ps

# Risorse utilizzate
make stats

# Health check
make health

# Logs in tempo reale
make logs

# Logs specifici
make logs-backend
make logs-frontend
make logs-db
make logs-mqtt
```

---

## 🔄 Aggiornamenti

```bash
# Aggiornamento completo
make update

# Manuale:
git pull
make rebuild
```

---

## 💾 Backup & Restore

```bash
# Backup del database
make backup-db
# Salva in: backups/backup_YYYYMMDD_HHMMSS.sql

# Restore
make restore-db FILE=backups/backup_20250115_120000.sql
```

---

## 🐛 Troubleshooting

### Problema: Container non partono

```bash
make logs
make ps
```

### Problema: Frontend non raggiungibile

```bash
make logs-frontend
sudo netstat -tulpn | grep :80
```

### Problema: Memoria insufficiente

Riduci i limiti in `.env`:
```bash
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M
```

Poi:
```bash
make restart
```

### Più Soluzioni

Consulta **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** sezione Troubleshooting

---

## 📚 Documentazione

| File | Descrizione |
|------|-------------|
| **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** | Guida completa e dettagliata |
| **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** | Quick start in 5 minuti |
| **[Makefile](Makefile)** | Comandi rapidi (`make help`) |

---

## ⚙️ Personalizzazione

### Cambia Porta Frontend

In `.env`:
```bash
FRONTEND_PORT=8080
```

### Aggiungi più CORS Origins

In `.env`:
```bash
CORS_ORIGINS=http://localhost,http://192.168.1.100,http://example.com
```

### Modifica Limiti Risorse

In `.env`:
```bash
DB_MEMORY_LIMIT=1G
MQTT_MEMORY_LIMIT=256M
```

---

## 🎉 Pronto per la Produzione

L'applicazione è ora:
- ✅ Completamente containerizzata
- ✅ Pronta per Raspberry Pi
- ✅ Ottimizzata per ARM64/ARM
- ✅ Con reverse proxy Nginx
- ✅ Con gestione delle risorse
- ✅ Con health checks
- ✅ Con volumes persistenti
- ✅ Con script di deployment
- ✅ Con backup automatizzati

---

## 🚀 Prossimi Passi

1. **Test in Locale** (opzionale):
   ```bash
   make build
   make up
   ```

2. **Deploy su Raspberry Pi**:
   - Trasferisci il repository sul Pi
   - Esegui `./deploy-raspberry.sh`

3. **Configura Accesso Remoto**:
   - Configura CORS con IP pubblico
   - (Opzionale) Configura HTTPS con Caddy/Traefik

4. **Monitoring**:
   - Configura log rotation
   - Imposta backup automatici
   - Monitora le risorse

---

## 🔒 Sicurezza

⚠️ **IMPORTANTE per la produzione:**

- [ ] Cambia tutte le password di default
- [ ] Genera una `SECRET_KEY` forte
- [ ] Limita l'accesso alla rete (firewall)
- [ ] Configura HTTPS in produzione
- [ ] Aggiorna regolarmente Docker e il sistema
- [ ] Fai backup regolari

---

## 🆘 Supporto

Hai problemi?

1. Controlla i logs: `make logs`
2. Leggi il troubleshooting in **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)**
3. Apri una issue sul repository

---

## 📝 Note

- La prima build richiede **10-30 minuti** su Raspberry Pi
- Usa un **SSD** invece di SD Card per prestazioni migliori
- I dati sono persistenti in Docker volumes
- L'app si riavvia automaticamente al reboot del Pi

---

**Buon deployment! 🎉🚀**
