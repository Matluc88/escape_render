# 🔧 DEPLOY BATHROOM LED FIX - COMANDI MANUALI RASPBERRY PI

## 📦 STATO ATTUALE
✅ File `backend-clean.tar.gz` trasferito su Raspberry Pi in `/home/pi/`
⏳ Ora serve estrarre, rebuild container, e testare

---

## 🚀 PASSO 1: Estrazione Backend su Raspberry Pi

Collegati via SSH alla Raspberry Pi e esegui:

```bash
ssh pi@192.168.8.10
```

Una volta dentro, estrai il backend:

```bash
cd /home/pi
tar -xzf backend-clean.tar.gz
ls -la backend/ | head -20
```

---

## 🐳 PASSO 2: Verifica Path Progetto

Assicurati di essere nella directory corretta (dove si trova il docker-compose.yml):

```bash
cd escape-room-3d  # O il path dove hai il progetto
pwd  # Verifica di essere in /home/pi/escape-room-3d
```

---

## 🔨 PASSO 3: Rebuild Container Backend

Stop del container backend attuale:

```bash
docker-compose stop backend
```

Rebuild con le modifiche:

```bash
docker-compose build --no-cache backend
```

Start del nuovo container:

```bash
docker-compose up -d backend
```

---

## 🔍 PASSO 4: Verifica Healthy Status

Controlla i logs per verificare che parta correttamente:

```bash
docker-compose logs -f backend --tail=50
```

Premi `Ctrl+C` per uscire dai logs.

Verifica lo stato dei container:

```bash
docker-compose ps
```

Il backend dovrebbe essere **healthy** o **running**.

---

## ✅ PASSO 5: Test In-Game

1. **Stato Iniziale:**
   - LED porta: ROSSO (P14/P15)
   - LED specchio: ROSSO (P22/P23)
   - LED porta-finestra: OFF (P18/P19) ✨
   - Tutti gli altri LED: OFF

2. **Risolvi Puzzle Specchio** (`/api/sessions/{id}/bathroom-puzzles/complete` con `puzzle: "specchio"`)

3. **Verifica LED Porta-Finestra:**
   - Dopo aver completato lo specchio, il **LED porta-finestra (P18/P19) dovrebbe diventare ROSSO** 🔴
   - Questo indica che il puzzle "doccia" è ora attivo
   - ESP32 legge lo stato da `/api/sessions/{id}/bathroom-puzzles/state`
   - Campo `led_states.porta_finestra` dovrebbe essere `"RED"`

4. **Console ESP32:**
   ```
   LED_INDIZIO_PORTA_FINESTRA_BAGNO: RED (active)
   ```

---

## 🐛 FIX APPLICATO

**File**: `backend/app/api/bathroom_puzzles.py`

**Linea ~58-62**:
```python
if result is None:
    raise HTTPException(
        status_code=400,
        detail=f"Cannot complete {puzzle_name} - check puzzle sequence"
    )

# 🔥 FIX: Commit changes to database before broadcasting
db.commit()

# Broadcast update via WebSocket
await broadcast_bathroom_update(session_id, result.dict())
```

**Problema Risolto**: 
- Il `db.commit()` mancante impediva la persistenza delle modifiche al database
- L'ESP32 continuava a leggere lo stato vecchio (doccia = "locked" invece di "active")
- Il LED porta-finestra rimaneva spento invece di diventare rosso

---

## 📝 NOTE

- Il tarball è stato creato con `tar --no-xattrs` per evitare problemi di null bytes su macOS
- La modifica è solo in `bathroom_puzzles.py` - nessun altro file alterato
- Il fix garantisce che le transizioni di stato FSM siano persistenti nel database

---

## 🆘 TROUBLESHOOTING

Se il container non parte:

```bash
docker-compose logs backend --tail=100
```

Se ci sono errori di sintassi Python:

```bash
# Verifica file bathroom_puzzles.py
cat backend/app/api/bathroom_puzzles.py | grep -A 5 "db.commit()"
```

Se i LED non cambiano stato:

```bash
# Verifica endpoint API
curl http://192.168.8.10:8000/api/sessions/{SESSION_ID}/bathroom-puzzles/state
```

---

## ✨ RISULTATO ATTESO

Dopo il deploy:
- ✅ Puzzle specchio completato → LED porta-finestra diventa ROSSO
- ✅ Puzzle doccia diventa "active"
- ✅ Database persistente con modifiche salvate
- ✅ WebSocket broadcast aggiornato
- ✅ ESP32 legge stato corretto e accende LED P18/P19