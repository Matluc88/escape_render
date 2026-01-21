# 🍓 Deploy Raspberry Pi + Router Mango - Guida Completa

## 📋 Situazione Attuale

- ✅ Raspberry Pi con Docker installato
- ✅ Raspberry connesso a Mango via Ethernet
- ✅ Mango sarà l'unico router (rete isolata)
- ✅ Codice pronto per deploy
- 🎯 **Obiettivo**: Sistema produzione completo

---

## 🔧 FASE 1: Preparazione Raspberry Pi

### 1.1 Accesso SSH

Sul Mac, connettiti al Raspberry:

```bash
# Trova IP Raspberry (se connesso a Mango)
# Di solito: 192.168.8.1 (IP fisso ethernet)
ssh pi@192.168.8.1
# Password: raspberry (default) o la tua password
```

**Se non sai l'IP:**
```bash
# Scansione rete Mango
nmap -sn 192.168.8.0/24
# Oppure dal router Mango (vedi web panel)
```

### 1.2 Verifica Docker

Sul Raspberry:

```bash
# Check Docker
docker --version

# Check Docker Compose
docker compose version

# Se manca Docker Compose:
sudo apt update
sudo apt install docker-compose-plugin -y
```

---

## 🌐 FASE 2: Configurazione Router Mango

### 2.1 Accesso Web Panel

1. **Browser**: `http://192.168.8.1` (o IP Mango)
2. **Login**: admin / password (o vedi etichetta)

### 2.2 Configurazione WiFi

**Wireless Settings:**
- SSID: `EscapeRoom` (o nome a scelta)
- Password: [password sicura]
- Canale: Auto o fisso (2.4GHz consigliato per ESP32)
- ⚠️ **IMPORTANTE**: Disabilita "AP Isolation" o "Client Isolation"

### 2.3 DHCP e IP Fissi

**LAN Settings:**

```
Raspberry Pi (ethernet):
- IP: 192.168.8.1
- Subnet: 255.255.255.0
- Gateway: 192.168.8.1 (se stesso)

DHCP Range WiFi:
- Start: 192.168.8.100
- End: 192.168.8.200
```

**IP Fissi ESP32 (opzionale ma consigliato):**
- ESP32 Cucina: 192.168.8.10
- ESP32 Soggiorno: 192.168.8.11
- ESP32 Esterno: 192.168.8.12

### 2.4 Port Forwarding (se necessario)

Per accesso esterno (opzionale):
- Frontend: porta 80 → 192.168.8.1:80
- Backend API: porta 8001 → 192.168.8.1:8001

---

## 📦 FASE 3: Deploy Applicazione

### 3.1 Trasferimento Codice

**Dal Mac** (in `/Users/matteo/Desktop/ESCAPE`):

```bash
# Comprimi progetto (escludi node_modules e cache)
cd escape-room-3d
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    -czf ../escape-room-deploy.tar.gz .

# Copia su Raspberry
scp ../escape-room-deploy.tar.gz pi@192.168.8.1:/home/pi/

# SSH su Raspberry
ssh pi@192.168.8.1
```

**Sul Raspberry:**

```bash
# Estrai
cd /home/pi
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d
```

### 3.2 Configurazione Ambiente

Crea `.env.production`:

```bash
cat > .env.production << 'EOF'
# Database
POSTGRES_PASSWORD=escape_room_secure_password_2026
DATABASE_URL=postgresql://escape_user:escape_room_secure_password_2026@db:5432/escape_room_db

# Backend
BACKEND_PORT=8001
CORS_ORIGINS=http://192.168.8.1,http://192.168.8.1:80

# Frontend
VITE_BACKEND_URL=http://192.168.8.1:8001
VITE_WS_URL=ws://192.168.8.1:8001

# Produzione
NODE_ENV=production
EOF
```

### 3.3 Build e Avvio

```bash
# Build containers
docker compose -f docker-compose.yml build

# Avvia in detached mode
docker compose -f docker-compose.yml up -d

# Check logs
docker compose logs -f

# Check status
docker compose ps
```

### 3.4 Verifica Funzionamento

```bash
# Test backend API
curl http://localhost:8001/api/sessions/active

# Check database
docker compose exec db psql -U escape_user -d escape_room_db -c "SELECT COUNT(*) FROM game_sessions;"

# Check containers health
docker compose ps
```

---

## 📱 FASE 4: Configurazione ESP32

### 4.1 Aggiorna Codice WiFi

Per **tutti gli ESP32** (cucina, soggiorno, esterno):

```cpp
// Configura WiFi Mango
const char* ssid = "EscapeRoom";  // Nome WiFi Mango
const char* password = "[password-mango]";  // Password WiFi

// Backend Raspberry Pi
const char* backend_url = "http://192.168.8.1:8001";
```

### 4.2 Upload ESP32

