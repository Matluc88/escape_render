# 🐳 Docker Setup - Escape Room 3D

## ✅ Configurazione Completa e Pronta

Il tuo progetto Escape Room 3D è **completamente configurato** per Docker con:

### 🎯 Componenti Pronti

- ✅ **Frontend** (React + Vite + Nginx)
  - Build ottimizzato multi-stage
  - Nginx come reverse proxy
  - File: `Dockerfile`

- ✅ **Backend** (FastAPI + Python)
  - Build multi-stage per ridurre dimensione
  - Uvicorn per performance
  - File: `backend/Dockerfile`

- ✅ **Database** (PostgreSQL 15)
  - Volumi persistenti
  - Health checks
  - Backup automatici

- ✅ **MQTT Broker** (Mosquitto)
  - Per ESP32
  - WebSocket support
  - File: `backend/mosquitto/config/mosquitto.conf`

- ✅ **Orchestrazione** (Docker Compose)
  - Tutti i servizi integrati
  - Network interno
  - File: `docker-compose.yml`

- ✅ **Script di Gestione** (`docker.sh`)
  - Comandi semplici
  - Gestione completa
  - Backup/Restore DB

- ✅ **Configurazione** (`.env`)
  - Variabili d'ambiente
  - Pronto all'uso
  - Personalizzabile

---

## 🚀 AVVIO RAPIDO - 2 COMANDI

```bash
cd escape-room-3d
./docker.sh start
```

**Apri il browser su:** http://localhost

---

## 📁 Struttura File Docker

```
escape-room-3d/
├── 🐳 docker-compose.yml        # Orchestrazione servizi
├── 🐳 Dockerfile                # Build frontend
├── ⚙️  .env                      # Configurazioni
├── 🛠️  docker.sh                 # Script gestione
│
├── backend/
│   ├── 🐳 Dockerfile            # Build backend
│   ├── ⚙️  .env                  # Config backend
│   └── mosquitto/
│       └── config/
│           └── mosquitto.conf   # Config MQTT
│
└── 📚 GUIDA_AVVIO_DOCKER.md     # Guida completa
```

---

## 🎯 Comandi Essenziali

### Avvio e Gestione Base

```bash
# Avvia tutto
./docker.sh start

# Ferma tutto
./docker.sh stop

# Riavvia tutto
./docker.sh restart

# Stato dei servizi
./docker.sh status
```

### Monitoraggio e Debug

```bash
# Vedi tutti i log
./docker.sh logs

# Log del backend
./docker.sh logs backend

# Log del frontend
./docker.sh logs frontend

# Health check
./docker.sh health
```

### Gestione Database

```bash
# Backup del database
./docker.sh backup

# Restore da file
./docker.sh restore backups/backup_20250109.sql
```

### Manutenzione

```bash
# Rebuild completo
./docker.sh build

# Aggiorna applicazione
./docker.sh update

# Pulizia totale (ATTENZIONE!)
./docker.sh clean
```

---

## 🌐 Servizi Disponibili

Dopo l'avvio, l'applicazione espone:

| Servizio | URL/Porta | Descrizione |
|----------|-----------|-------------|
| Frontend | http://localhost | Interfaccia web |
| Backend API | http://localhost/api | REST API |
| WebSocket | ws://localhost/ws | Real-time |
| Database | localhost:5432 | PostgreSQL |
| MQTT | localhost:1883 | Broker MQTT |

---

## 🏗️ Architettura

```
┌──────────────────────────────────────────┐
│           Browser/Client                  │
│          http://localhost                 │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         NGINX (Container 1)               │
│    Frontend + Reverse Proxy               │
│   - Serve React/Vite build               │
│   - Proxy /api → Backend                 │
│   - Proxy /ws → WebSocket                │
└──────────────┬───────────────────────────┘
               │
       ┌───────┴──────┐
       │              │
       ▼              ▼
┌─────────────┐ ┌─────────────┐
│  Backend    │ │  WebSocket  │
│  (FastAPI)  │ │ (Socket.io) │
│ Container 2 │ │ Port 3000   │
└──────┬──────┘ └─────────────┘
       │
       ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │  Mosquitto  │
│ Container 3 │  │ Container 4 │
│ Port 5432   │  │ Port 1883   │
└─────────────┘  └─────────────┘
       │              │
       ▼              ▼
   [Volume]       [Volume]
  (Persistent)   (Persistent)
```

