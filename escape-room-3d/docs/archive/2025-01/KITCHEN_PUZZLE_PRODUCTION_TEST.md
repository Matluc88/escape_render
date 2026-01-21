# 🧪 Kitchen Puzzle System - Test in Produzione

Guida completa per testare il sistema Kitchen Puzzle in ambiente production.

---

## 📋 Pre-requisiti

- ✅ Sistema deployato in produzione (Docker o Raspberry)
- ✅ Backend FastAPI in esecuzione
- ✅ Database PostgreSQL inizializzato
- ✅ MQTT broker attivo (Mosquitto)
- ✅ ESP32 configurato e connesso

---

## 🚀 Metodo 1: Test con ESP32 (Produzione Reale)

### 1️⃣ Verifica ESP32

```bash
# Controlla che ESP32 sia connesso e pubblichi su MQTT
mosquitto_sub -h localhost -t "home/cucina/pentola/stato"
```

**Output atteso:**
```
# Quando ESP32 rileva movimento pentola:
{"stato": "sui_fornelli", "timestamp": 1640000000}
```

### 2️⃣ Workflow Test Completo

1. **Apri la pagina studente** (da smartphone/tablet):
   ```
   http://<IP_RASPBERRY>:5173/join
   ```

2. **Inserisci il PIN della sessione** creato dall'admin

3. **Entra nella stanza Cucina**

4. **Verifica stato iniziale LED:**
   - 🔴 LED Porta: ROSSO (locked)
   - 🔴 LED Fornelli: ROSSO (active)
   - ⚫ LED Frigo: SPENTO (locked)
   - ⚫ LED Serra: SPENTO (locked)

5. **Muovi fisicamente la pentola sui fornelli** (attiva ESP32)

6. **Verifica comportamento:**
   - ✅ Pentola si muove nella scena 3D
   - ✅ LED Fornelli diventa 🟢 VERDE
   - ✅ Backend salva stato nel database
   - ✅ Tutti i client connessi vedono l'aggiornamento

---

## 🖥️ Metodo 2: Test Simulato (Senza Hardware)

### 1️⃣ Usa lo script di simulazione

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Simula ESP32 che pubblica su MQTT
node simulate-esp32.cjs
```

### 2️⃣ Oppure Pubblica Manualmente su MQTT

```bash
# Simula pentola sui fornelli
mosquitto_pub -h localhost -t "home/cucina/pentola/stato" \
  -m '{"stato": "sui_fornelli", "timestamp": 1640000000}'

# Simula pentola torna al posto originale
mosquitto_pub -h localhost -t "home/cucina/pentola/stato" \
  -m '{"stato": "originale", "timestamp": 1640000010}'
```

### 3️⃣ Verifica nei Log del Backend

```bash
# Se Docker
docker logs -f escape-room-backend --tail 100

# Output atteso:
# [MQTT] Received: home/cucina/pentola/stato
# [KitchenPuzzle] Pentola sui fornelli rilevata
# [KitchenPuzzle] Completing fornelli puzzle for session 1
# [WebSocket] Broadcasting puzzle_state_update to 3 clients
```

---

## 🔍 Metodo 3: Test via API REST (Debug)

### 1️⃣ Completa Manualmente il Puzzle

```bash
# Completa puzzle fornelli via API
curl -X POST http://localhost:3000/api/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "1",
    "puzzle_type": "fornelli"
  }'
```

**Response attesa:**
```json
{
  "success": true,
  "puzzle": {
    "id": 1,
    "session_id": "1",
    "puzzle_type": "fornelli",
    "state": "solved",
    "completed_at": "2024-12-26T13:00:00Z"
  }
}
```

### 2️⃣ Verifica Stato Sessione

```bash
# Controlla tutti i puzzle della sessione
curl http://localhost:3000/api/sessions/1
```

**Response attesa:**
```json
{
  "id": "1",
  "pin": "ABC123",
  "state": "active",
  "kitchen_puzzles": {
    "porta": "locked",
    "fornelli": "solved",  // ✅ Completato!
    "frigo": "locked",
    "serra": "locked"
  }
}
```

### 3️⃣ Reset Puzzle (per ri-testare)

```bash
# Reset tutti i puzzle della sessione
curl -X POST http://localhost:3000/api/kitchen-puzzles/reset/1 \
  -H "Content-Type: application/json" \
  -d '{"reset_type": "full"}'
```

---

## 📊 Monitoraggio in Tempo Reale

### 1️⃣ Dashboard Admin

Apri la dashboard admin:
```
http://<IP_RASPBERRY>:5173/admin/dashboard
```

**Verifica:**
- ✅ Contatore puzzle completati aggiornato in tempo reale
- ✅ Stato LED visualizzato correttamente
- ✅ Log eventi in tempo reale

### 2️⃣ WebSocket Monitor

Usa il browser console per monitorare WebSocket:

```javascript
// Apri Console nel browser (F12)
// I messaggi WebSocket appariranno automaticamente:

// Messaggio quando puzzle completato:
{
  type: 'puzzle_state_update',
  data: {
    session_id: '1',
    kitchen_puzzles: {
      fornelli: 'solved'
    }
  }
}
```

### 3️⃣ Database Check

```bash
# Connetti al database PostgreSQL
docker exec -it escape-room-postgres psql -U escaperoom -d escaperoom_db

