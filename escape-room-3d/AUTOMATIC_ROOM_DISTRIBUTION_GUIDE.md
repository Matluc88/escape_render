# 🏠 Sistema di Distribuzione Automatica Stanze - Guida Completa

## 📋 Panoramica

Dopo che il cancello si apre nella scena **Esterno**, il sistema avvia automaticamente un **timer di 25 secondi**. Al termine del countdown, i 4 giocatori vengono distribuiti **in modo random** alle 4 stanze (Cucina, Soggiorno, Bagno, Camera) - **1 giocatore per stanza**.

---

## ⏱️ Sequenza Temporale

### T = 0s: Cancello Aperto
- Il cancello si apre (via ESP32 MQTT o tasto K test)
- `cancelloApertoFinal` diventa `true`
- **Timer 25 secondi si avvia automaticamente**
- Console log: `"⏱️ Cancello aperto! Timer 25 secondi avviato..."`

### T = 15s: Countdown Visibile Inizia
- Compare un **grande numero al centro dello schermo**: **10**
- Colore: **Arancione** (#ffaa00)
- Animazione: **pulse** (pulsazione lenta)
- Testo sotto: **"⏳ Distribuzione imminente..."**

### T = 16s-22s: Countdown Continua
- Il numero decrementa ogni secondo: 9... 8... 7... 6... 5... 4...
- Mantiene colore arancione e animazione lenta

### T = 23s-25s: Countdown Finale - ROSSO!
- Numero diventa **ROSSO** (#ff4444) quando ≤ 3
- Animazione diventa **pulseFast** (pulsazione veloce e drammatica)
- Testo cambia: **"🔥 Preparati!"**
- Effetto visivo intensificato per creare tensione

### T = 25s: Distribuzione!
- Timer scaduto → Console log: `"⏰ 25 secondi trascorsi - Avvio distribuzione stanze!"`
- Controlli giocatore bloccati
- Emette evento WebSocket: `distributeRooms`
- Backend distribuisce giocatori random alle 4 stanze

### T = 26s-27s: Fade to Black
- Schermo inizia fade to black (2 secondi smooth)
- Ogni giocatore riceve messaggio con stanza assegnata
- Overlay mostra: **"Sei stato assegnato alla: 🍳 CUCINA"**

### T = 28s: Redirect
- Redirect automatico a `/play/${sessionId}/${assignedRoom}`
- Giocatore caricato nella sua stanza

---

## 🎨 UI Countdown

### Countdown 10-4 (Arancione)
```
┌─────────────────────────────┐
│                             │
│          10                 │  ← 120px, arancione, pulse
│   ⏳ Distribuzione          │
│     imminente...            │
└─────────────────────────────┘
```

### Countdown 3-1 (ROSSO)
```
┌─────────────────────────────┐
│                             │
│           3                 │  ← 120px, ROSSO, pulseFast
│     🔥 Preparati!           │
└─────────────────────────────┘
```

### Animazioni CSS
- **pulse**: Scale 1.0 → 1.1 (1s loop)
- **pulseFast**: Scale 1.0 → 1.2 (0.5s loop, opacity varia)

---

## 🔧 Implementazione Tecnica

### Frontend (EsternoScene.jsx)

#### Stati React
```javascript
const [countdownSeconds, setCountdownSeconds] = useState(null)
const countdownIntervalRef = useRef(null)
const [distributionTriggered, setDistributionTriggered] = useState(false)
```

#### Timer Principale (25s)
```javascript
useEffect(() => {
  if (!cancelloApertoFinal || distributionTriggered || !socket || !sessionId) return
  
  const distributionTimer = setTimeout(() => {
    setDistributionTriggered(true)
    setControlliBloccati(true)
    
    socket.emit('distributeRooms', {
      sessionId,
      triggeredBy: 'Sistema Automatico'
    })
  }, 25000)
  
  return () => clearTimeout(distributionTimer)
}, [cancelloApertoFinal, distributionTriggered, socket, sessionId])
```

#### Countdown Visibile (ultimi 10s)
```javascript
const countdownStartTimer = setTimeout(() => {
  let seconds = 10
  setCountdownSeconds(seconds)
  
  const interval = setInterval(() => {
    seconds--
    setCountdownSeconds(seconds)
    
    if (seconds <= 0) {
      clearInterval(interval)
      setCountdownSeconds(null)
    }
  }, 1000)
  
  countdownIntervalRef.current = interval
}, 15000) // Inizia dopo 15s
```

---

## 🎮 Backend - Distribuzione Giocatori

### Room Distribution Service
File: `backend/app/services/room_distribution_service.py`

```python
def distribute_players(self, session_id: int) -> Dict[str, List[str]]:
    # 1. Ottieni giocatori attivi
    players = self.player_service.get_players_by_session(session_id)
    active_players = [p for p in players if p.status == "playing"]
    
    # 2. Shuffle random
    random.shuffle(active_players)
    
    # 3. Assegna 1 per stanza (prime 4 posizioni)
    for i, room in enumerate(['cucina', 'soggiorno', 'bagno', 'camera']):
        if i < len(active_players):
            player = active_players[i]
            player.current_room = room
    
    # 4. Giocatori extra (se > 4) → distribuiti random
    if len(active_players) > 4:
        extra_players = active_players[4:]
        for player in extra_players:
            random_room = random.choice(self.available_rooms)
            player.current_room = random_room
    
    self.db.commit()
    return distribution
```

### WebSocket Handler
File: `backend/app/websocket/handler.py`

```python
@sio.event
async def distributeRooms(sid, data):
    session_id = data.get('sessionId')
    
    # Chiama servizio distribuzione
    service = RoomDistributionService(db)
    distribution = service.distribute_players(session_id)
    
    # Invia stanza assegnata a ogni giocatore
    for room, nicknames in distribution.items():
        for nickname in nicknames:
            player_sid = session_players.get(session_id, {}).get(nickname)
            if player_sid:
                await sio.emit('roomAssigned', {
                    'assignedRoom': room,
                    'nickname': nickname
                }, to=player_sid)
```

---

## 🧪 Testing

### Test con Tasto K (Bypass ESP32)
1. Premi **K** in scena Esterno
2. Dialog "Provare ad aprire?" → Clicca **SI**
3. Cancello si apre
4. Timer 25s parte automaticamente
5. Countdown 10-1 appare dopo 15s
6. Distribuzione automatica a 25s

### Test con ESP32 Fisico
1. Sblocca fotocellula fisica
2. Dialog "Provare ad aprire?" → Clicca **SI**
3. ESP32 apre cancello
4. Timer 25s parte automaticamente
5. Sistema procede normalmente

---

## 🛡️ Sicurezza & Edge Cases

### ✅ ESP32 Offline Durante Timer
- **Problema**: ESP32 si spegne dopo aver aperto il cancello
- **Soluzione**: Timer continua comunque!
- **Motivo**: `cancelloApertoDalDialog` (da dialog SI) rimane `true`
- **Risultato**: Distribuzione avviene regolarmente

### ✅ Meno di 4 Giocatori
- **Comportamento**: Distribuzione avviene comunque
- **Esempio**: 2 giocatori → 2 stanze occupate, 2 vuote
- **Opzione Scelta**: Flessibilità > Validazione rigida
- **Motivazione**: I ragazzi si divertono comunque

### ✅ Più di 4 Giocatori
- **Comportamento**: Primi 4 → 1 per stanza (garantito)
- **Extra**: Distribuiti random nelle 4 stanze
- **Esempio**: 6 giocatori → 2 stanze con 2 giocatori, 2 con 1

### ✅ Cleanup Automatico
```javascript
return () => {
  clearTimeout(distributionTimer)
  clearTimeout(countdownStartTimer)
  if (countdownIntervalRef.current) {
    clearInterval(countdownIntervalRef.current)
  }
}
```
Tutti i timer vengono puliti se il componente viene smontato.

---

## 📊 Console Logs (Debug)

```
[EsternoScene] ⏱️ Cancello aperto! Timer 25 secondi avviato...
[EsternoScene] 🔟 Countdown visibile iniziato (ultimi 10 secondi)
[EsternoScene] ⏰ 25 secondi trascorsi - Avvio distribuzione stanze!
[EsternoScene] 🏠 Stanza assegnata: {assignedRoom: "cucina", ...}
[EsternoScene] 📊 Distribuzione completata: {cucina: ["Player1"], ...}
[EsternoScene] 🚀 Redirect a cucina
```

---

## 🎯 Vantaggi del Sistema

✅ **Automatico**: Nessuna azione richiesta dai giocatori
✅ **Fair**: Distribuzione completamente random
✅ **Visibile**: Countdown drammatico crea suspense
✅ **Resiliente**: Funziona anche se ESP32 va offline
✅ **Flessibile**: Supporta qualsiasi numero di giocatori
✅ **Sincronizzato**: Tutti vedono lo stesso countdown

---

## 🔑 Variabili Chiave

| Variabile | Valore | Modificabile |
|-----------|--------|--------------|
| Timer distribuzione | 25000ms | Sì (line 600 circa) |
| Countdown start | 15000ms | Sì (line 612 circa) |
| Countdown duration | 10s | Deriva da (25s - 15s) |
| Soglia rosso | ≤ 3s | Sì (condizionale CSS) |
| Fade duration | 2s | Sì (interval 50ms) |

---

## 📝 Note Implementazione

### Perché Timer Parte da Cancello Aperto?
- Il cancello è il **punto chiave** della progressione
- Fotocellula → Cancello → Distribuzione (flow logico)
- Visivamente chiaro per i giocatori

### Perché 25 Secondi?
- Abbastanza tempo per guardare il cancello aprirsi
- Breve abbastanza da mantenere tensione
- Ultimi 10s visibili = tempo per prepararsi

### Perché Random?
- **Fairness**: Nessun giocatore avvantaggiato
- **Rigiocabilità**: Ogni partita è diversa
- **Semplicità**: No logiche complesse di assignment

---

## 🚀 Deployment

### Nessuna Modifica Backend Necessaria!
Il backend `room_distribution_service.py` era già completo. Le modifiche sono state **solo frontend**.

### File Modificati
- ✅ `src/components/scenes/EsternoScene.jsx`
- ✅ Questo file di documentazione

### File Unchanged (già funzionanti)
- ✅ `backend/app/services/room_distribution_service.py`
- ✅ `backend/app/websocket/handler.py`

---

## 📖 Riferimenti

- `ROOM_DISTRIBUTION_SYSTEM.md` - Documentazione backend distribuzione
- `ESP32_ESTERNO_MQTT_COMPLETE_GUIDE.md` - Guida ESP32 esterno
- `WEBSOCKET_EVENTS_VERIFICATION.md` - Eventi WebSocket

---

**Implementato**: 10 Gennaio 2026  
**Versione**: 1.0  
**Status**: ✅ PRODUCTION READY
