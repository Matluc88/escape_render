# 🏆 Game Completion System - Logica LED Lampeggiante

## 📋 Indice
1. [Overview del Sistema](#overview-del-sistema)
2. [Logica LED - Stati e Colori](#logica-led---stati-e-colori)
3. [Architettura Tecnica](#architettura-tecnica)
4. [File Coinvolti](#file-coinvolti)
5. [Flusso di Funzionamento](#flusso-di-funzionamento)
6. [Esempi di Codice](#esempi-di-codice)
7. [Come Testare](#come-testare)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview del Sistema

Il **Game Completion System** traccia il progresso dei giocatori attraverso le 4 stanze dell'escape room:
- 🍳 **Cucina**
- 🛏️ **Camera da Letto**
- 🚿 **Bagno**
- 🛋️ **Soggiorno**

### Obiettivo
Indicare visivamente tramite **LED colorati sulle porte** quante stanze sono state completate, fornendo feedback progressivo fino alla vittoria finale.

---

## 💡 Logica LED - Stati e Colori

### 🎨 Tre Stati Principali

| Stanze Completate | Colore LED | Comportamento | Significato |
|-------------------|------------|---------------|-------------|
| **0 / 4** | 🔴 **Rosso fisso** | Sempre acceso | Nessun progresso |
| **1-3 / 4** | 🟢⚡ **Verde lampeggiante** | Lampeggio 500ms | Progresso in corso! |
| **4 / 4** | 🟢 **Verde fisso** | Sempre acceso | VITTORIA! 🎊 |

### ⚡ Dettagli Tecnico: Lampeggio

```javascript
// Intervallo lampeggio: 500ms (0.5 secondi)
const BLINK_INTERVAL = 500;

// Ciclo: ON → OFF → ON → OFF...
// Durata visibile: 500ms
// Durata spento: 500ms
// Periodo totale: 1 secondo (1Hz)
```

**Implementazione CSS:**
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.led-blinking {
  animation: blink 1s infinite;
}
```

---

## 🏗️ Architettura Tecnica

### 📊 Diagramma Componenti

```
┌─────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  game_completion_states                            │ │
│  │  - session_id (FK)                                 │ │
│  │  - camera_completed (boolean)                      │ │
│  │  - cucina_completed (boolean)                      │ │
│  │  - bagno_completed (boolean)                       │ │
│  │  - soggiorno_completed (boolean)                   │ │
│  │  - completed_rooms_count (int)                     │ │
│  │  - game_won (boolean)                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI + Python)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  game_completion_service.py                        │ │
│  │  - calculate_door_led_state(completed_count)       │ │
│  │  - update_room_completion(session, room)           │ │
│  │  - get_completion_state(session_id)                │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  WebSocket Handler                                  │ │
│  │  - broadcast: "game_completion_update"             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND (React + Three.js)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  useGameCompletion.js (Hook)                       │ │
│  │  - Fetch stato iniziale da API                     │ │
│  │  - Subscribe WebSocket per aggiornamenti real-time │ │
│  │  - getDoorLEDColor(roomName) → "red"|"blinking"|   │ │
│  │                                  "green"            │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PuzzleLED.jsx (Component)                         │ │
│  │  - Rendering LED 3D in scena                       │ │
│  │  - Animazione lampeggio CSS                        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 File Coinvolti

### Backend

| File | Percorso | Ruolo |
|------|----------|-------|
| **Model** | `backend/app/models/game_completion.py` | Definisce tabella database |
| **Service** | `backend/app/services/game_completion_service.py` | Logica business calcolo LED |
| **Schema** | `backend/app/schemas/game_completion.py` | Validazione dati API |
| **API** | `backend/app/api/game_completion.py` | Endpoint REST per frontend |
| **WebSocket** | `backend/app/websocket/handler.py` | Broadcast aggiornamenti real-time |
| **Migration** | `backend/alembic/versions/008_add_game_completion.py` | Creazione tabella DB |

### Frontend

| File | Percorso | Ruolo |
|------|----------|-------|
| **Hook** | `src/hooks/useGameCompletion.js` | Gestione stato + WebSocket |
| **Component** | `src/components/3D/PuzzleLED.jsx` | Rendering LED fisico 3D |
| **Scene** | `src/components/scenes/KitchenScene.jsx` | Integrazione LED cucina |
| **Scene** | `src/components/scenes/BedroomScene.jsx` | Integrazione LED camera |

---

## 🔄 Flusso di Funzionamento

### 📝 Step-by-Step

```
1. GIOCATORE COMPLETA ENIGMA
   └─> Puzzle Service chiama completion service
       └─> bedroom_puzzle_service.py: complete_puzzle()
       
2. BACKEND: Aggiorna Database
   └─> game_completion_service.update_room_completion()
       ├─> SET camera_completed = TRUE
       ├─> CALCOLA completed_rooms_count (es: 2)
       └─> CALCOLA door_led_states per TUTTE le stanze
           └─> calculate_door_led_state(2) → "blinking"
       
3. BACKEND: Broadcast WebSocket
   └─> websocket_handler.broadcast('game_completion_update', {
         session_id: 1,
         door_led_states: {
           camera: "blinking",
           cucina: "blinking",
           bagno: "red",
           soggiorno: "red"
         },
         completed_rooms: 2,
         game_won: false
       })
       
4. FRONTEND: Riceve Update
   └─> useGameCompletion.js: socket.on('game_completion_update')
       └─> Aggiorna stato React
       
5. FRONTEND: Re-render LED
   └─> PuzzleLED.jsx riceve nuovo state="blinking"
       ├─> Rimuove classe CSS precedente
       ├─> Aggiunge classe "led-blinking"
       └─> CSS animation inizia lampeggio 500ms
       
6. GIOCATORE: Vede LED lampeggiare 🟢⚡
```

---

## 💻 Esempi di Codice

### 1. Backend: Calcolo Stato LED

```python
# backend/app/services/game_completion_service.py

def calculate_door_led_state(completed_rooms: int) -> str:
    """
    Calcola lo stato del LED porta basato sul numero di stanze completate.
    
    Args:
        completed_rooms: Numero di stanze completate (0-4)
        
    Returns:
        - "red": 0 stanze completate
        - "blinking": 1-3 stanze completate (lampeggio 500ms)
        - "green": 4 stanze completate (vittoria!)
    """
    if completed_rooms == 0:
        return "red"
    elif completed_rooms < 4:
        return "blinking"  # 🟢⚡ Lampeggio progressivo
    else:
        return "green"  # 🟢 Vittoria!


async def update_room_completion(
    db: Session, 
    session_id: int, 
    room_name: str
) -> GameCompletionResponse:
    """
    Aggiorna completion di una stanza e ricalcola stati LED globali.
    """
    # 1. Ottieni/crea record
    completion = await get_or_create_completion(db, session_id)
    
    # 2. Marca stanza come completata
    if room_name == "camera":
        completion.camera_completed = True
    elif room_name == "cucina":
        completion.cucina_completed = True
    # ... altre stanze ...
    
    # 3. Conta stanze completate
    completed = sum([
        completion.camera_completed,
        completion.cucina_completed,
        completion.bagno_completed,
        completion.soggiorno_completed
    ])
    completion.completed_rooms_count = completed
    completion.game_won = (completed == 4)
    
    # 4. Calcola stati LED per TUTTE le porte
    led_state = calculate_door_led_state(completed)
    
    db.commit()
    
    # 5. Costruisci risposta
    return GameCompletionResponse(
        session_id=session_id,
        door_led_states={
            "camera": led_state,
            "cucina": led_state,
            "bagno": led_state,
            "soggiorno": led_state
        },
        completed_rooms=completed,
        game_won=completion.game_won,
        # ... altri campi ...
    )
```

### 2. Frontend: Hook React

```javascript
// src/hooks/useGameCompletion.js

export function useGameCompletion(sessionId, socket = null) {
  const [completionState, setCompletionState] = useState(null);
  
  // Fetch iniziale dallo stato backend
  useEffect(() => {
    const fetchState = async () => {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/game-completion/state`
      );
      const data = await response.json();
      setCompletionState(data);
    };
    
    fetchState();
  }, [sessionId]);
  
  // WebSocket listener per aggiornamenti real-time
  useEffect(() => {
    if (!socket || !sessionId) return;
    
    const handleUpdate = (data) => {
      if (data.session_id === sessionId) {
        setCompletionState(data);  // ⚡ Aggiornamento istantaneo
      }
    };
    
    socket.on('game_completion_update', handleUpdate);
    
    return () => socket.off('game_completion_update', handleUpdate);
  }, [socket, sessionId]);
  
  // Helper per ottenere colore LED di una porta specifica
  const getDoorLEDColor = useCallback((roomName) => {
    if (!completionState) return 'red';
    return completionState.door_led_states[roomName] || 'red';
  }, [completionState]);
  
  return {
    completionState,
    getDoorLEDColor,
    gameWon: completionState?.game_won || false,
    completedRoomsCount: completionState?.completed_rooms || 0
  };
}
```

### 3. Frontend: Component LED

```javascript
// src/components/3D/PuzzleLED.jsx

export function PuzzleLED({ ledUuid, state = 'red' }) {
  // state può essere: 'red' | 'blinking' | 'green'
  
  // Mappa stato → colore Three.js
  const getColor = () => {
    switch (state) {
      case 'green':
      case 'blinking':
        return 0x00ff00;  // Verde
      case 'red':
      default:
        return 0xff0000;  // Rosso
    }
  };
  
  return (
    <mesh>
      {/* LED fisico 3D */}
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial
        color={getColor()}
        emissive={getColor()}
        emissiveIntensity={state === 'blinking' ? 2 : 1}
      />
      
      {/* Punto luce per illuminazione */}
      <pointLight
        color={getColor()}
        intensity={state === 'blinking' ? 3 : 1}
        distance={2}
      />
      
      {/* Animazione lampeggio CSS */}
      {state === 'blinking' && (
        <Html>
          <div className="led-blinking-overlay" />
        </Html>
      )}
    </mesh>
  );
}
```

**CSS per Lampeggio:**

```css
/* src/components/3D/PuzzleLED.css */

@keyframes blink {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(0.8);
  }
}

