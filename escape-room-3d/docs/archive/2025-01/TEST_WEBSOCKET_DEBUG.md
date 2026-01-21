# 🐛 TEST WEBSOCKET DEBUG

**Data**: 30 Dicembre 2025  
**Obiettivo**: Verificare se il WebSocket invia i dati corretti al frontend

---

## 📝 PROCEDURA TEST

### 1. Reset stato database
```bash
docker exec -i escape-db-dev psql -U escape_user -d escape_room_dev < reset-session-999-complete.sql
```

### 2. Accedi alla cucina
```
http://localhost:5173/room?sessionId=999&room=cucina
```

### 3. Completa la serra
- Premi **tasto 5** (bypass fornelli)
- Clicca sul **pulsante serra**

### 4. Verifica log nel browser console

Cerca questi log:
```
[useGameCompletion] 📡 WebSocket update received: <OGGETTO>
[useGameCompletion] 📡 door_led_states from WebSocket: <OGGETTO>
[useGameCompletion] 📡 cucina LED from WebSocket: <VALORE>
```

---

## 🎯 COSA CERCARE

### A) Se vedi:
```
[useGameCompletion] 📡 cucina LED from WebSocket: "blinking"
[useGameCompletion] ✅ Updating completionState with WebSocket data
```
✅ Il WebSocket invia i dati corretti → Problema nello state React

### B) Se vedi:
```
[useGameCompletion] 📡 cucina LED from WebSocket: "red"
```
❌ Il WebSocket NON invia i dati corretti → Problema backend o serializzazione

### C) Se vedi:
```
[useGameCompletion] ❌ Session ID mismatch: XXX !== 999
```
❌ Session ID errato → Problema di routing WebSocket

### D) Se NON vedi questi log:
❌ L'evento `game_completion_update` non viene ricevuto → Problema WebSocket connection

---

## 🔍 ANALISI ATTUALE

Dai log precedenti:
- ✅ Backend calcola correttamente: `'cucina': 'blinking'`
- ✅ Backend invia correttamente via WebSocket
- ✅ Frontend riceve l'evento `game_completion_update`
- ❌ Frontend continua a mostrare `"red"` in `getDoorLEDColor()`

**Ipotesi**: Il dato arriva correttamente ma lo state React non si aggiorna, oppure c'è uno stale state nella closure del callback `getDoorLEDColor`.

---

## 📊 PROSSIMI STEP

In base ai log:

1. **Se il WebSocket invia "blinking"**: Fix nello state management React
2. **Se il WebSocket invia "red"**: Fix nel backend (ma sembrava corretto dai log)
3. **Se l'evento non arriva**: Fix nella connessione WebSocket
