# 🎯 GUIDA TEST LED SISTEMA COMPLETO SU RENDER

## 📋 Obiettivo del Test

Verificare che il sistema LED funzioni correttamente in produzione:
1. LED rossi quando stanza NON completata
2. LED lampeggianti verdi quando stanza completata (ma gioco non vinto)
3. **LED VERDI FISSI quando TUTTE le 4 stanze sono completate (vittoria!)**

---

## 🗄️ STEP 1: Applicare Script SQL al Database Render

### Connetti al Database Produzione

1. **Ottieni DATABASE_URL da Render Dashboard:**
   - Vai a https://dashboard.render.com
   - Seleziona il servizio PostgreSQL
   - Clicca su "Connect" → Copia **External Database URL**

2. **Applica lo script SQL:**

```bash
# Connetti al database
psql <DATABASE_URL_DA_RENDER>

# Oppure carica il file
psql <DATABASE_URL_DA_RENDER> < create-test-sessions-render.sql
```

### Verifica Creazione Sessioni

```sql
SELECT id, pin, status FROM game_sessions 
WHERE id >= 1000 AND id <= 1004 
ORDER BY id;
```

Dovresti vedere:
```
  id  | pin  | status
------+------+--------
 1000 | 1000 | active
 1001 | 1001 | active
 1002 | 1002 | active
 1003 | 1003 | active
 1004 | 1004 | active
```

---

## 🔗 STEP 2: Link Diretti per Test (Sessioni Individuali)

### 📦 SESSIONE 1000 - Test CUCINA

**Completa solo la cucina e verifica LED:**

1. **Cucina** (qui completi i puzzle):  
   https://escape-room-3d.onrender.com/play/1000/cucina?name=Tester

2. **Camera** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1000/camera?name=Tester

3. **Bagno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1000/bagno?name=Tester

4. **Soggiorno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1000/soggiorno?name=Tester

**Atteso dopo completamento cucina:**
- 🟢⚡ LED porta CUCINA → **LAMPEGGIANTE** (verde blinking)
- 🔴 LED porta CAMERA → **ROSSO**
- 🔴 LED porta BAGNO → **ROSSO**
- 🔴 LED porta SOGGIORNO → **ROSSO**

---

### 🛏️ SESSIONE 1001 - Test CAMERA

**Completa solo la camera e verifica LED:**

1. **Camera** (qui completi i puzzle):  
   https://escape-room-3d.onrender.com/play/1001/camera?name=Tester

2. **Cucina** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1001/cucina?name=Tester

3. **Bagno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1001/bagno?name=Tester

4. **Soggiorno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1001/soggiorno?name=Tester

**Atteso dopo completamento camera:**
- 🔴 LED porta CUCINA → **ROSSO**
- 🟢⚡ LED porta CAMERA → **LAMPEGGIANTE**
- 🔴 LED porta BAGNO → **ROSSO**
- 🔴 LED porta SOGGIORNO → **ROSSO**

---

### 🚿 SESSIONE 1002 - Test BAGNO

**Completa solo il bagno e verifica LED:**

1. **Bagno** (qui completi i puzzle):  
   https://escape-room-3d.onrender.com/play/1002/bagno?name=Tester

2. **Cucina** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1002/cucina?name=Tester

3. **Camera** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1002/camera?name=Tester

4. **Soggiorno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1002/soggiorno?name=Tester

**Atteso dopo completamento bagno:**
- 🔴 LED porta CUCINA → **ROSSO**
- 🔴 LED porta CAMERA → **ROSSO**
- 🟢⚡ LED porta BAGNO → **LAMPEGGIANTE**
- 🔴 LED porta SOGGIORNO → **ROSSO**

---

### 🛋️ SESSIONE 1003 - Test SOGGIORNO

**Completa solo il soggiorno e verifica LED:**

1. **Soggiorno** (qui completi i puzzle):  
   https://escape-room-3d.onrender.com/play/1003/soggiorno?name=Tester