.led-blinking-overlay {
  animation: blink 1s ease-in-out infinite;
}
```

### 4. Integrazione in Scene

```javascript
// src/components/scenes/KitchenScene.jsx

export default function KitchenScene({ sessionId }) {
  const { socket } = useWebSocket(sessionId, 'cucina', 'Player');
  
  // 🏆 Hook Game Completion
  const gameCompletion = useGameCompletion(sessionId, socket);
  
  return (
    <Canvas>
      {/* ... altri elementi 3D ... */}
      
      {/* 🚪 LED Porta Cucina - USA STATO GLOBALE */}
      <PuzzleLED 
        ledUuid="PORTA_CUCINA_UUID"
        state={gameCompletion.getDoorLEDColor('cucina')}
      />
      
      {/* Altri LED per enigmi locali */}
      <PuzzleLED ledUuid="FORNELLI_UUID" state={localLedStates.fornelli} />
    </Canvas>
  );
}
```

---

## 🧪 Come Testare

### 1. Test Backend API

```bash
# Ottieni stato corrente
curl http://localhost:3000/sessions/1/game-completion/state | jq

# Risposta esempio (2 stanze completate):
{
  "session_id": 1,
  "door_led_states": {
    "camera": "blinking",     # 🟢⚡
    "cucina": "blinking",     # 🟢⚡
    "bagno": "red",           # 🔴
    "soggiorno": "red"        # 🔴
  },
  "completed_rooms": 2,
  "game_won": false
}
```

### 2. Test Browser Localhost

```bash
# 1. Avvia Docker
docker-compose up -d

