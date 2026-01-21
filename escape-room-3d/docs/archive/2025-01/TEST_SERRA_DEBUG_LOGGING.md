# 🌿 Test Serra con Debug Logging Aggressivo

**Data**: 30 Dicembre 2025
**Scopo**: Verificare esattamente dove si ferma il broadcast del WebSocket per il LED porta cucina

## 🔧 Modifiche Applicate

Ho aggiunto logging dettagliato in `backend/app/api/kitchen_puzzles.py` nel metodo `complete_serra()`:

```python
🌿 [API /serra/complete] START
🌿 [API /serra/complete] validate_serra_activated result
📡 [API /serra/complete] Broadcasting puzzle_state_update...
✅ [API /serra/complete] puzzle_state_update broadcasted
🔍 [API /serra/complete] Getting door LED states...
🔍 [API /serra/complete] LED states: {...}
🔍 [API /serra/complete] Completion state: ...
📡 [API /serra/complete] Broadcasting game_completion_update...
📡 [API /serra/complete] Completion data: {...}
🚀 [API /serra/complete] game_completion_update broadcasted successfully!
```

## 📋 Procedura Test

### 1. Reset Database
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose exec -T db psql -U postgres -d escape_room < reset-session-999-complete.sql
```

### 2. Monitora Log Filtrati (in un terminale separato)
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
./filter-logs.sh | grep -E "(serra|door|LED|game_completion)"
```

### 3. Esegui Test
1. Vai a: http://localhost:5173/room/cucina?sessionId=999&room=cucina&playerName=TestPlayer
2. Premi **K** per attivare test bypass (tutti LED rossi → verdi)
3. Clicca sul **pulsante serra** nella scena
4. **OSSERVA I LOG** nel terminale

### 4. Cosa Aspettarsi

**Se il broadcast funziona:**
```
🌿 [API /serra/complete] START for session 999
🌿 [API /serra/complete] validate_serra_activated result: True
📡 [API /serra/complete] Broadcasting puzzle_state_update...
✅ [API /serra/complete] puzzle_state_update broadcasted
🔍 [API /serra/complete] Getting door LED states...
🔍 [API /serra/complete] LED states: {'cucina': 'blinking', ...}
📡 [API /serra/complete] Broadcasting game_completion_update...
🚀 [API /serra/complete] game_completion_update broadcasted successfully!
```

**Frontend dovrebbe ricevere:**
```
[useGameCompletion] WebSocket update received: {...}
[PuzzleLED] 🎨 Current color: blinking
```

**E il LED porta dovrebbe:**
- ✅ Diventare GIALLO LAMPEGGIANTE (blinking)
- ✅ La porta dovrebbe aprirsi

### 5. Se il Broadcast NON Viene Eseguito

Se NON vedi `🚀 game_completion_update broadcasted successfully!`, significa che:
- Il codice sta lanciando un'eccezione silenziosa
- Il metodo `broadcast_game_completion_update()` ha un problema
- C'è un issue con il WebSocket handler

## 🔍 Analisi Attesa

Voglio vedere ESATTAMENTE:
1. ✅ Il backend riceve la richiesta `/serra/complete`
2. ✅ La validazione passa
3. ✅ `broadcast_puzzle_update` viene eseguito
4. ❓ `broadcast_game_completion_update` viene eseguito?
5. ❓ Il frontend riceve `game_completion_update`?

## 📊 Risultati Attesi

Se tutto funziona:
- Backend log: tutti i messaggi 🌿 presenti
- Frontend console: `[useGameCompletion] WebSocket update received`
- LED porta: da ROSSO → GIALLO LAMPEGGIANTE
- Porta: SI APRE

Se c'è il bug:
- Backend log: manca `🚀 game_completion_update broadcasted`
- Frontend console: NESSUN messaggio da useGameCompletion
- LED porta: resta ROSSO
- Porta: NON si apre

---

**Prossimo Passo**: Esegui il test e riporta i log completi.
