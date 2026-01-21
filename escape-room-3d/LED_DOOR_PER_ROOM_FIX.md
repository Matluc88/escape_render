# 🚪 Fix LED Porte - Sistema Per-Stanza Corretto

## 📋 Problema Risolto

I LED delle porte lampeggiano da subito invece di partire rossi. La fix precedente aveva implementato un sistema globale sbagliato.

## ✅ Soluzione Implementata

### 🎯 Logica Corretta (Ibrida: Per-Stanza + Globale Vittoria)

| Stato Stanza | Stato Gioco | LED Colore | Significato |
|--------------|-------------|------------|-------------|
| ❌ NON completata | Qualsiasi | 🔴 **Rosso** | "Questa stanza non è ancora risolta" |
| ✅ Completata | < 4 stanze | 🟢⚡ **Lampeggiante** | "Questa stanza è risolta, aspetto gli altri" |
| ✅ Completata | 4/4 stanze | 🟢 **Verde FISSO** | "VITTORIA! Tutti hanno finito!" |

### 📝 Esempi Pratici

**Scenario 1 - Inizio (0/4)**:
```
Cucina:    🔴 Rosso
Camera:    🔴 Rosso
Bagno:     🔴 Rosso
Soggiorno: 🔴 Rosso
```

**Scenario 2 - Solo cucina completata (1/4)**:
```
Cucina:    🟢⚡ Lampeggiante  ← Solo questa!
Camera:    🔴 Rosso
Bagno:     🔴 Rosso
Soggiorno: 🔴 Rosso
```

**Scenario 3 - Cucina e camera completate (2/4)**:
```
Cucina:    🟢⚡ Lampeggiante
Camera:    🟢⚡ Lampeggiante
Bagno:     🔴 Rosso
Soggiorno: 🔴 Rosso
```

**Scenario 4 - Vittoria! (4/4)**:
```
Cucina:    🟢 Verde FISSO  ← TUTTI verdi!
Camera:    🟢 Verde FISSO
Bagno:     🟢 Verde FISSO
Soggiorno: 🟢 Verde FISSO
```

---

## 🔧 Istruzioni Completamento Fix

### 1. Reset Database

Esegui lo script SQL per pulire gli stati errati:

```bash
# Metodo 1: Da Docker
docker exec -i escape-room-3d-db-1 psql -U postgres -d escaperoom < escape-room-3d/reset-all-puzzles.sql

# Metodo 2: Manualmente
docker exec -it escape-room-3d-db-1 psql -U postgres -d escaperoom
```

Se usi il metodo 2, copia e incolla il contenuto di `reset-all-puzzles.sql`.

### 2. Riavvia Backend

Il backend deve ricaricare il codice modificato:

```bash
cd escape-room-3d
docker-compose restart backend

# Verifica che sia ripartito
docker-compose logs -f backend
```

### 3. Verifica Stato Iniziale

Controlla che tutto sia pulito:

```bash
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "red",      # ✅ ROSSO
    "cucina": "red",      # ✅ ROSSO
    "bagno": "red",
    "soggiorno": "red"
  },
  "completed_rooms": 0,
  "game_won": false
}
```

---

## 🧪 Test Completo

### Test 1: Camera da Letto

```bash
# 1. LED dovrebbe essere ROSSO all'inizio
curl http://localhost:3000/api/sessions/1/game-completion/state | jq '.door_led_states.camera'
# Output: "red" ✅

# 2. Completa sequenza camera: M → L → J
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "materasso"}'

curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "poltrona"}'

curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "ventola"}'

# 3. LED camera dovrebbe essere LAMPEGGIANTE
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "blinking",  # ✅ LAMPEGGIANTE
    "cucina": "red",       # ✅ Ancora rosso!
    "bagno": "red",
    "soggiorno": "red"
  },
  "completed_rooms": 1
}
```

### Test 2: Cucina

```bash
# Completa cucina (sequenza completa 1→2→3→4→5)
curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "frigo"}'

curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "pentola"}'

curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "pulsante"}'

curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "neon"}'

curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "serra"}'

# Verifica stato
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "blinking",  # ✅ LAMPEGGIANTE
    "cucina": "blinking",  # ✅ LAMPEGGIANTE
    "bagno": "red",        # ✅ Ancora rosso
    "soggiorno": "red"
  },
  "completed_rooms": 2
}
```

