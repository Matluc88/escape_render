# 🚀 Deploy Servo P32 su Raspberry Pi - Guida Manuale

## ⚠️ Prerequisito
Verifica connessione al Raspberry Pi prima di procedere:

```bash
# Test ping
ping -c 3 192.168.8.10

# Test SSH (ti chiederà la password)
ssh pi@192.168.8.10 "echo 'Connessione OK'"
```

Se questi comandi falliscono, verifica:
- Raspberry Pi acceso
- Connesso alla stessa rete (192.168.8.x)
- SSH abilitato

---

## 📦 FASE 1: Trasferimento File (dal Mac)

Esegui questi comandi **uno alla volta** nel terminale:

```bash
# 1. Vai alla directory del progetto
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# 2. Trasferisci l'archivio (ti chiederà la password)
scp servo-p32-update.tar.gz pi@192.168.8.10:/home/pi/
```

**Password**: Inserisci la password del Raspberry Pi quando richiesto

✅ Se vedi "100%" il file è stato trasferito con successo!

---

## 🔧 FASE 2: Connessione SSH (dal Mac)

```bash
# Connettiti al Raspberry Pi
ssh pi@192.168.8.10
```

**Ora sei sul Raspberry Pi** - I prossimi comandi vanno eseguiti qui! 👇

---

## 🛠️ FASE 3: Deployment Backend (sul Raspberry Pi)

### 3.1 - Backup file esistenti

```bash
cd /home/pi/escape-room-3d
mkdir -p backups/pre-servo-p32

cp backend/app/models/livingroom_puzzle.py backups/pre-servo-p32/ 2>/dev/null || true
cp backend/app/api/livingroom_puzzles.py backups/pre-servo-p32/ 2>/dev/null || true
cp backend/app/services/livingroom_puzzle_service.py backups/pre-servo-p32/ 2>/dev/null || true

echo "✓ Backup creato"
```

### 3.2 - Estrazione file aggiornati

```bash
cd /home/pi
tar -xzf servo-p32-update.tar.gz -C escape-room-3d/backend/

echo "✓ File estratti"
```

### 3.3 - Posizionamento file nelle directory corrette

```bash
cd /home/pi/escape-room-3d/backend

# Sposta i file nelle posizioni corrette
mv -f livingroom_puzzle.py app/models/livingroom_puzzle.py
mv -f 013_add_livingroom_door_servo.py alembic/versions/013_add_livingroom_door_servo.py
mv -f livingroom_puzzles.py app/api/livingroom_puzzles.py
mv -f livingroom_puzzle_service.py app/services/livingroom_puzzle_service.py

echo "✓ File posizionati"
```

### 3.4 - Verifica file

```bash
ls -lh app/models/livingroom_puzzle.py
ls -lh alembic/versions/013_add_livingroom_door_servo.py
ls -lh app/api/livingroom_puzzles.py
ls -lh app/services/livingroom_puzzle_service.py
```

Dovresti vedere tutti e 4 i file con date recenti!

### 3.5 - Applicazione migration database

```bash
cd /home/pi/escape-room-3d
docker compose exec backend alembic upgrade head
```

✅ Output atteso:
```
INFO  [alembic.runtime.migration] Running upgrade 012 -> 013, add livingroom door servo field
✅ [Migration 013] door_servo_should_close field added
```

**Se vedi "already at head"**: Migration già applicata, OK! Continua.

### 3.6 - Riavvio backend

```bash
docker compose restart backend

# Attendi 5 secondi
sleep 5

# Verifica container
docker compose ps backend
```

✅ Output atteso: Container "escape-backend" con stato "Up"

---

## ✅ FASE 4: Test Endpoint (dal Raspberry Pi o Mac)

### Test 1: Endpoint door-servo-status

```bash
curl http://192.168.8.10:8001/api/sessions/1032/livingroom-puzzles/door-servo-status
```

✅ **Output atteso:**
```json
{"should_close_servo":false,"condizionatore_status":"..."}
```

❌ Se vedi ancora **404**, ricontrolla:
```bash
# Verifica file sono al posto giusto
ls -lh /home/pi/escape-room-3d/backend/app/api/livingroom_puzzles.py

# Riavvia backend più forte
docker compose down backend
docker compose up -d backend
```

### Test 2: Verifica migration database

```bash
docker compose exec backend alembic current
```

✅ Output atteso: `013_add_livingroom_door_servo (head)`

### Test 3: Verifica database direttamente

```bash
docker compose exec db psql -U escape_user -d escape_room_db \
  -c "SELECT door_servo_should_close FROM livingroom_puzzle_states WHERE session_id = 1032;"
```

✅ Output atteso:
```
 door_servo_should_close 
-------------------------
 f
```

---

## 🎉 FASE 5: Flash ESP32 (dal Mac)

Una volta confermato che l'endpoint funziona:

1. **Apri Arduino IDE**
2. **Carica file**: `escape-room-3d/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`
3. **Seleziona porta ESP32 soggiorno**
4. **Upload** ⬆️
5. **Apri Serial Monitor** (115200 baud)

✅ **Logs attesi:**
```
✅ WiFi connesso!
✅ IP: 192.168.8.11
✅ Backend: http://192.168.8.10:8001
✅ Active session ID: 1032
⚙️ Door servo status: should_close=false
🚪 Door servo at 45° (open)
```

---

## 🔍 Troubleshooting

### ❌ Endpoint ancora 404

```bash
# Rebuild completo backend
cd /home/pi/escape-room-3d
docker compose down backend
docker compose build backend
docker compose up -d backend

# Verifica logs
docker compose logs backend --tail=50
```

### ❌ Migration fallisce

```bash
# Verifica migration disponibili
docker compose exec backend alembic history

# Forza migration
docker compose exec backend alembic upgrade 013_add_livingroom_door_servo
```

### ❌ ESP32 non connette

1. Verifica WiFi: SSID e password corretti?
2. Verifica backend URL: `http://192.168.8.10:8001`
3. Verifica session_id: Esiste session 1032?

```bash
# Verifica sessioni attive
curl http://192.168.8.10:8001/api/sessions/active
```

---

## 📊 Checklist Finale

- [ ] File trasferiti su Raspberry Pi
- [ ] Backup creato
- [ ] File posizionati correttamente
- [ ] Migration 013 applicata
- [ ] Backend riavviato
- [ ] Container backend UP
- [ ] Endpoint risponde (non 404)
- [ ] Database contiene campo door_servo_should_close
- [ ] ESP32 flashato
- [ ] ESP32 polling funziona
- [ ] Serial Monitor mostra logs corretti

---

## 🚪 Test Funzionamento Completo

1. Crea sessione nuova da frontend
2. Completa puzzle condizionatore in soggiorno
3. Verifica ESP32 chiude porta (servo a 90°)
4. Reset scena da admin
5. Verifica ESP32 riapre porta (servo a 45°)

---

**Buon deployment! 🚀**