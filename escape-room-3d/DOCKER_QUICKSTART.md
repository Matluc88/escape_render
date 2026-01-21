# 🚀 Docker Quick Start - Escape Room 3D

Guida rapida per avviare l'applicazione in Docker in 5 minuti.

---

## ⚡ Quick Start

### 1. Prerequisiti

```bash
# Verifica Docker
docker --version

# Verifica Docker Compose
docker-compose --version
```

### 2. Configurazione

```bash
# Entra nella directory
cd escape-room-3d

# Copia e configura .env
cp .env.docker .env

# IMPORTANTE: Modifica .env con i tuoi parametri
nano .env  # o usa il tuo editor preferito
```

**Parametri essenziali da cambiare:**
- `POSTGRES_PASSWORD` - Password sicura per il database
- `SECRET_KEY` - Chiave segreta (genera con: `openssl rand -base64 32`)
- `CORS_ORIGINS` - Aggiungi l'IP del tuo Raspberry Pi

### 3. Avvio

#### Metodo A: Script Automatico (Consigliato)

```bash
./deploy-raspberry.sh
```

#### Metodo B: Manuale

```bash
# Build delle immagini
docker-compose build

# Avvia i servizi
docker-compose up -d

# Verifica lo stato
docker-compose ps

# Vedi i logs
docker-compose logs -f
```

### 4. Accedi all'App

Trova l'IP del tuo Raspberry Pi:
```bash
hostname -I
```

Apri il browser:
```
http://<raspberry-pi-ip>
```

---

## 📦 Cosa Include

- **Frontend**: React + Three.js (porta 80)
- **Backend**: FastAPI + WebSocket
- **Database**: PostgreSQL 15
- **MQTT**: Eclipse Mosquitto

---

## 🛠️ Comandi Utili

```bash
# Vedi lo stato
docker-compose ps

# Vedi i logs
docker-compose logs -f

# Ferma tutto
docker-compose stop

# Riavvia
docker-compose restart

# Elimina tutto (mantiene i dati)
docker-compose down

# Elimina TUTTO inclusi i dati
docker-compose down -v
```

---

## 🔍 Troubleshooting Rapido

### I container non partono
```bash
docker-compose logs
```

### Frontend non raggiungibile
```bash
docker-compose logs frontend
sudo netstat -tulpn | grep :80
```

### Backend ha errori
```bash
docker-compose logs backend
```

### Database non si connette
```bash
docker-compose ps db
docker exec escape-db pg_isready -U escape_user
```

---

## 📚 Documentazione Completa

Per maggiori dettagli, consulta: **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)**

---

## 🎯 Requisiti Hardware

| Dispositivo | RAM | Storage |
|------------|-----|---------|
| **Raspberry Pi 3B+** | 1-2GB | 16GB+ |
| **Raspberry Pi 4** | 2-8GB | 32GB+ |
| **Raspberry Pi 5** | 4-8GB | 32GB+ |

**Consigliato**: Raspberry Pi 4/5 con 4GB+ RAM e SSD USB

---

## 🌐 Porte Utilizzate

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| Frontend/Nginx | 80 | Interfaccia web |
| MQTT | 1883 | MQTT Broker |
| MQTT WebSocket | 9001 | MQTT over WS |

---

## ⚠️ Note Importanti

1. **Cambia sempre le password** in `.env` per la produzione
2. **Usa un SSD** invece di SD Card per prestazioni migliori
3. **Prima build richiede tempo** (10-30 min su Raspberry Pi)
4. **Apri le porte** nel firewall se necessario

---

## 🆘 Supporto

Problemi? Consulta il file **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** per troubleshooting dettagliato.

---

**Buon deployment! 🎉**