# Query stato puzzle
SELECT * FROM kitchen_puzzles WHERE session_id = 1;

# Output atteso:
#  id | session_id | puzzle_type | state  | completed_at
# ----+------------+-------------+--------+--------------
#  1  |     1      | fornelli    | solved | 2024-12-26...
```

---

## ✅ Checklist Test Produzione

### Pre-Test
- [ ] Backend in esecuzione
- [ ] Database connesso e inizializzato
- [ ] MQTT broker attivo
- [ ] ESP32 connesso (se test reale)
- [ ] Sessione creata con PIN

### Test Funzionale
- [ ] LED inizialmente rosso (fornelli = active)
- [ ] Movimento pentola rilevato da ESP32/MQTT
- [ ] Animazione pentola eseguita nella scena 3D
- [ ] LED diventa verde (fornelli = solved)
- [ ] Stato salvato nel database
- [ ] WebSocket broadcast a tutti i client
- [ ] Dashboard admin aggiornata in tempo reale

### Test Reset
- [ ] Reset via API funzionante
- [ ] LED torna rosso dopo reset
- [ ] Stato database aggiornato correttamente
- [ ] Possibile ri-completare il puzzle

---

## 🐛 Troubleshooting Produzione

### Problema 1: LED non si aggiorna

**Diagnosi:**
```bash
# Controlla WebSocket
# Nel browser console (F12):
console.log(window.__WS_CONNECTED__)  // true?

# Verifica CORS backend
curl -I http://localhost:3000/api/sessions/1
# Header deve includere: Access-Control-Allow-Origin
```

**Soluzione:**
- Verifica `CORS_ORIGINS` in backend `.env`
- Riavvia backend: `docker-compose restart backend`

### Problema 2: ESP32 non pubblica su MQTT

**Diagnosi:**
```bash
# Monitora broker MQTT
mosquitto_sub -h localhost -t "#" -v

# Verifica ESP32 connesso
# Cerca log: "Connected to MQTT broker"
```

**Soluzione:**
- Verifica WiFi ESP32
- Controlla credenziali MQTT in codice ESP32
- Riavvia ESP32

### Problema 3: Stato non persiste nel database

**Diagnosi:**
```bash
# Controlla log backend
docker logs escape-room-backend | grep "kitchen_puzzle"

# Verifica connessione DB
docker exec -it escape-room-postgres pg_isready
```

**Soluzione:**
- Verifica `DATABASE_URL` in backend `.env`
- Esegui migrations: `docker exec escape-room-backend alembic upgrade head`

---

## 📝 Log Importanti da Monitorare

### Backend (FastAPI)
```
[MQTT] Subscribed to: home/cucina/pentola/stato
[MQTT] Received message: {"stato": "sui_fornelli"}
[KitchenPuzzle] Completing fornelli for session 1
[WebSocket] Broadcasting to 3 clients
```

### Frontend (Browser Console)
```javascript
[KitchenScene] ⚡ Tasto 5 - Pentola AI FORNELLI
[usePentolaAnimation] 🔄 NUOVA animazione - suiFornelli: true
[KitchenScene] 🔥 Pentola sui fornelli + enigma attivo → COMPLETO
[useKitchenPuzzle] Fornelli completed
🎨 WebSocket: Received puzzle_state_update
```

---

## 🎯 Test di Accettazione

Prima del rilascio finale, verifica:

1. ✅ **Multi-client**: 3+ studenti connessi vedono stesso stato
2. ✅ **Persistence**: Riavvio backend mantiene stato puzzle
3. ✅ **Real-time**: Aggiornamenti istantanei (<500ms)
4. ✅ **ESP32**: Hardware risponde a movimento fisico
5. ✅ **Reset**: Admin può resettare puzzle dalla dashboard
6. ✅ **LED**: Cambio colore visibile e immediato
7. ✅ **Database**: Query `SELECT * FROM kitchen_puzzles` mostra stato corretto

---

## 🚀 Deploy e Go-Live

Quando tutti i test sono ✅:

```bash
# 1. Commit modifiche
git add .
git commit -m "Kitchen Puzzle System - Production Ready"
git push origin clean-main

# 2. Deploy su Raspberry
ssh pi@<IP_RASPBERRY>
cd /home/pi/escape-room-3d
git pull
docker-compose up -d --build

# 3. Verifica health
curl http://localhost:3000/health

# 4. Crea sessione test
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Produzione"}'

# 5. Apri URL studente e testa!
```

---

## 📚 Risorse Aggiuntive

- **Guida Completa Sistema**: `KITCHEN_PUZZLE_INTEGRATION.md`
- **Guida LED**: `KITCHEN_LED_SYSTEM_COMPLETE.md`
- **Guida Tasto 5**: `KITCHEN_PUZZLE_TASTO5_GUIDE.md`
- **ESP32 MQTT**: `ESP32_MQTT_INTEGRATION.md`
- **Deploy Produzione**: `GUIDA_DEPLOYMENT_PRODUZIONE.md`

---

**Buon test in produzione! 🎉**