2. **Cucina** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1003/cucina?name=Tester

3. **Camera** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1003/camera?name=Tester

4. **Bagno** (per vedere LED porta):  
   https://escape-room-3d.onrender.com/play/1003/bagno?name=Tester

**Atteso dopo completamento soggiorno:**
- 🔴 LED porta CUCINA → **ROSSO**
- 🔴 LED porta CAMERA → **ROSSO**
- 🔴 LED porta BAGNO → **ROSSO**
- 🟢⚡ LED porta SOGGIORNO → **LAMPEGGIANTE**

---

## 🏆 STEP 3: Test COMPLETO - TUTTE LE STANZE (Sessione 1004)

**Questo è il test finale: completa TUTTE le 4 stanze una per una!**

### 🔥 SEQUENZA TEST VITTORIA

#### 1️⃣ Inizia dalla CUCINA:
https://escape-room-3d.onrender.com/play/1004/cucina?name=Tester

**Completa i puzzle:**
- Tasto `1` → Fornello 1 (LED frigo verde)
- Tasto `2` → Fornello 2 (LED serra verde)
- Tasto `3` → Fornello 3 (LED porta verde)
- Tasto `4` → Fornello 4
- Tasto `5` → Fornello 5 (tutti i fornelli accesi)
- Attendi 3 secondi → **Cucina completata!**

**Verifica:** LED porta cucina → 🟢⚡ **LAMPEGGIANTE**

---

#### 2️⃣ Vai in CAMERA:
https://escape-room-3d.onrender.com/play/1004/camera?name=Tester

**Completa i puzzle:**
- Clicca sul **Comodino** (LED comodino verde)
- Clicca sul **Materasso** (LED materasso verde)
- Clicca sulla **Poltrona** (LED poltrona verde)
- Clicca sulla **Griglia Ventola** (LED ventola verde)
- Attendi 3 secondi → **Camera completata!**

**Verifica:** 
- LED porta cucina → 🟢⚡ **LAMPEGGIANTE**
- LED porta camera → 🟢⚡ **LAMPEGGIANTE**

---

#### 3️⃣ Vai in BAGNO:
https://escape-room-3d.onrender.com/play/1004/bagno?name=Tester

**Completa i puzzle:**
- Clicca sullo **Specchio** (LED specchio verde)
- Clicca sulla **Porta Doccia** (LED doccia verde)
- Clicca sulla **Griglia Ventola Bagno** (LED ventola verde)
- Attendi 3 secondi → **Bagno completato!**

**Verifica:**
- LED porta cucina → 🟢⚡ **LAMPEGGIANTE**
- LED porta camera → 🟢⚡ **LAMPEGGIANTE**
- LED porta bagno → 🟢⚡ **LAMPEGGIANTE**

---

#### 4️⃣ Vai in SOGGIORNO (ULTIMA STANZA):
https://escape-room-3d.onrender.com/play/1004/soggiorno?name=Tester

**Completa i puzzle:**
- Clicca sulla **TV** (LED TV verde)
- Clicca sulla **Pianta** (LED pianta verde)
- Clicca sul **Condizionatore** (LED condizionatore verde)
- Attendi 3 secondi → **Soggiorno completato!**

### 🎊 MOMENTO MAGICO - VERIFICA VITTORIA! 

**Dopo aver completato il SOGGIORNO (ultima stanza):**

1. **Guarda il LED porta soggiorno** → Dovrebbe diventare 🟢 **VERDE FISSO** immediatamente
2. **Vai nelle altre stanze e verifica:**

```
https://escape-room-3d.onrender.com/play/1004/cucina?name=Tester
→ LED porta cucina: 🟢 VERDE FISSO

https://escape-room-3d.onrender.com/play/1004/camera?name=Tester
→ LED porta camera: 🟢 VERDE FISSO

https://escape-room-3d.onrender.com/play/1004/bagno?name=Tester
→ LED porta bagno: 🟢 VERDE FISSO

https://escape-room-3d.onrender.com/play/1004/soggiorno?name=Tester
→ LED porta soggiorno: 🟢 VERDE FISSO
```

