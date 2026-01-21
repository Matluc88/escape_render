# 🐳 Guida Rapida - Avvio con Docker

## 🚀 Avvio Rapido (3 Comandi)

```bash
cd escape-room-3d

# 1. Rendi eseguibile lo script
chmod +x docker.sh

# 2. Avvia tutto
./docker.sh start
```

**Fatto!** L'applicazione è in esecuzione su: **http://localhost**

---

## 📋 Requisiti

- **Docker Desktop** (macOS/Windows) o **Docker Engine** (Linux)
  - [Scarica Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 🎯 Comandi Principali

### Avvia l'applicazione
```bash
./docker.sh start
```

### Ferma l'applicazione
```bash
./docker.sh stop
```

### Riavvia l'applicazione
```bash
./docker.sh restart
```

### Vedi i log in tempo reale
```bash
# Tutti i servizi
./docker.sh logs

# Solo backend
./docker.sh logs backend

# Solo frontend
./docker.sh logs frontend

# Solo database
./docker.sh logs db
```

### Verifica lo stato
```bash
./docker.sh status
```

### Verifica la salute dei servizi
```bash
./docker.sh health
```

---

## 🌐 URL e Porte

Dopo l'avvio, l'applicazione sarà disponibile su:

| Servizio | URL | Descrizione |
|----------|-----|-------------|
| **Frontend** | http://localhost | Interfaccia principale |
| **API Backend** | http://localhost/api | Endpoint REST |
| **WebSocket** | ws://localhost/ws | WebSocket in tempo reale |
| **MQTT Broker** | mqtt://localhost:1883 | Broker MQTT per ESP32 |

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────┐
│                   NGINX                          │
│         (Frontend + Reverse Proxy)               │
│              http://localhost                     │
└─────────────┬───────────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│   Backend   │ │  WebSocket  │
│  (FastAPI)  │ │  (Socket.io)│
│   :3000     │ │   :3000     │
└──────┬──────┘ └─────────────┘
       │
       ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │  Mosquitto  │
│  Database   │  │   (MQTT)    │
│   :5432     │  │   :1883     │
└─────────────┘  └─────────────┘
```

---

## ⚙️ Configurazione

### File .env

Il file `.env` contiene tutte le configurazioni. Le principali:

```bash
# Database
POSTGRES_USER=escape_user
POSTGRES_PASSWORD=Escape2024!SecurePassword
POSTGRES_DB=escape_db

# Frontend
FRONTEND_PORT=80

# Backend URLs
VITE_BACKEND_URL=http://localhost:8001
VITE_WS_URL=http://localhost:8001
```

### Accesso dalla rete locale

Per accedere da altri dispositivi (smartphone, tablet):

1. Trova l'IP del tuo computer:
   ```bash
   # macOS/Linux
   hostname -I
   
   # oppure
   ifconfig | grep "inet "
   ```

2. Aggiungi l'IP a `CORS_ORIGINS` nel file `.env`:
   ```bash
   CORS_ORIGINS=http://localhost,http://192.168.1.100
   ```

3. Riavvia:
   ```bash
   ./docker.sh restart
   ```

4. Accedi da altri dispositivi: `http://TUO_IP`

---

## 🔧 Comandi Avanzati

### Backup del database
```bash
./docker.sh backup
```

### Restore del database
```bash
./docker.sh restore backups/backup_TIMESTAMP.sql
```

### Ricostruire le immagini
```bash
./docker.sh build
```

### Aggiornare l'applicazione
```bash
./docker.sh update
```

### Aprire una shell nel container
```bash
# Backend
./docker.sh shell backend

# Frontend
./docker.sh shell frontend

# Database
./docker.sh shell db
```

### Pulizia completa
```bash
./docker.sh clean
```
⚠️ **ATTENZIONE**: Rimuove TUTTO (container, volumi, dati del database)

---

## 📊 Monitoraggio

### Visualizza l'uso delle risorse
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

## 🔍 Troubleshooting

### I container non si avviano

1. Verifica che Docker sia in esecuzione:
   ```bash
   docker ps
   ```

2. Controlla i log:
   ```bash
   ./docker.sh logs
   ```

3. Riprova con rebuild:
   ```bash
   ./docker.sh stop
   ./docker.sh build
   ./docker.sh start
   ```

### Errore "port already in use"

Porta 80 già occupata:
```bash
# Cambia la porta nel .env
FRONTEND_PORT=8080

# Riavvia
./docker.sh restart

# Ora usa: http://localhost:8080
```

### Backend non risponde

```bash
# Verifica i log del backend
./docker.sh logs backend

# Verifica il database
./docker.sh shell db
psql -U escape_user -d escape_db
```

### Database non si connette

```bash
# Riavvia solo il database
docker compose restart db

# Verifica la connessione
docker compose exec db pg_isready -U escape_user
```

---

## 🆚 Sviluppo vs Produzione

### Sviluppo Locale (senza Docker)
Per sviluppo con hot-reload:
```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 2 - Frontend
npm install
npm run dev
```
Apri: http://localhost:5173

### Produzione (con Docker)
```bash
./docker.sh start
```
Apri: http://localhost

---

## 📦 Volumi Docker

I dati persistenti sono salvati in volumi Docker:

```bash
# Lista volumi
docker volume ls

# Ispeziona un volume
docker volume inspect escape-room-3d_postgres_data
```

I backup manuali sono nella cartella `backups/`

---

## 🔐 Sicurezza

### Cambia le password

Prima di andare in produzione:

1. **Database Password**:
   ```bash
   # In .env
   POSTGRES_PASSWORD=TuaPasswordForte123!
   ```

2. **Secret Key**:
   ```bash
   # Genera una nuova chiave
   openssl rand -base64 32
   
   # In .env
   SECRET_KEY=nuova_chiave_generata
   ```

3. Ricostruisci:
   ```bash
   ./docker.sh stop
   ./docker.sh clean
   ./docker.sh start
   ```

---

## 📱 Integrazione ESP32

Gli ESP32 si connettono al broker MQTT:

```cpp
const char* mqtt_server = "192.168.1.100";  // IP del server
const int mqtt_port = 1883;
```

Vedi: [ESP32_INTEGRATION_GUIDE.md](ESP32_INTEGRATION_GUIDE.md)

---

## 🎓 Tutorial Video

### Prima esecuzione
1. Apri il terminale nella cartella `escape-room-3d`
2. Rendi eseguibile lo script: `chmod +x docker.sh`
3. Avvia: `./docker.sh start`
4. Aspetta che tutto si avvii (prima volta: 2-5 minuti)
5. Apri il browser su: http://localhost
6. Fatto! 🎉

---

## 📞 Comandi Rapidi - Cheat Sheet

```bash
./docker.sh start       # 🟢 Avvia tutto
./docker.sh stop        # 🔴 Ferma tutto
./docker.sh restart     # 🔄 Riavvia tutto
./docker.sh logs        # 📜 Vedi log
./docker.sh status      # 📊 Stato servizi
./docker.sh health      # 🏥 Health check
./docker.sh backup      # 💾 Backup DB
./docker.sh build       # 🏗️  Ricostruisci
./docker.sh clean       # 🧹 Pulisci tutto
./docker.sh help        # ❓ Aiuto
```

---

## 🌟 Best Practices

### Durante lo sviluppo
- Usa `./docker.sh logs backend` per vedere gli errori
- Modifica il codice e usa `./docker.sh restart` per applicare le modifiche
- Fai backup regolari: `./docker.sh backup`

### In produzione
- Cambia tutte le password nel `.env`
- Configura CORS per gli IP specifici
- Monitora le risorse con `./docker.sh status`
- Imposta backup automatici

---

## ❓ FAQ

**Q: Posso usare una porta diversa dalla 80?**  
A: Sì, cambia `FRONTEND_PORT=8080` nel `.env` e riavvia.

**Q: Come accedo al database?**  
A: `./docker.sh shell db` poi `psql -U escape_user -d escape_db`

**Q: I dati vengono persi quando fermo Docker?**  
A: No, sono salvati in volumi persistenti.

**Q: Come aggiorno l'applicazione?**  
A: `./docker.sh update` (se hai Git) o `./docker.sh restart`

**Q: Funziona su Raspberry Pi?**  
A: Sì! Le immagini sono multi-arch (ARM64/AMD64).

---

## 📚 Risorse Utili

- [GUIDA_DOCKER.md](GUIDA_DOCKER.md) - Guida completa
- [README_DOCKER.md](README_DOCKER.md) - Documentazione dettagliata
- [ESP32_INTEGRATION_GUIDE.md](ESP32_INTEGRATION_GUIDE.md) - Integrazione ESP32
- [AVVIO_RAPIDO.md](AVVIO_RAPIDO.md) - Quick start

---

## 🎯 Prossimi Passi

1. ✅ Avvia con `./docker.sh start`
2. ✅ Apri http://localhost nel browser
3. ✅ Crea una sessione di gioco
4. ✅ Collega gli ESP32
5. ✅ Inizia a giocare!

**Buon divertimento! 🎮**
