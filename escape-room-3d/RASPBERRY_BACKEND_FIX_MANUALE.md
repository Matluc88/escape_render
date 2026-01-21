# GUIDA RAPIDA: Fix LED Bagno P18/P19 su Raspberry Pi

## PROBLEMA RISOLTO
LED porta-finestra (P18/P19) rimane OFF dopo completamento puzzle specchio.

## FIX APPLICATO
Aggiunto `db.commit()` in `backend/app/api/bathroom_puzzles.py` prima del broadcast WebSocket.

---

## COMANDI PER COMPLETARE IL DEPLOYMENT

### 1. Attendere completamento build Docker
Il build è in corso automaticamente e si completerà tra 1-2 minuti.

### 2. Avviare il container backend
```bash
ssh pi@192.168.8.10
cd /home/pi/escape-room-3d
docker compose up -d backend
```

### 3. Verificare che sia healthy (aspetta 20-30 secondi)
```bash
sleep 20
docker compose ps backend
```

**STATO ATTESO:** `STATUS: healthy`

### 4. Se vedi errori, controlla i log
```bash
docker compose logs backend | tail -50
```

---

## VERIFICA FUNZIONALITÀ LED

### Test completo della sequenza:
1. Riavvia la sessione dall'admin panel
2. **Stato iniziale:**
   - LED porta (bagno): ROSSO ✅
   - LED specchio: ROSSO ✅
   - Altri LED: SPENTO ⚫

3. **Completa puzzle specchio** → LED specchio diventa VERDE ✅

4. **VERIFICA FIX:**
   - LED porta-finestra (P18/P19) diventa ROSSO 🔴
   - Puzzle doccia è ora attivo

5. **Completa puzzle doccia** → LED doccia diventa VERDE ✅

6. **Completa puzzle ventola** → LED ventola diventa VERDE ✅

---

## RISOLUZIONE PROBLEMI

### Se backend non diventa healthy:
```bash
# Controlla i log per errori
docker compose logs backend | grep -E "(ERROR|null bytes|SyntaxError)"

# Se vedi "null bytes", rimuovi file problematici e rebuilda
find backend -name '._*' -type f -delete
docker compose build --no-cache backend
docker compose up -d backend
```

### Se LED rimane spento dopo fix:
```bash
# Verifica che ESP32 stia facendo polling
ssh pi@192.168.8.10
docker compose logs backend | grep "bathroom-puzzles/state"

# Dovresti vedere richieste GET ogni 2 secondi dall'IP ESP32
```

---

## FILE MODIFICATO
- `backend/app/api/bathroom_puzzles.py` 
  - Linea 58: Aggiunto `db.commit()` prima di `broadcast_bathroom_update()`

## DATA FIX
17 Gennaio 2026, ore 07:20