# 🎯 GUIDA FINALE TEST LED SU RENDER

## ✅ Setup Completato

- ✅ Coordinate spawn sincronizzate (Render = Locale)
- ✅ Sistema LED funzionante e testato
- ✅ Session ID 26 disponibile su Render

---

## 🔗 Link Test con Session ID 26

**Apri questi 4 link in 4 tab separati del browser:**

### 🍳 Tab 1 - CUCINA
```
https://escape-room-3d.onrender.com/play/26/cucina?name=Player1
```

### 🛏️ Tab 2 - CAMERA
```
https://escape-room-3d.onrender.com/play/26/camera?name=Player2
```

### 🚿 Tab 3 - BAGNO
```
https://escape-room-3d.onrender.com/play/26/bagno?name=Player3
```

### 🛋️ Tab 4 - SOGGIORNO
```
https://escape-room-3d.onrender.com/play/26/soggiorno?name=Player4
```

---

## 🧪 Procedura Test LED

### Test 1: LED Lampeggiante (Stanza Singola)

1. **Tab 1 (CUCINA)** - Completa i puzzle:
   - Premi tasto **1** → Fornello 1 attivo
   - Premi tasto **2** → Fornello 2 attivo
   - Premi tasto **3** → Fornello 3 attivo
   - Premi tasto **4** → Fornello 4 attivo
   - Premi tasto **5** → Fornello 5 attivo (TUTTI accesi)
   - Attendi **3 secondi** → Cucina completata!

2. **Verifica in TUTTI i 4 tab:**
   - LED porta cucina → 🟢⚡ **VERDE LAMPEGGIANTE**
   - LED porta camera → 🔴 **ROSSO**
   - LED porta bagno → 🔴 **ROSSO**
   - LED porta soggiorno → 🔴 **ROSSO**

✅ **Se 1 LED lampeggia e 3 sono rossi = CORRETTO!**

---

### Test 2: LED Multipli Lampeggianti

1. **Tab 2 (CAMERA)** - Completa i puzzle:
   - Clicca sul **Comodino**
   - Clicca sul **Materasso**
   - Clicca sulla **Poltrona**
   - Clicca sulla **Griglia Ventola**
   - Attendi **3 secondi** → Camera completata!

2. **Verifica in TUTTI i 4 tab:**
   - LED cucina → 🟢⚡ **LAMPEGGIANTE**
   - LED camera → 🟢⚡ **LAMPEGGIANTE**
   - LED bagno → 🔴 **ROSSO**
   - LED soggiorno → 🔴 **ROSSO**

✅ **Se 2 LED lampeggiano e 2 sono rossi = CORRETTO!**

---

### Test 3: Test Vittoria Totale (🎊 LED VERDI FISSI)

1. **Tab 3 (BAGNO)** - Completa i puzzle:
   - Clicca sullo **Specchio**
   - Clicca sulla **Porta Doccia**
   - Clicca sulla **Griglia Ventola Bagno**
   - Attendi **3 secondi** → Bagno completato!

2. **Tab 4 (SOGGIORNO)** - Completa i puzzle:
   - Clicca sulla **TV**
   - Clicca sulla **Pianta**
   - Clicca sul **Condizionatore**
   - Attendi **3 secondi** → Soggiorno completato!

3. **🎊 MOMENTO MAGICO - Verifica in TUTTI i 4 tab:**
   - LED cucina → 🟢 **VERDE FISSO**
   - LED camera → 🟢 **VERDE FISSO**
   - LED bagno → 🟢 **VERDE FISSO**
   - LED soggiorno → 🟢 **VERDE FISSO**

✅ **SE TUTTI I LED SONO VERDI FISSI = SISTEMA PERFETTO! 🎉**

---

## 📊 Logica LED (Riepilogo)

| Stanze Completate | LED Stato | Significato |
|-------------------|-----------|-------------|
| 0/4 | 🔴🔴🔴🔴 | Nessuna stanza completata |
| 1/4 | 🟢⚡🔴🔴🔴 | 1 stanza completata |
| 2/4 | 🟢⚡🟢⚡🔴🔴 | 2 stanze completate |
| 3/4 | 🟢⚡🟢⚡🟢⚡🔴 | 3 stanze completate |
| **4/4** | **🟢🟢🟢🟢** | **VITTORIA! Game won!** |

---

## 🔍 Debug (Console Browser)

Apri DevTools (F12) → Console per vedere:

```javascript
[useGameCompletion] ✅ door_led_states received
door_led_states: {
  cucina: "solid",     // ← Verde fisso = Vittoria!
  camera: "solid",
  bagno: "solid",
  soggiorno: "solid"
}

[useGameCompletion] 🎊 ALL ROOMS COMPLETED! game_won=true
```

---

## 🐛 Troubleshooting

### Problema: LED non cambiano

**Soluzione:** Hard refresh (Ctrl+Shift+R o Cmd+Shift+R)

### Problema: Spawn in posizione sbagliata

**Soluzione:** ✅ **RISOLTO!** Le coordinate sono state sincronizzate.
Se il problema persiste, cancella cache browser e ricarica.

### Problema: "Session not found"

**Verifica sessione:**
```bash
PGPASSWORD='9sd8kU8Z7a3rV6AbP1w69pIFow2LS7g3' psql \
  -h dpg-d4mtod8gjchc73bjdme0-a.oregon-postgres.render.com \
  -U escape_user \
  -d escape_db_np5b \
  -c "SELECT id, pin, status FROM game_sessions WHERE id = 26;"
```

---

## 📝 Note Importanti

### Sistema Cooperativo
- **TUTTI i giocatori usano lo STESSO session_id (26)**
- Solo la stanza nell'URL cambia
- I LED sono **GLOBALI** - tutti vedono gli stessi LED
- Il sistema è **real-time** via WebSocket

### Coordinate Spawn Corrette
- ✅ Cucina: x=-0.9, z=2.12, yaw=2.45
- ✅ Camera: x=-0.21, z=1.46, yaw=0.82
- ✅ Bagno: x=1.18, z=2.59, yaw=3.75
- ✅ Soggiorno: x=0.53, z=1.52, yaw=5.17

### Sistema LED
- Rosso = Stanza NON completata
- Verde lampeggiante = Stanza completata (ma gioco non vinto)
- **Verde fisso = TUTTE le stanze completate (VITTORIA!)**

---

## ✅ Checklist Test Finale

### Sessione 26 - Test Completo
- [ ] Aperto 4 tab con session_id=26
- [ ] Cucina completata → 1 LED lampeggiante
- [ ] Camera completata → 2 LED lampeggianti
- [ ] Bagno completato → 3 LED lampeggianti
- [ ] Soggiorno completato → **4 LED VERDI FISSI** 🎊
- [ ] Verificato in tutti i 4 tab → Sincronizzazione perfetta
- [ ] Console senza errori
- [ ] WebSocket funzionante

**Se tutti i punti sono ✅ → SISTEMA LED PERFETTAMENTE FUNZIONANTE! 🚀**

---

## 🎯 Risultato Finale Atteso

**Dopo aver completato TUTTE le 4 stanze:**

```
🟢🟢🟢🟢 TUTTI I LED VERDI FISSI IN TUTTE LE STANZE!
```

Questo conferma:
- ✅ Sistema LED per-room funziona
- ✅ Sistema game completion funziona  
- ✅ Logica vittoria globale funziona (game_won=true)
- ✅ WebSocket real-time funziona
- ✅ Frontend/Backend sincronizzati perfettamente

**SISTEMA PRONTO PER LA PRODUZIONE! 🎉**