# 2. Apri browser su:
http://localhost:5173/play/1/cucina?name=Tester

# 3. Completa enigma cucina (premi tasti 1→2→3→4→5)

# 4. Osserva LED porta:
#    - Prima: 🔴 Rosso fisso
#    - Dopo:  🟢⚡ Verde lampeggiante (500ms)
```

### 3. Test WebSocket Real-Time

**Terminal 1 - Monitora WebSocket:**
```javascript
// Apri Console Browser (F12) e incolla:

const socket = io('http://localhost:3000');

socket.emit('join_session', { 
  session_id: 1, 
  room: 'cucina', 
  player_name: 'Observer' 
});

socket.on('game_completion_update', (data) => {
  console.log('🔔 UPDATE RICEVUTO:', data);
  console.log('🚪 LED Stati:', data.door_led_states);
});
```

**Terminal 2 - Simula Completion:**
```bash
# Completa camera
curl -X POST http://localhost:3000/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "materasso"}'

# Osserva Terminal 1 → riceverà broadcast immediato!
```

### 4. Test Sequenza Completa

```bash
# Completa tutte e 4 le stanze in sequenza

# 1. Camera
curl -X POST http://localhost:3000/sessions/1/bedroom-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "materasso"}'

# Controlla: LED dovrebbero essere "blinking" (1/4)
curl http://localhost:3000/sessions/1/game-completion/state | jq '.door_led_states'

# 2. Cucina  
curl -X POST http://localhost:3000/sessions/1/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "serra"}'

# Controlla: ancora "blinking" (2/4)

# 3. Bagno (quando implementato)
# ...

# 4. Soggiorno (quando implementato)
# ...

# Controlla stato finale: LED dovrebbero essere "green" fisso (4/4)
curl http://localhost:3000/sessions/1/game-completion/state | jq
# Verifica: "game_won": true
```

---

## 🐛 Troubleshooting

### Problema: LED non lampeggia

**Sintomi:**
- LED rimane verde fisso invece di lampeggiare
- Solo 1-3 stanze completate

**Causa Possibile:**
Scene sta usando LED locale invece del globale

**Soluzione:**
```javascript
// ❌ SBAGLIATO - LED locale puzzle
<PuzzleLED state={ledStates.porta} />

