# 🔍 Log Filter System - Guida Completa

## Problema Risolto

I log del backend Docker erano **troppo verbosi** e difficili da leggere durante il debug. Questo sistema fornisce filtri intelligenti per vedere solo ciò che ti interessa.

## 📋 Utilizzo Rapido

### Metodo 1: Script Interattivo (RACCOMANDATO)

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
./filter-logs.sh
```

Lo script ti presenterà un menu:

```
╔════════════════════════════════════════╗
║   🔍 Backend Docker Log Filter         ║
╚════════════════════════════════════════╝

Seleziona il tipo di filtraggio:

  [1] 🚪 LED & Porta Cucina (debug porta lampeggiante)
  [2] 🌿 Puzzle Cucina Completo (fornelli, frigo, serra, porta)
  [3] 🎮 Game Completion (vittoria, stato stanze)
  [4] 📡 WebSocket & Broadcast
  [5] ❌ Solo Errori
  [6] 🔥 Eventi Critici (✅ ❌ 🚀 🏆)
  [7] 📋 Tutto (nessun filtro)
  [0] ❌ Esci

Scegli [0-7]:
```

### Metodo 2: Comandi Diretti

Se preferisci usare comandi singoli senza menu:

#### Debug Porta Cucina
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "🔍|LED|door_led|blinking|porta|PORTA"
```
**Quando usarlo:** Debuggare il problema del LED della porta che non lampeggia

#### Puzzle Cucina Completo
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "🔥|🧊|🌿|🚪|fornelli|frigo|serra|porta|kitchen"
```
**Quando usarlo:** Vedere tutti gli eventi dei puzzle della cucina

#### Game Completion
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "🏆|game_completion|GameCompletion|victory|rooms_status|game_won"
```
**Quando usarlo:** Verificare la logica di vittoria e completamento stanze

#### WebSocket & Broadcast
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "📡|🚀|WebSocket|broadcast|socket"
```
**Quando usarlo:** Debuggare problemi di comunicazione real-time

#### Solo Errori
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "ERROR|Error|error|❌|Exception|Traceback"
```
**Quando usarlo:** Trovare rapidamente errori e exception

#### Eventi Critici
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "✅|❌|🚀|🏆|🔥|ERROR"
```
**Quando usarlo:** Avere una visione d'insieme degli eventi importanti

## 🎯 Esempi d'Uso

### Scenario 1: Debug Porta Cucina Non Lampeggia

1. Avvia il filtro LED:
   ```bash
   ./filter-logs.sh
   # Scegli [1] LED & Porta Cucina
   ```

2. In un altro terminale, apri l'applicazione:
   ```
   http://localhost:5173/room/cucina?session=999
   ```

3. Premi **tasto 5** per completare la serra

4. Nei log filtrati dovresti vedere:
   ```
   🔍 [get_door_led_states] cucina: room_completed=True
   🔍 [get_door_led_states] cucina: LED = blinking
   🚀 [API] Broadcasted game_completion_update
   ```

5. Se vedi `LED = red` invece di `blinking`, hai trovato il bug!

### Scenario 2: Verificare WebSocket Funziona

1. Avvia il filtro WebSocket:
   ```bash
   docker logs -f escape-backend-dev 2>&1 | grep -E "📡|🚀|WebSocket|broadcast"
   ```

2. Completa un puzzle qualsiasi

3. Dovresti vedere il messaggio broadcast:
   ```
   🚀 [API] Broadcasted puzzle_state_update for session 999
   ```

4. Se non vedi broadcast, il WebSocket non sta inviando update

### Scenario 3: Trovare Errori Rapidamente

```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "ERROR|❌|Exception"
```

Vedi immediatamente se ci sono errori durante le operazioni.

## 🛠️ Personalizzazione

Puoi creare i tuoi filtri personalizzati modificando il pattern grep:

```bash
# Esempio: solo log di spawn
docker logs -f escape-backend-dev 2>&1 | grep -E "spawn|Spawn|SPAWN"

# Esempio: solo database queries
docker logs -f escape-backend-dev 2>&1 | grep -E "SELECT|INSERT|UPDATE|DELETE"

# Esempio: solo API calls
docker logs -f escape-backend-dev 2>&1 | grep -E "GET|POST|PUT|DELETE|/api/"
```

## 🔧 Troubleshooting

### Container non trovato
```
❌ Container escape-backend-dev non trovato!
```
**Soluzione:** Avvia Docker con `./docker.sh dev`

### Container non in esecuzione
```
❌ Container escape-backend-dev non è in esecuzione!
```
**Soluzione:** Verifica con `docker ps` e riavvia se necessario

### Nessun log appare
Se il filtro è troppo restrittivo, usa opzione **[7] Tutto** per vedere tutti i log.

### Log ancora troppi
Combina più filtri con `|`:
```bash
docker logs -f escape-backend-dev 2>&1 | grep -E "LED|door" | grep -v "INFO"
```
(esclude righe con "INFO")

## 📚 Riferimenti

- **KITCHEN_LED_DEBUG_TEST.md** - Guida completa al debug del LED porta cucina
- **docker.sh** - Script per gestire l'ambiente Docker
- **backend/app/services/game_completion_service.py** - Logica calcolo LED

## 🎨 Emoji Legend

- 🔍 - Log di debug dettagliati
- ✅ - Operazione riuscita
- ❌ - Errore
- 🚀 - WebSocket broadcast
- 🏆 - Vittoria/completamento
- 🔥 - Fornelli
- 🧊 - Frigo
- 🌿 - Serra
- 🚪 - Porta
- 📡 - WebSocket

---

**Tip:** Tieni sempre due terminali aperti:
1. Log filtrati (per vedere solo eventi rilevanti)
2. Browser DevTools (per vedere log frontend)

Questo ti dà visibilità completa su backend e frontend contemporaneamente!