### Test 3: Vittoria (4/4)

Quando tutte e 4 le stanze sono completate:

```bash
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "green",     # ✅ VERDE FISSO
    "cucina": "green",     # ✅ VERDE FISSO
    "bagno": "green",      # ✅ VERDE FISSO
    "soggiorno": "green"   # ✅ VERDE FISSO
  },
  "completed_rooms": 4,
  "game_won": true         # 🎊 VITTORIA!
}
```

---

## 🎮 Test Frontend (Browser)

1. **Apri browser**: `http://localhost:5173/play/1/camera?name=Tester`

2. **Verifica LED rosso** all'ingresso

3. **Completa camera** (tasti K → M → L → J)

4. **Verifica LED lampeggiante** (500ms)

5. **Vai in cucina**: `http://localhost:5173/play/1/cucina?name=Tester`

6. **Verifica LED cucina ancora rosso**

7. **Completa cucina** (tasti 1 → 2 → 3 → 4 → 5)

8. **Verifica LED cucina lampeggiante**

---

## 📊 File Modificati

1. **`backend/app/services/game_completion_service.py`**
   - Ripristinata logica per-stanza originale
   - Commenti aggiornati

2. **`reset-all-puzzles.sql`**
   - Script SQL per reset completo database

3. **`LED_DOOR_PER_ROOM_FIX.md`** (questo file)
   - Documentazione completa della fix

---

## 🐛 Troubleshooting

### LED Ancora Lampeggiante dopo Reset

**Causa**: Backend non riavviato o cache browser

**Soluzione**:
```bash
# 1. Riavvia backend
docker-compose restart backend

# 2. Clear cache browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# 3. Re-esegui script SQL
docker exec -i escape-room-3d-db-1 psql -U postgres -d escaperoom < escape-room-3d/reset-all-puzzles.sql
```

### LED Rosso Non Cambia Dopo Completamento

**Causa**: WebSocket non connesso o errore API

**Soluzione**:
1. Apri Console Browser (F12)
2. Cerca errori WebSocket o API
3. Verifica che il backend sia in esecuzione:
   ```bash
   docker-compose ps backend
   docker-compose logs backend
   ```

### LED Diversi tra Scene

**NON DOVREBBE SUCCEDERE** - ogni stanza ha il suo LED indipendente!

Se vedi comportamento strano, verifica che tutte le scene usino `useGameCompletion`:

```javascript
// ✅ CORRETTO in ogni scene
const gameCompletion = useGameCompletion(sessionId, socket);
<PuzzleLED state={gameCompletion.getDoorLEDColor('camera')} />
```

---

## ✅ Checklist Post-Fix

- [x] Codice `game_completion_service.py` modificato
- [ ] Script SQL `reset-all-puzzles.sql` eseguito
- [ ] Backend riavviato
- [ ] Test: LED rossi all'inizio (0/4)
- [ ] Test: LED lampeggiante dopo singola stanza completata
- [ ] Test: LED verde fisso dopo vittoria (4/4)
- [ ] Test frontend browser completato

---

## 📝 Riepilogo Logica

### Differenza con Fix Precedente

**Fix Ieri (SBAGLIATA)**:
- Tutti i LED cambiano insieme
- 0 stanze → tutti rossi
- 1-3 stanze → tutti lampeggianti ❌
- 4 stanze → tutti verdi

**Fix Oggi (CORRETTA)**:
- Ogni LED indipendente per la sua stanza
- Stanza NON completata → rosso ✅
- Stanza completata (< 4 totali) → lampeggiante ✅
- Tutte 4 completate → verde fisso ✅

### Quando Usare Sistema Globale vs Per-Stanza

- **Per-Stanza**: Rosso/Lampeggiante (feedback locale)
- **Globale**: Verde fisso (vittoria collettiva)

Questo dà ai giocatori:
1. Feedback immediato sui propri progressi (per-stanza)
2. Consapevolezza che gli altri devono finire (rosso vs lampeggiante)
3. Celebrazione collettiva della vittoria (tutti verdi insieme)

---

**Data**: 30 Dicembre 2024  
**Versione**: 2.0.0 (Fix Corretta)  
**Status**: ✅ RISOLTO

---

**Fine Documento** 🎊