// ✅ CORRETTO - LED globale game completion
const gameCompletion = useGameCompletion(sessionId, socket);
<PuzzleLED state={gameCompletion.getDoorLEDColor('cucina')} />
```

### Problema: LED diversi tra stanze

**Sintomi:**
- Cucina: LED verde fisso
- Camera: LED verde lampeggiante
- Stesso numero di stanze completate

**Causa:**
Una scena non sta usando `useGameCompletion`

**Verifica:**
```bash
# Controlla backend (fonte di verità)
curl http://localhost:3000/sessions/1/game-completion/state | jq '.door_led_states'

# Tutti LED dovrebbero avere stesso stato!
```

**Fix:**
Assicurati che TUTTE le scene usino:
```javascript
const gameCompletion = useGameCompletion(sessionId, socket);
<PuzzleLED state={gameCompletion.getDoorLEDColor('ROOM_NAME')} />
```

### Problema: LED non si aggiorna in real-time

**Sintomi:**
- LED cambia solo dopo reload pagina
- WebSocket sembra non funzionare

**Causa:**
Hook non riceve socket o sessionId

**Debug:**
```javascript
// Aggiungi log in useGameCompletion.js
useEffect(() => {
  console.log('[useGameCompletion] Socket:', socket);
  console.log('[useGameCompletion] SessionId:', sessionId);
  
  if (!socket || !sessionId) {
    console.warn('⚠️ Socket o SessionId mancante!');
    return;
  }
  
  // ... resto del codice
}, [socket, sessionId]);
```

**Soluzione:**
Assicurati di passare sia `socket` che `sessionId`:
```javascript
const { socket } = useWebSocket(sessionId, 'cucina', 'Player');
const gameCompletion = useGameCompletion(sessionId, socket);
```

### Problema: Lampeggio troppo veloce/lento

**Sintomi:**
- LED lampeggia troppo velocemente
- O troppo lentamente

**Fix CSS:**
```css
/* Attuale: 1 secondo (500ms ON / 500ms OFF) */
.led-blinking {
  animation: blink 1s infinite;
}

/* Più lento (2 secondi): */
.led-blinking {
  animation: blink 2s infinite;
}

/* Più veloce (0.5 secondi): */
.led-blinking {
  animation: blink 0.5s infinite;
}
```

### Problema: LED rosso anche con stanze completate

**Sintomi:**
- Backend mostra stanze completate
- Frontend LED rimane rosso

**Causa:**
Frontend cache vecchia o fetch fallito

**Soluzione:**
1. **Clear cache browser**: Ctrl+Shift+R
2. **Verifica console**: Cerca errori fetch
3. **Force refresh hook**:
```javascript
const { refresh } = useGameCompletion(sessionId, socket);

// Chiama manualmente se necessario
useEffect(() => {
  refresh();
}, [someEvent]);
```

---

## 📊 Riepilogo Stati LED

### Tabella Decisione Backend

| Completed Rooms | Codice Backend | LED Result | Visual |
|-----------------|----------------|------------|--------|
| 0 | `return "red"` | Rosso fisso | 🔴 |
| 1 | `return "blinking"` | Verde lampeggiante | 🟢⚡ |
| 2 | `return "blinking"` | Verde lampeggiante | 🟢⚡ |
| 3 | `return "blinking"` | Verde lampeggiante | 🟢⚡ |
| 4 | `return "green"` | Verde fisso + Victory! | 🟢🎊 |

### Flow Chart Decisione

```
START → Ottieni completed_rooms_count
  │
  ├─ completed_rooms == 0?
  │    └─ YES → return "red" 🔴
  │    └─ NO  → Continue
  │
  ├─ completed_rooms < 4?
  │    └─ YES → return "blinking" 🟢⚡
  │    └─ NO  → Continue
  │
  └─ completed_rooms == 4
       └─ return "green" 🟢
       └─ SET game_won = TRUE 🎊
```

---

## 🎯 Conclusione

Il sistema di lampeggio LED fornisce **feedback visivo progressivo** ai giocatori:

1. 🔴 **Rosso** = "Inizia a risolvere enigmi!"
2. 🟢⚡ **Lampeggio** = "Bravo! Continua così!"
3. 🟢 **Verde fisso** = "VITTORIA! Hai completato tutto!"

**Tutti i LED cambiano sincronizzati** perché il backend calcola lo stato globale basato sul conteggio totale, non sullo stato individuale di ogni stanza.

---

## 📝 Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 29/12/2024 | 1.0.0 | Creazione documento iniziale |

---

## 🔗 Link Correlati

- [GAME_COMPLETION_SYSTEM_GUIDE.md](./GAME_COMPLETION_SYSTEM_GUIDE.md) - Guida sistema completo
- [KITCHEN_PUZZLE_INTEGRATION.md](./KITCHEN_PUZZLE_INTEGRATION.md) - Integrazione puzzle cucina
- [BEDROOM_PUZZLE_INTEGRATION_GUIDE.md](./BEDROOM_PUZZLE_INTEGRATION_GUIDE.md) - Integrazione puzzle camera

---

**Fine Documento** 🎊
