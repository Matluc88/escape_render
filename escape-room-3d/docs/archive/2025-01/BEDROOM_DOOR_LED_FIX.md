# 🔴→🟢 Fix LED Porta Camera da Letto - Sistema Globale

## 📋 Problema Originale

Il LED della porta della camera da letto (`LED_PORTA_LETTO` - UUID: `F228346D-C130-4F0F-A7A5-4D41EEFC8C77`) partiva **lampeggiante** invece di **rosso**.

### Comportamento Atteso
- ✅ **ROSSO** all'inizio (0 stanze completate)
- ✅ **LAMPEGGIANTE** solo dopo che tutti gli enigmi sono completati (1-3 stanze completate)
- ✅ **VERDE FISSO** quando tutte e 4 le stanze sono completate

---

## 🔍 Causa del Bug

La logica originale in `game_completion_service.py` calcolava il LED **per ogni porta individualmente**:

```python
# ❌ LOGICA VECCHIA (SBAGLIATA)
for room_name in ["cucina", "camera", "bagno", "soggiorno"]:
    room_completed = state.rooms_status[room_name].get("completed", False)
    
    if room_completed:
        led_states[room_name] = "blinking"  # ← Camera lampeggiava se camera completata
    else:
        led_states[room_name] = "red"
```

**Problema**: Se la camera era completata (porta unlocked), il LED lampeggiava INDIPENDENTEMENTE dalle altre stanze.

---

## ✅ Soluzione Implementata

La nuova logica calcola il LED **GLOBALMENTE** basandosi sul conteggio totale:

```python
# ✅ LOGICA NUOVA (CORRETTA)
# Count how many rooms are completed
completed_count = sum(
    1 for room_status in state.rooms_status.values()
    if room_status.get("completed", False)
)

# Calculate global LED state based on total count
if completed_count == 0:
    global_led_state = "red"        # 🔴 Nessuna stanza completata
elif completed_count < 4:
    global_led_state = "blinking"   # 🟢⚡ 1-3 stanze completate
else:
    global_led_state = "green"      # 🟢 Tutte 4 stanze completate (VITTORIA!)

# All doors have the same LED state
led_states = {
    "cucina": global_led_state,
    "camera": global_led_state,
    "bagno": global_led_state,
    "soggiorno": global_led_state
}
```

### Logica Corretta

| Stanze Completate | LED Stato | Visual |
|-------------------|-----------|--------|
| 0 | 🔴 Rosso fisso | Nessun progresso |
| 1 | 🟢⚡ Verde lampeggiante | Progresso! |
| 2 | 🟢⚡ Verde lampeggiante | Continua così! |
| 3 | 🟢⚡ Verde lampeggiante | Quasi finito! |
| 4 | 🟢 Verde fisso | VITTORIA! 🎊 |

**IMPORTANTE**: Tutti i LED delle 4 porte hanno sempre lo stesso colore (sistema globale).

---

## 🧪 Come Testare

### Test 1: Stato Iniziale (0 stanze)

```bash
# 1. Reset database
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/reset \
  -H "Content-Type: application/json" \
  -d '{"level": "full"}'

# 2. Controlla stato game completion
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "red",      # ✅ ROSSO
    "cucina": "red",
    "bagno": "red",
    "soggiorno": "red"
  },
  "completed_rooms": 0,
  "game_won": false
}
```

### Test 2: Prima Stanza Completata (Camera)

```bash
# Simula completamento sequenza camera:
# K → M → L → J (materasso → poltrona → ventola → porta unlocked)

# 1. TASTO M - Completa materasso
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "materasso"}'

# 2. TASTO L - Completa poltrona
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "poltrona"}'

# 3. TASTO J - Completa ventola (sblocca porta!)
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "ventola"}'

# 4. Controlla LED
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "blinking",    # ✅ LAMPEGGIANTE!
    "cucina": "blinking",    # ✅ Anche cucina lampeggia (globale)
    "bagno": "blinking",
    "soggiorno": "blinking"
  },
  "completed_rooms": 1,      # ✅ 1 stanza completata
  "game_won": false
}
```

### Test 3: Seconda Stanza Completata (Cucina)

```bash
# Completa anche la cucina
curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "serra"}'

# Controlla LED
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

# Output atteso:
{
  "door_led_states": {
    "camera": "blinking",    # ✅ Ancora lampeggiante
    "cucina": "blinking",
    "bagno": "blinking",
    "soggiorno": "blinking"
  },
  "completed_rooms": 2,      # ✅ 2 stanze completate
  "game_won": false
}
```

### Test 4: Vittoria Completa (4 stanze)

```bash
# Quando tutte e 4 le stanze sono completate:

# Output atteso:
{
  "door_led_states": {
    "camera": "green",       # ✅ VERDE FISSO
    "cucina": "green",
    "bagno": "green",
    "soggiorno": "green"
  },
  "completed_rooms": 4,
  "game_won": true           # 🎊 VITTORIA!
}
```

---

## 🎮 Test Frontend (Browser)

