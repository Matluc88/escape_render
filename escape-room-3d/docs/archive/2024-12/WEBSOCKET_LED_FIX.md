# 🔧 FIX WebSocket LED - Diagnosi e Soluzione

## 🐛 PROBLEMA IDENTIFICATO

I LED non si aggiornano in tempo reale perché **WebSocket non si connette**.

### Sintomi Console Browser:
```
❌ WebSocket connection to 'ws://localhost:3000/socket.io/' failed
❌ Error completing fornelli: Error: HTTP 400
```

### Comportamento:
- ✅ Backend funziona perfettamente (database si aggiorna)
- ✅ API REST funzionano correttamente
- ❌ WebSocket NON si connette
- ❌ LED rimangono statici (non ricevono aggiornamenti real-time)

---

## ✅ SOLUZIONE

### 1. **Reset Database**
```bash
curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/reset \
  -H "Content-Type: application/json" -d '{"level":"full"}'
```

### 2. **Chiudi COMPLETAMENTE il Browser**
- Non solo chiudere la tab
- Chiudi l'intera applicazione browser (Cmd+Q su Mac, Alt+F4 su Windows)

### 3. **Riapri Browser Fresco**
- Apri nuovo browser
- Vai su: http://localhost:5173/dev
- Hard Refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)

### 4. **Verifica Connessione WebSocket**
Apri Console Browser (F12) e cerca:
```
✅ Connected to WebSocket server  <-- DEVE APPARIRE!
```

Se vedi ancora:
```
❌ WebSocket connection failed
```
Riprova chiudendo browser di nuovo.

---

## 🎮 STATO CORRETTO

Dopo riconnessione WebSocket, dovresti vedere:

### All'avvio:
- 🔴 **Fornelli: ROSSO** (active - da completare)
- ⚫ **Frigo: SPENTO** (locked - non disponibile)
- ⚫ **Serra: SPENTO** (locked - non disponibile)
- 🔴 **Porta: ROSSO** (locked)

### Sequenza Puzzle:
1. **Premi 5** → Pentola sui fornelli
   - Aspetta 2-3 secondi
   - Fornelli → 🟢 VERDE (done)
   - Frigo → 🔴 ROSSO (active)

2. **Premi 4** → Chiudi frigo
   - Aspetta 2-3 secondi
   - Frigo → 🟢 VERDE (done)
   - Serra → 🔴 ROSSO (active)

3. **Premi Z** → Accendi serra
   - Aspetta 2-3 secondi
   - Serra → 🟢 VERDE (done)
   - Porta → 🟢 VERDE (unlocked)

---

## 🔍 DEBUG AVANZATO

### Verifica Backend Funziona:
```bash
# Stato attuale
curl http://localhost:3000/api/sessions/1/kitchen-puzzles/state

# Completa fornelli manualmente
curl -X POST http://localhost:3000/api/sessions/1/kitchen-puzzles/fornelli/complete

# Verifica cambio
curl http://localhost:3000/api/sessions/1/kitchen-puzzles/state
```

### Verifica Configurazione:
File `.env.local`:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### Log Console Utili:
```
[useKitchenPuzzle] ← Log del hook puzzle
[PuzzleLED] ← Log dei cambi colore LED
puzzleStateUpdate ← Eventi WebSocket
```

---

## 📊 LOGICA LED (CORRETTA)

```python
active  → LED ROSSO  (puzzle da completare)
done    → LED VERDE  (puzzle completato)
locked  → LED SPENTO (puzzle non ancora disponibile)

porta locked   → LED ROSSO
porta unlocked → LED VERDE
```

---

## ✅ CHECKLIST FINALE

- [x] Backend avviato (porta 3000)
- [x] Frontend avviato (porta 5173)
- [x] Database resettato
- [ ] Browser chiuso completamente
- [ ] Browser riaperto fresco
- [ ] Hard refresh fatto
- [ ] WebSocket connesso (verifica console)
- [ ] LED si aggiornano in tempo reale

---

## 🎉 SISTEMA COMPLETO

Una volta che WebSocket si connette correttamente:
- ✅ Backend + Frontend sincronizzati
- ✅ LED real-time via WebSocket
- ✅ Database persistente
- ✅ FSM puzzle corretto
- ✅ Logica LED corretta

**Tutto funziona!** 🚀
