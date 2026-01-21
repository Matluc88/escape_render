# 🔍 Kitchen LED Debug Test

## Obiettivo
Trovare il bug che impedisce al LED della porta della cucina di lampeggiare dopo aver completato la serra.

## Setup Test

1. **Reset completo della sessione 999:**
   ```bash
   cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
   docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db -f /docker-entrypoint-initdb.d/reset-session-999-complete.sql
   ```

2. **Verifica log backend in tempo reale (FILTRATI):**
   
   **🆕 Metodo A: Script Interattivo (RACCOMANDATO)**
   ```bash
   cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
   ./filter-logs.sh
   ```
   Scegli opzione **[1] LED & Porta Cucina** per vedere solo i log rilevanti.
   
   **Metodo B: Comando Diretto**
   ```bash
   docker logs -f escape-backend-dev 2>&1 | grep -E "🔍|LED|door_led|blinking|porta|serra|cucina"
   ```
   
   **Metodo C: Tutti i log (troppo verbosi)**
   ```bash
   docker logs -f escape-backend-dev
   ```

3. **Apri l'applicazione:**
   - Vai a: http://localhost:5173/room/cucina?session=999
   - Apri la console del browser (F12)

## Test Procedure

### Step 1: Completa la Serra (TASTO 5)

1. Nella scena cucina, premi il tasto **5**
2. Osserva la luce della serra che si accende verde
3. Osserva il LED serra che diventa verde

### Step 2: Analizza i Log Backend

Nei log del backend dovresti vedere:

```
🔍 [get_door_led_states] Calculating for session 999
🔍 [get_door_led_states] game_won=False, rooms_status={...}
🔍 [get_door_led_states] cucina: room_completed=True
🔍 [get_door_led_states] cucina: LED = blinking
🔍 [get_door_led_states] camera: room_completed=False
🔍 [get_door_led_states] camera: LED = red
🔍 [get_door_led_states] bagno: room_completed=False
🔍 [get_door_led_states] bagno: LED = red
🔍 [get_door_led_states] soggiorno: room_completed=False
🔍 [get_door_led_states] soggiorno: LED = red
🔍 [get_door_led_states] Final LED states: {'cucina': 'blinking', 'camera': 'red', 'bagno': 'red', 'soggiorno': 'red'}

🚀 [API] Broadcasted game_completion_update for session 999
```

### Step 3: Analizza i Log Frontend

Nella console del browser dovresti vedere:

```
[useGameCompletion] WebSocket update received: {type: 'game_completion_update', ...}
[useGameCompletion] 🎨 getDoorLEDColor(cucina): "blinking" (from door_led_states)
```

**O invece ancora:**
```
[useGameCompletion] 🎨 getDoorLEDColor(cucina): "red" (from door_led_states)
```

## Cosa Cercare

### ✅ Se il Backend calcola correttamente "blinking":
- **Problema nel Frontend**: Il WebSocket non sta aggiornando lo stato correttamente
- **Fix**: Controllare `useGameCompletion.js` per vedere come processa l'update

### ❌ Se il Backend calcola "red":
- **Problema nel Backend**: Il calcolo di `_is_room_completed()` fallisce
- **Fix**: Controllare perché `serra.status` non è "done" nel database

## Risultati Attesi vs Reali

### Attesi:
1. Backend calcola: `cucina: LED = blinking`
2. WebSocket broadcast: `door_led_states: { cucina: 'blinking' }`
3. Frontend riceve e aggiorna: `getDoorLEDColor(cucina): "blinking"`
4. PuzzleLED inizia a lampeggiare

### Da Verificare:
- [ ] Backend calcola `room_completed=True` per cucina?
- [ ] Backend imposta LED a "blinking"?
- [ ] WebSocket broadcast viene fatto?
- [ ] Frontend riceve il messaggio WebSocket?
- [ ] Frontend aggiorna `door_led_states`?
- [ ] PuzzleLED legge il nuovo valore?

## 🔧 Comandi Filtraggio Log Rapidi

### Script Interattivo (Tutti i filtri disponibili)
```bash
./filter-logs.sh
```

### Comandi Diretti per Copy-Paste

**Debug Porta Cucina (raccomandato):**
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "🔍|LED|door_led|blinking|porta|PORTA"
```

**Puzzle Cucina Completo:**
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "🔥|🧊|🌿|🚪|fornelli|frigo|serra|porta|kitchen"
```

**Solo WebSocket Broadcast:**
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "📡|🚀|WebSocket|broadcast"
```

**Solo Errori:**
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "ERROR|❌|Exception|Traceback"
```

---

## 🗄️ Comandi Database Utili

### Verifica stato database:
```bash
docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db -c "SELECT session_id, puzzle_states FROM kitchen_puzzles WHERE session_id = 999;"
```

### Verifica game_completion:
```bash
docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db -c "SELECT session_id, rooms_status, game_won FROM game_completion WHERE session_id = 999;"
```

## Note
- **IMPORTANTE**: Il backend è stato modificato per aggiungere log di debug dettagliati
- Se vedi `cucina: room_completed=True` ma `LED = red`, c'è un bug nella logica
- Se vedi `cucina: room_completed=False`, il problema è nella query del database

---

**Dopo il test, copia i log qui sotto per l'analisi:**

```
# Incolla qui i log del backend

```

```
# Incolla qui i log della console browser

```