1. Apri Arduino IDE
2. Carica sketch aggiornato su ogni ESP32:
   - `esp32-cucina-COMPLETO.ino`
   - `esp32-soggiorno-COMPLETO.ino`
   - `esp32-esterno-COMPLETO.ino`
3. Apri Serial Monitor (115200 baud)
4. Verifica connessione:
   ```
   ✅ WiFi connesso!
   ✅ IP: 192.168.8.10
   ✅ Active session ID: [numero]
   ```

---

## ✅ FASE 5: Test Sistema Completo

### 5.1 Test Frontend

Da browser (smartphone/tablet connesso a WiFi Mango):

```
http://192.168.8.1
```

Verifica:
- [ ] Lobby carica
- [ ] Creazione sessione funziona
- [ ] WebSocket connette
- [ ] Stanze navigabili

### 5.2 Test ESP32

Con ESP32 accesi e connessi:

```bash
# Sul Raspberry, monitora logs
docker compose logs -f backend | grep ESP32

# Oppure guarda database
docker compose exec db psql -U escape_user -d escape_room_db \
  -c "SELECT room, led_state FROM kitchen_puzzles WHERE session_id = (SELECT id FROM game_sessions ORDER BY created_at DESC LIMIT 1);"
```

### 5.3 Test LED Fisici

1. Crea sessione da frontend
2. Interagisci con puzzle in-game
3. Verifica LED ESP32 cambiano stato
4. Verifica sensori fisici triggherano eventi

---

## 🔄 FASE 6: Manutenzione

### Riavvio Sistema

```bash
# Stop
docker compose down

# Start
docker compose up -d
```

### Backup Database

```bash
# Export database
docker compose exec db pg_dump -U escape_user escape_room_db > backup_$(date +%Y%m%d).sql

# Restore (se necessario)
docker compose exec -T db psql -U escape_user escape_room_db < backup_20260114.sql
```

### Update Codice

```bash
# Sul Raspberry
cd /home/pi/escape-room-3d
git pull  # Se usi git

# Rebuild
docker compose down
docker compose build
docker compose up -d
```

### Logs e Debug

```bash
# All logs
docker compose logs

# Solo backend
docker compose logs backend

# Solo frontend
docker compose logs frontend

# Live tail
docker compose logs -f --tail=100
```

---

## 🆘 Troubleshooting

### ESP32 non connette

1. **Check WiFi Mango**: SSID e password corretti?
2. **AP Isolation**: Disabilitata su Mango?
3. **IP Raspberry**: Verificato con `ifconfig`?
4. **Backend running**: `docker compose ps`

### Frontend non carica

1. **Nginx running**: `docker compose ps frontend`
2. **Port 80 libera**: `sudo lsof -i :80`
3. **Build corretto**: `docker compose logs frontend`

### Database errori

1. **Check password**: `.env.production` corretto?
2. **Migrations**: `docker compose exec backend alembic upgrade head`
3. **Reset database**: 
   ```bash
   docker compose down -v  # ⚠️ Cancella dati!
   docker compose up -d
   ```

---

## 📊 Checklist Finale Deploy

### Raspberry Pi
- [ ] Docker e Docker Compose installati
- [ ] Progetto copiato e estratto
- [ ] `.env.production` configurato
- [ ] Containers running (`docker compose ps`)
- [ ] Backend risponde (`curl localhost:8001/api/sessions/active`)

### Router Mango
- [ ] WiFi configurato (SSID: EscapeRoom)
- [ ] AP Isolation DISABILITATA
- [ ] DHCP range configurato
- [ ] Raspberry IP fisso (192.168.8.1)

### ESP32
- [ ] Tutti aggiornati con nuovo WiFi/backend
- [ ] Testati individualmente (Serial Monitor)
- [ ] LED rispondono a eventi game
- [ ] Sensori triggherano correttamente

### Test Integrato
- [ ] Frontend accessibile da smartphone
- [ ] Lobby funziona
- [ ] Sessioni create correttamente
- [ ] Stanze navigabili
- [ ] ESP32 sincronizzati
- [ ] Puzzle completabili end-to-end

---

## 🎉 Sistema Pronto!

Una volta completati tutti i check, il sistema è pronto per produzione!

**URL Accesso**:
- Frontend: `http://192.168.8.1`
- Admin: `http://192.168.8.1/admin`
- API: `http://192.168.8.1:8001/docs`

**Credenziali Admin** (da configurare):
- Vedere `SISTEMA_PIN_FINALE.md` per PIN admin

---

## 📚 Documenti di Riferimento

- `docker-compose.yml` - Configurazione Docker
- `ESP32_SETUP_ROUTER_MANGO_GUIDE.md` - Setup ESP32
- `LOBBY_SYSTEM_GUIDE.md` - Sistema lobby
- `SISTEMA_PIN_FINALE.md` - Sistema PIN admin
