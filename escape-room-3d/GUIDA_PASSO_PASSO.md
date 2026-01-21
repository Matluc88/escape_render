# 🔍 Guida Passo-Passo: Trova la Sorgente delle Coordinate

## 📋 PROBLEMA
In DEV vedi: `z: 2.12, yaw: -0.8616`  
In Docker vedi: `z: 2.03, yaw: 2.28`

**Dobbiamo capire da dove vengono le coordinate in DEV!**

---

## ✅ PASSO 1: Apri il Tool di Verifica

### 1.1 - Apri il File HTML
```bash
# Nel terminale, dalla cartella del progetto:
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
open check-spawn-source.html
```

### 1.2 - Si apre una pagina web verde/nera
✅ Se si apre correttamente, passa allo step 2  
❌ Se non si apre, dimmi quale errore vedi

---

## ✅ PASSO 2: Controlla localStorage

### 2.1 - Clicca il bottone "Controlla localStorage"
Nella sezione **"1️⃣ localStorage Cache"**, clicca il primo bottone verde.

### 2.2 - Leggi il risultato

#### CASO A: Vedi "Nessuna cache spawn trovata"
```
❌ Nessuna cache spawn trovata in localStorage
Questo significa che stai usando il FALLBACK hardcoded
```
➡️ **Se vedi questo:** Passa direttamente allo STEP 3

#### CASO B: Vedi "Trovate N cache spawn"
```
✅ Trovate 1 cache spawn:

🔑 spawn_cucina:
   Age: 3600s
   Data: {
     "position": { "x": -0.98, "y": 0, "z": 2.12 },
     "yaw": -0.8616
   }
   
   ⚠️ TROVATI VALORI VECCHI! Pulisci la cache!
```

➡️ **Se vedi z: 2.12 e yaw: -0.8616:** 🎉 **TROVATO IL PROBLEMA!**

### 2.3 - Pulisci la Cache (solo se hai trovato valori vecchi)
Clicca il bottone rosso **"Pulisci Cache Spawn"**

Dovresti vedere:
```
✅ Cancellate 1 cache spawn!
Ora ricarica la pagina con Ctrl+Shift+R
```

➡️ Passa allo STEP 4 (Verifica Finale)

---

## ✅ PASSO 3: Controlla l'API Locale

### 3.1 - Clicca "Test API Locale (port 8000)"
Nella sezione **"2️⃣ API Backend Locale"**

### 3.2 - Leggi il risultato

#### CASO A: API NON disponibile
```
❌ API NON disponibile su porta 8000
Errore: Failed to fetch

Questo significa che stai usando il FALLBACK hardcoded
```
➡️ **Se vedi questo:** Il problema NON è l'API. Passa allo STEP 5 (Debugging Avanzato)

#### CASO B: API ATTIVA con valori vecchi
```
✅ API ATTIVA su porta 8000!

📍 Coordinate restituite:
{
  "position": { "x": -0.98, "y": 0, "z": 2.12 },
  "yaw": -0.8616
}

⚠️ L'API sta restituendo i VALORI VECCHI!
Il database locale ha dati vecchi!
```

➡️ **Se vedi questo:** 🎉 **TROVATO! Database locale vecchio**

### 3.3 - Aggiorna il Database Locale
```bash
# Nel terminale:
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d/backend

# Controlla se ci sono migrazioni pending
alembic current
alembic heads

# Esegui le migrazioni
alembic upgrade head

# Oppure, se preferisci, ferma il backend locale:
# (cerca il processo e killalo)
ps aux | grep python
# kill -9 <PID>
```

➡️ Passa allo STEP 4 (Verifica Finale)

---

## ✅ PASSO 4: Verifica Finale

### 4.1 - Riapri l'App DEV
```bash
# Se il server dev non è attivo:
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
npm run dev
```

### 4.2 - Hard Reload del Browser
- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

### 4.3 - Apri DevTools e vai in Cucina
1. Apri DevTools (F12)
2. Vai su Console
3. Naviga alla cucina nell'app
4. Guarda i valori nel LivePositionDebug

### 4.4 - Verifica Coordinate
**Dovresti vedere:**
```
📍 POSITION & ROTATION & SPEED
Position:
X: -0.98
Y: 0
Z: 2.03  ✅ (era 2.12 ❌)
Rotation (Yaw):
2.28 rad  ✅ (era -0.8616 ❌)
130.63°
```

✅ **Se vedi questi valori:** PROBLEMA RISOLTO! 🎉  
❌ **Se vedi ancora z: 2.12:** Passa allo STEP 5

---

## ✅ PASSO 5: Debugging Avanzato (solo se necessario)

### 5.1 - Controlla la Console del Browser
Apri DevTools (F12) → Console

Cerca messaggi come:
```
[API] ✅ Using cached spawn for cucina
[API] 🌐 Fetching spawn from backend
[API] ❌ Error fetching spawn
```

### 5.2 - Controlla Application Storage
DevTools (F12) → Application → Local Storage → `http://localhost:5174`

Cerca chiavi che iniziano con `spawn_`:
- `spawn_cucina`
- `spawn_bagno`
- ecc.

**Elimina manualmente** tutte le chiavi `spawn_*`

### 5.3 - Disabilita Cache Completamente
DevTools → Network → ✅ "Disable cache"

### 5.4 - Cancella TUTTO
DevTools → Application → Clear storage → Clear site data

➡️ Ritorna allo STEP 4.2 (Hard Reload)

---

## 📞 DIMMI COSA VEDI

Dopo aver fatto questi step, dimmi:

### ✅ STEP 2 (localStorage):
- [ ] Ho trovato cache spawn con z: 2.12
- [ ] Non ho trovato cache spawn
- [ ] Altro: _____________

### ✅ STEP 3 (API):
- [ ] API non disponibile (porta 8000)
- [ ] API attiva con z: 2.12
- [ ] API attiva con z: 2.03
- [ ] Altro: _____________

### ✅ STEP 4 (Verifica):
- [ ] Ora vedo z: 2.03 ✅
- [ ] Vedo ancora z: 2.12 ❌
- [ ] Altro: _____________

---

## 🎯 RIEPILOGO VELOCE

1. Apri `check-spawn-source.html`
2. Clicca "Controlla localStorage"
3. Se trovi z: 2.12 → Clicca "Pulisci Cache Spawn"
4. Clicca "Test API Locale (port 8000)"
5. Se API attiva con z: 2.12 → Aggiorna database con `alembic upgrade head`
6. Hard reload browser (Cmd+Shift+R)
7. Verifica che ora vedi z: 2.03

**Fatto! Dimmi a che punto sei!** 🚀