---

## ⚙️ Configurazione Avanzata

### Personalizza le Porte

Modifica `.env`:

```bash
# Cambia porta frontend (default: 80)
FRONTEND_PORT=8080

# Riavvia
./docker.sh restart

# Ora usa: http://localhost:8080
```

### Accesso da Rete Locale

1. Trova l'IP del tuo computer:
   ```bash
   hostname -I
   # oppure
   ifconfig | grep "inet "
   ```

2. Modifica `.env` e aggiungi l'IP a CORS_ORIGINS:
   ```bash
   CORS_ORIGINS=http://localhost,http://192.168.1.100
   ```

3. Riavvia:
   ```bash
   ./docker.sh restart
   ```

4. Accedi da altri dispositivi:
   ```
   http://192.168.1.100
   ```

### Limiti Risorse

Modifica `.env` per adattare ai tuoi limiti hardware:

```bash
# Raspberry Pi 3
DB_MEMORY_LIMIT=256M
MQTT_MEMORY_LIMIT=64M

# Raspberry Pi 4 (2GB)
DB_MEMORY_LIMIT=512M
MQTT_MEMORY_LIMIT=128M

# Raspberry Pi 4 (4GB+) / PC
DB_MEMORY_LIMIT=1G
MQTT_MEMORY_LIMIT=256M
```

---

## 🔒 Sicurezza

### Prima di andare in Produzione

1. **Cambia Password Database**:
   ```bash
   # In .env
   POSTGRES_PASSWORD=TuaPasswordSicura123!
   ```

2. **Genera Nuova Secret Key**:
   ```bash
   openssl rand -base64 32
   
   # Copia l'output in .env
   SECRET_KEY=chiave_generata_qui
   ```

3. **Configura CORS**:
   ```bash
   # Solo IP specifici
   CORS_ORIGINS=http://192.168.1.100,http://192.168.1.50
   ```

4. **Rebuild**:
   ```bash
   ./docker.sh clean
   ./docker.sh start
   ```

---

## 📊 Monitoraggio Risorse

Visualizza CPU, memoria e rete:

```bash
./docker.sh status
```

Output esempio:
```
NAME              CPU %   MEM USAGE / LIMIT   NET I/O
escape-frontend   0.5%    45MB / 512MB        1.2MB / 850KB
escape-backend    2.3%    120MB / 1GB         2.1MB / 1.8MB
escape-db         1.1%    85MB / 512MB        450KB / 380KB
escape-mqtt       0.1%    12MB / 128MB        50KB / 35KB
```

---

## 🔧 Troubleshooting

### Container non si avviano

```bash
# 1. Verifica Docker
docker ps

# 2. Controlla log
./docker.sh logs

# 3. Rebuild
./docker.sh stop
./docker.sh build
./docker.sh start
```

### Porta 80 occupata

```bash
# Cambia porta in .env
FRONTEND_PORT=8080

# Riavvia
./docker.sh restart
```

### Database non risponde

```bash
# Riavvia DB
docker compose restart db

# Verifica connessione
docker compose exec db pg_isready -U escape_user
```

### Backend errore 500

```bash
# Vedi log dettagliati
./docker.sh logs backend

# Accedi al container
./docker.sh shell backend

# Controlla DB
psql -U escape_user -d escape_db
```

---

## 💾 Backup e Restore

### Backup Automatico

```bash
# Crea backup
./docker.sh backup

# File creato in: backups/backup_TIMESTAMP.sql
```

### Restore da Backup

```bash
./docker.sh restore backups/backup_20250109_123456.sql
```

### Backup Manuale

```bash
docker compose exec -T db pg_dump -U escape_user escape_db > my_backup.sql
```

### Restore Manuale

```bash
docker compose exec -T db psql -U escape_user escape_db < my_backup.sql
```

---

## 📱 Integrazione ESP32

Gli ESP32 si connettono al broker MQTT:

```cpp
// Nel codice ESP32
const char* mqtt_server = "192.168.1.100";  // IP del server
const int mqtt_port = 1883;
const char* mqtt_user = "";  // Vuoto (no auth)
const char* mqtt_password = "";

// Topics
// escape/led/status
// escape/sensor/data
```

Per dettagli completi vedi: [ESP32_INTEGRATION_GUIDE.md](ESP32_INTEGRATION_GUIDE.md)

---

## 🆚 Docker vs Sviluppo Locale