**✅ SE TUTTI I LED SONO VERDI FISSI = SISTEMA FUNZIONA PERFETTAMENTE!**

---

## 🔍 Debug Console Browser

Apri DevTools (F12) → Console per vedere log utili:

```javascript
// Log utili da cercare:
[useGameCompletion] ✅ door_led_states received
[useGameCompletion] 🎊 ALL ROOMS COMPLETED! game_won=true
🎨 WebSocket: Received game_completion_update

// Verifica stato LED
door_led_states: {
  cucina: "solid",    // ← Verde fisso = Vittoria!
  camera: "solid",
  bagno: "solid",
  soggiorno: "solid"
}
```

---

## 📊 Verifica Database Render (Opzionale)

Dopo aver completato tutto, verifica che il database sia aggiornato:

```sql
SELECT session_id, game_won, victory_time, rooms_status
FROM game_completion_states
WHERE session_id = 1004;
```

**Atteso:**
```
session_id: 1004
game_won: true  ← Deve essere TRUE!
victory_time: [timestamp]
rooms_status: {
  "cucina": {"completed": true, "completion_time": "..."},
  "camera": {"completed": true, "completion_time": "..."},
  "bagno": {"completed": true, "completion_time": "..."},
  "soggiorno": {"completed": true, "completion_time": "..."}
}
```

---

## 🐛 Troubleshooting

### Problema: LED non cambiano colore

**Soluzione:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Verifica console → Cerca errori WebSocket
3. Verifica Render backend logs

### Problema: "Session not found"

**Soluzione:**
1. Verifica che lo script SQL sia stato applicato
2. Controlla che il deploy Render sia completato
3. Verifica migrations database

### Problema: LED restano lampeggianti dopo completamento totale

**Causa:** Database non ha `game_won = true`

**Fix:**
```sql
UPDATE game_completion_states
SET game_won = true, victory_time = NOW()
WHERE session_id = 1004
AND (rooms_status->'cucina'->>'completed')::boolean = true
AND (rooms_status->'camera'->>'completed')::boolean = true
AND (rooms_status->'bagno'->>'completed')::boolean = true
AND (rooms_status->'soggiorno'->>'completed')::boolean = true;
```

---

## ✅ Checklist Test Completo

### Test Sessioni Individuali
- [ ] Sessione 1000: Cucina completata → LED lampeggiante
- [ ] Sessione 1001: Camera completata → LED lampeggiante
- [ ] Sessione 1002: Bagno completato → LED lampeggiante
- [ ] Sessione 1003: Soggiorno completato → LED lampeggiante

### Test Vittoria Completa (Sessione 1004)
- [ ] Cucina completata → 1 LED lampeggiante
- [ ] Camera completata → 2 LED lampeggianti
- [ ] Bagno completato → 3 LED lampeggianti
- [ ] Soggiorno completato → 4 LED **VERDI FISSI** 🎊
- [ ] Verifica in tutte le stanze → Tutti LED verdi fissi

### Verifica Tecnica
- [ ] Console browser senza errori
- [ ] WebSocket funzionante
- [ ] Database `game_won = true`
- [ ] LED cambiano in real-time

---

## 🎯 Risultato Atteso Finale

**TUTTI i LED delle porte in TUTTE le stanze devono essere 🟢 VERDI FISSI!**

Questo conferma che:
✅ Sistema LED per-room funziona
✅ Sistema game completion funziona
✅ Logica vittoria globale funziona
✅ WebSocket real-time funziona
✅ Frontend/Backend sincronizzati

**Se tutto è verde fisso = SISTEMA PERFETTO! 🚀**
