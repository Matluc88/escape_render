# 🔧 TROUBLESHOOTING LED PORTA SOGGIORNO

## 📊 Problema Identificato

Il LED della porta **NON lampeggia** dopo aver completato il puzzle del condizionatore, anche se tutti gli altri LED funzionano correttamente.

---

## ✅ Cosa Funziona

1. **LED pianta** → Rosso dopo Tasto M ✓
2. **LED pianta** → Verde dopo Tasto G ✓
3. **LED condizionatore** → Rosso dopo Tasto G ✓
4. **LED condizionatore** → Verde dopo click porta + SI ✓
5. **API backend** → Chiamata con successo ✓

---

## ❌ Cosa NON Funziona

**LED porta** → NON lampeggia dopo completamento condizionatore

---

## 🔍 Diagnostica

### Step 1: Verifica Log Backend

Quando premi **SI** nel dialog (o **Tasto I**), controlla i **log del backend** (terminale dove gira Docker o il server FastAPI).

**Dovresti vedere:**

```
[LivingRoomPuzzle] ✅ Condizionatore completed! Session 999: ALL PUZZLES DONE! 🎉
[LivingRoomPuzzle] 🏆 Notifying game_completion: soggiorno completed!
[GameCompletion] 🏆 Room soggiorno completed for session 999
[GameCompletion] 📊 Current state: 1/4 rooms completed
[GameCompletion] 📡 Broadcasting game_completion_update to session 999...
[WebSocket] 📡 Broadcast sent to 1 clients
```

### Step 2: Cosa Fare Se NON Vedi Questi Log

#### Caso A: Vedi solo fino a "Condizionatore completed"
```
[LivingRoomPuzzle] ✅ Condizionatore completed!
❌ [LivingRoomPuzzle] ❌ Error notifying game_completion: <errore>
```

**Problema:** Il service `GameCompletionService` non è importato o c'è un errore Python.

**Soluzione:**
```bash
# Riavvia il backend
cd escape-room-3d/backend
docker-compose restart backend
```

#### Caso B: Vedi "Notifying game_completion" ma NON vedi "Broadcasting"

**Problema:** Il broadcast WebSocket fallisce silenziosamente.

**Soluzione:** Verifica che il WebSocket sia connesso nel frontend. Nei log del browser dovresti vedere:
```
WebSocket: Connected with ID <qualche-id>
```

#### Caso C: Non Vedi NESSUN Log Backend

**Problema:** Il backend non sta girando o non riceve la richiesta.

**Soluzione:**
```bash
# Verifica che il backend sia attivo
curl http://localhost:8001/api/health

# Se non risponde, riavvia
cd escape-room-3d
./start-dev.sh
```

---

## 🧪 Test Manuale

### Test 1: Verifica Stato Game Completion

Apri in un'altra tab del browser:
```
http://localhost:8001/api/sessions/999/game-completion/state
```

**Dopo** aver completato il condizionatore, dovresti vedere:
```json
{
  "session_id": 999,
  "rooms_status": {
    "soggiorno": {
      "completed": true,  // ← Deve essere TRUE
      "completion_time": "2026-01-04T..."
    }
  },
  "door_led_states": {
    "soggiorno": "blinking"  // ← Deve essere "blinking"
  }
}
```

Se `"completed": false` → **Il backend NON ha salvato il completamento**

Se `"completed": true` ma LED non lampeggia → **Problema WebSocket broadcast**

### Test 2: Force Refresh Frontend

Dopo aver completato il puzzle, prova:
1. Premi **F5** per ricaricare la pagina
2. Guarda il LED porta al ricaricamento

Se **DOPO il reload** il LED lampeggia → **Problema:** Il broadcast WebSocket non funziona
Se **ANCHE dopo reload** NON lampeggia → **Problema:** Il backend non ha salvato lo stato

---

## 🔧 Fix Rapidi

### Fix 1: Forzare Broadcast Manuale

Se il broadcast automatico fallisce, aggiungi questo nel service:

```python
# backend/app/services/livingroom_puzzle_service.py
# Dopo la chiamata a update_room_completion

# FORCE BROADCAST (fallback)
from app.websocket.handler import broadcast_to_session
await broadcast_to_session(
    session_id=session_id,
    event="game_completion_update",
    data={
        "session_id": session_id,
        "door_led_states": {
            "soggiorno": "blinking"
        }
    }
)
```

### Fix 2: Polling al Posto di WebSocket

Se il WebSocket è problematico, aggiungi polling nel frontend:

```javascript
// src/hooks/useGameCompletion.js
useEffect(() => {
  // Polling ogni 2 secondi se c'è stata un'API call recente
  const interval = setInterval(() => {
    fetchCompletionState();
  }, 2000);
  
  return () => clearInterval(interval);
}, []);
```

---

## 📝 Checklist Completa

- [ ] Backend in esecuzione (porta 8001)?
- [ ] WebSocket connesso nel browser?
- [ ] Log backend mostrano "Notifying game_completion"?
- [ ] Log backend mostrano "Broadcasting"?
- [ ] API `/game-completion/state` mostra `completed: true`?
- [ ] API `/game-completion/state` mostra `door_led_states.soggiorno: "blinking"`?
- [ ] Dopo reload pagina, LED lampeggia?

---

## 💡 Note Importanti

1. **Chrome Extension Error** (kwift) → **Ignora**, non è correlato
2. Il sistema LED è **identico** a camera e cucina → Se funziona lì, dovrebbe funzionare anche qui
3. Il problema è probabilmente nel **broadcast WebSocket** del backend
4. Il frontend è **100% corretto** e non serve modificarlo

---

## 🆘 Se Tutto Fallisce

Premi **Tasto R** per resettare i puzzle e riprova dall'inizio. Se il problema persiste, invia i log completi del backend (non del frontend) durante il completamento del condizionatore.