### Quando usare Docker

✅ Produzione/Demo  
✅ Testing completo  
✅ Deploy su Raspberry Pi  
✅ Ambiente isolato  

### Quando usare Sviluppo Locale

✅ Sviluppo attivo  
✅ Hot-reload rapido  
✅ Debug con IDE  
✅ Modifiche frequenti  

### Sviluppo Locale (senza Docker)

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 2 - Frontend
cd escape-room-3d
npm install
npm run dev

# Apri: http://localhost:5173
```

---

## 📚 Documentazione Completa

- 📖 [GUIDA_AVVIO_DOCKER.md](GUIDA_AVVIO_DOCKER.md) - Guida dettagliata
- 📖 [GUIDA_DOCKER.md](GUIDA_DOCKER.md) - Documentazione estesa
- 📖 [README_DOCKER.md](README_DOCKER.md) - README tecnico
- 📖 [AVVIO_RAPIDO.md](AVVIO_RAPIDO.md) - Quick start
- 📖 [ESP32_INTEGRATION_GUIDE.md](ESP32_INTEGRATION_GUIDE.md) - ESP32

---

## 🎓 Tutorial Completo

### 1. Prima Installazione

```bash
# Entra nella cartella
cd escape-room-3d

# Rendi eseguibile lo script
chmod +x docker.sh

# Avvia (prima volta: 3-5 minuti)
./docker.sh start
```

### 2. Verifica Funzionamento

```bash
# Health check
./docker.sh health

# Vedi log
./docker.sh logs
```

### 3. Accedi all'Applicazione

Apri il browser: http://localhost

### 4. Gestione Quotidiana

```bash
# Avvia al mattino
./docker.sh start

# Controlla stato
./docker.sh status

# Vedi log se serve
./docker.sh logs backend

# Ferma alla sera
./docker.sh stop
```

---

## ✨ Best Practices

### Durante lo Sviluppo

- Usa `./docker.sh logs backend` per debug
- Fai backup regolari: `./docker.sh backup`
- Monitora risorse: `./docker.sh status`
- Testa su rete locale prima di produzione

### In Produzione

- Cambia TUTTE le password
- Configura CORS specifici
- Imposta limiti memoria appropriati
- Fai backup automatici giornalieri
- Monitora i log regolarmente

---

## 🚀 Performance

### Ottimizzazioni Applicate

✅ Build multi-stage (immagini più piccole)  
✅ Nginx come reverse proxy (performance)  
✅ Health checks (affidabilità)  
✅ Volume persistenti (non si perdono dati)  
✅ Network isolato (sicurezza)  
✅ Resource limits (stabilità)  

### Tempi di Avvio

- **Prima volta**: 3-5 minuti (download + build)
- **Avvii successivi**: 30-60 secondi
- **Con immagini in cache**: 10-20 secondi

---

## 🎯 Prossimi Passi

1. ✅ Leggi questa guida
2. ✅ Avvia con `./docker.sh start`
3. ✅ Apri http://localhost
4. ✅ Crea una sessione di test
5. ✅ Collega ESP32 (opzionale)
6. ✅ Configura per rete locale
7. ✅ Testa con utenti reali
8. ✅ Vai in produzione!

---

## ❓ FAQ

**Q: Devo installare Node.js o Python?**  
A: No, Docker include tutto.

**Q: Funziona su Windows/Mac/Linux?**  
A: Sì, Docker è multipiattaforma.

**Q: Posso usarlo su Raspberry Pi?**  
A: Sì, le immagini supportano ARM64.

**Q: I dati sono persistenti?**  
A: Sì, salvati in volumi Docker.

**Q: Come aggiorno l'app?**  
A: `./docker.sh update`

**Q: Posso cambiare la porta?**  
A: Sì, modifica `FRONTEND_PORT` in `.env`

**Q: Come vedo gli errori?**  
A: `./docker.sh logs backend`

---

## 📞 Supporto

Per problemi o domande:

1. Controlla i log: `./docker.sh logs`
2. Verifica la configurazione: `cat .env`
3. Prova un rebuild: `./docker.sh build`
4. Leggi la documentazione completa

---

## 🎉 Conclusione

Il tuo ambiente Docker è **completamente pronto**!

```bash
./docker.sh start
```

Apri http://localhost e inizia a giocare! 🚀

**Buon divertimento con la tua Escape Room 3D!** 🎮