### Setup
```bash
# 1. Avvia Docker
cd escape-room-3d
docker-compose up -d

# 2. Apri browser
http://localhost:5173/play/1/camera?name=Tester
```

### Verifica Visiva

1. **All'ingresso nella stanza**:
   - LED porta dovrebbe essere 🔴 ROSSO FISSO

2. **Dopo aver premuto K → M → L → J**:
   - LED porta dovrebbe diventare 🟢⚡ VERDE LAMPEGGIANTE (500ms)
   - Console log dovrebbe mostrare: `"door_led_states": { "camera": "blinking" }`

3. **Dopo aver completato altre 3 stanze**:
   - LED porta dovrebbe diventare 🟢 VERDE FISSO
   - Console log dovrebbe mostrare: `"game_won": true`

---

## 🔄 Riavvio Backend

**IMPORTANTE**: Dopo aver modificato `game_completion_service.py`, riavvia il backend:

```bash
# Metodo 1: Docker Compose
docker-compose restart backend

# Metodo 2: Stop & Start
docker-compose down
docker-compose up -d

# Verifica logs
docker-compose logs -f backend | grep "GameCompletion"
```

---

## 🐛 Troubleshooting

### LED Ancora Lampeggiante dopo Fix

**Causa**: Database ha dati vecchi

**Soluzione**:
```bash
# Reset completo stato sessione
curl -X POST http://localhost:3000/api/sessions/1/bedroom-puzzles/reset \
  -H "Content-Type: application/json" \
  -d '{"level": "full"}'

# Oppure connettiti al database e pulisci manualmente:
docker exec -it escape-room-3d-db-1 psql -U postgres -d escaperoom

# SQL:
UPDATE game_completion_states 
SET rooms_status = '{"cucina": {"completed": false}, "camera": {"completed": false}, "bagno": {"completed": false}, "soggiorno": {"completed": false}}'::jsonb,
    game_won = false,
    victory_time = NULL
WHERE session_id = 1;

UPDATE bedroom_puzzle_states
SET puzzle_states = (SELECT puzzle_states FROM bedroom_puzzle_states LIMIT 0)
WHERE session_id = 1;
```

### LED Diversi tra Stanze

**NON DOVREBBE SUCCEDERE**: Con la nuova logica, tutti i LED sono sempre sincronizzati.

Se vedi LED diversi, significa che il backend non è stato riavviato o stai guardando cache vecchia.

**Fix**:
1. Riavvia backend: `docker-compose restart backend`
2. Clear cache browser: Ctrl+Shift+R
3. Controlla che tutti i componenti React usino `useGameCompletion`:

```javascript
// ✅ CORRETTO
const gameCompletion = useGameCompletion(sessionId, socket);
<PuzzleLED state={gameCompletion.getDoorLEDColor('camera')} />
```

---

## 📊 Riepilogo Modifiche

### File Modificati
- `backend/app/services/game_completion_service.py`

### Cambiamenti Specifici
1. **Rimozione loop per-stanza**: Eliminato il loop che calcolava LED individualmente
2. **Aggiunta conteggio globale**: Conta tutte le stanze completate
3. **Stato LED unificato**: Tutti i LED hanno lo stesso colore
4. **Commenti aggiornati**: Documentazione inline più chiara

### Breaking Changes
**NESSUNO**: L'API esterna rimane identica, cambia solo la logica interna.

---

## ✅ Checklist Post-Fix

- [x] Modificato `game_completion_service.py`
- [ ] Riavviato backend Docker
- [ ] Testato stato iniziale (LED rosso)
- [ ] Testato dopo 1 stanza (LED lampeggiante)
- [ ] Testato dopo 4 stanze (LED verde fisso)
- [ ] Verificato sincronizzazione tra tutte le porte
- [ ] Testato nel browser frontend

---

## 📝 Note Tecniche

### Perché Sistema Globale?

Il sistema globale fornisce **feedback progressivo uniforme**:
- I giocatori vedono subito quando fanno progressi (tutti i LED cambiano)
- Più motivante: anche se sei in un'altra stanza, vedi i progressi del team
- Coerente con la documentazione `GAME_COMPLETION_LED_LOGIC.md`

### Differenza con LED Puzzle Locali

I LED dei **puzzle INTERNI** alla stanza (materasso, poltrona, ventola) rimangono **indipendenti**:
- Gestiti da `bedroom_puzzle_service.py`
- Cambiano solo quando il puzzle specifico è risolto
- NON influenzano le altre stanze

Solo il **LED PORTA** usa il sistema globale.

---

## 🔗 File Correlati

- `backend/app/services/game_completion_service.py` - Servizio modificato
- `src/hooks/useGameCompletion.js` - Hook frontend (non modificato)
- `src/components/3D/PuzzleLED.jsx` - Rendering LED (non modificato)
- `GAME_COMPLETION_LED_LOGIC.md` - Documentazione sistema LED

---

**Data Fix**: 29 Dicembre 2024  
**Versione**: 1.0.0  
**Status**: ✅ RISOLTO

---

**Fine Documento** 🎊
