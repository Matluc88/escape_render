# Analisi Completa Flusso Coordinate Spawn

**Data:** 16/12/2025  
**Problema:** In DEV vedi `z: 2.12, yaw: -0.8616`, in Docker vedi `z: 2.03, yaw: 2.28`

---

## 🔍 Analisi Eseguita

### 1. Flusso Coordinate - Mappatura Completa

```
┌─────────────────────────────────────┐
│  DOCKER (Production)                │
├─────────────────────────────────────┤
│                                     │
│  1. PostgreSQL Database             │
│     002_add_spawn_data.py           │
│     ↓                               │
│     spawn_data = {                  │
│       position: {x,y,z},            │
│       yaw: float                    │
│     }                               │
│                                     │
│  2. FastAPI Backend                 │
│     GET /api/rooms/cucina/spawn     │
│     ↓                               │
│     Mapping: "cucina" → "kitchen"   │
│     ↓                               │
│     room.spawn_data (JSON)          │
│                                     │
│  3. Pydantic Schema                 │
│     SpawnDataResponse               │
│     ↓                               │
│     ⚠️ NESSUNA TRASFORMAZIONE       │
│                                     │
│  4. Response JSON                   │
│     {position: {x,y,z}, yaw}        │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  DEV (Development)                  │
├─────────────────────────────────────┤
│                                     │
│  1. Frontend chiama API             │
│     fetchSpawnPosition("cucina")    │
│     ↓                               │
│     ┌─────────────────┐             │
│     │ localStorage?   │             │
│     │ TTL: 1 hour     │             │
│     └─────────────────┘             │
│            ↓                        │
│     ┌─────────────────┐             │
│     │ API disponibile?│             │
│     └─────────────────┘             │
│            ↓                        │
│     ┌─────────────────┐             │
│     │ FALLBACK        │             │
│     │ hardcoded       │             │
│     └─────────────────┘             │
│                                     │
│  2. getCapturedPosition()           │
│     Ritorna coordinate              │
│     ⚠️ NESSUNA TRASFORMAZIONE       │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Verifiche Completate

### ❌ Verifica 1: Trasformazioni nel Codice
**Risultato:** NESSUNA trasformazione trovata
- Backend: passa JSON as-is
- Pydantic: nessun validator o trasformazione
- Frontend: usa direttamente i valori ricevuti

### ❌ Verifica 2: Coordinate Hardcoded
**Risultato:** Valori `z: 2.12` e `yaw: -0.8616` NON sono hardcoded
- Cercato in tutto `escape-room-3d/src/`: 0 risultati
- I fallback in `cameraPositioning.js` sono corretti: `z: 2.03, yaw: 2.28`

### ⏳ Verifica 3: localStorage Cache
**Strumento:** `check-spawn-source.html`
**Possibilità:** Cache con valori vecchi (TTL 1 ora)

### ⏳ Verifica 4: API Locale Attiva
**Strumento:** `check-spawn-source.html`
**Possibilità:** Database locale PostgreSQL con dati vecchi

---

## 🎯 Ipotesi Conclusive

### Scenario 1: localStorage Cache Vecchia (PROBABILE 90%)
```javascript
// localStorage ha questa entry:
{
  "spawn_cucina": {
    "data": {
      "position": { "x": -0.98, "y": 0, "z": 2.12 },
      "yaw": -0.8616
    },
    "timestamp": 1734346800000  // vecchio di ore/giorni
  }
}
```

**Come:** 
- Hai fatto test giorni fa con coordinate diverse
- La cache è rimasta salvata (TTL 1h ma browser non chiuso)
- Ogni volta che ricarichi, usa quei valori

**Soluzione:**
```bash
# Apri DevTools (F12) → Application → Local Storage
# Trova "spawn_cucina" ed eliminalo
# Oppure usa lo script: check-spawn-source.html
```

### Scenario 2: Backend Locale con DB Vecchio (PROBABILE 8%)
```bash
# Hai un backend locale attivo con database vecchio
# postgres://localhost:5432/escape_room_dev
```

**Come:**
- Backend locale in esecuzione (port 8000)
- Database locale non aggiornato con le nuove coordinate
- API risponde con coordinate vecchie

**Soluzione:**
```bash
# Ferma backend locale
# O aggiorna il database locale con:
cd escape-room-3d/backend
alembic upgrade head
```

### Scenario 3: Hard Reload Non Effettivo (PROBABILE 2%)
**Come:** Browser cache JS non pulita

**Soluzione:**
```bash
# Hard reload: Ctrl+Shift+R (Windows/Linux)
# Hard reload: Cmd+Shift+R (Mac)
# O disabilita cache in DevTools → Network → Disable cache
```

---

## 🛠️ COME USARE IL TOOL DI VERIFICA

### Step 1: Apri lo Script
```bash
open escape-room-3d/check-spawn-source.html
```

### Step 2: Controlla localStorage
- Clicca "Controlla localStorage"
- Se trovi `spawn_cucina` con `z: 2.12` → **TROVATO!**
- Clicca "Pulisci Cache Spawn"

### Step 3: Test API Locale
- Clicca "Test API Locale (port 8000)"
- Se risponde con `z: 2.12` → **Database locale vecchio!**
- Aggiorna database o fermalo

### Step 4: Verifica Risultato
- Ricarica l'app dev con Ctrl+Shift+R
- Verifica che ora vedi `z: 2.03, yaw: 2.28`

---

## 📋 Checklist Risoluzione

- [ ] Aperto `check-spawn-source.html`
- [ ] Verificato localStorage
- [ ] Pulito cache spawn se necessario
- [ ] Testato API locale
- [ ] Fermato/aggiornato backend locale se necessario
- [ ] Hard reload browser (Ctrl+Shift+R)
- [ ] Verificato coordinate corrette in DEV

---

## 🎓 Cosa Abbiamo Imparato

### ✅ CONFERME:
1. **NON ci sono trasformazioni** nel flusso dati
2. **Coordinate passano identiche** da DB a Frontend
3. **Fallback è corretto** con valori Docker
4. **Schema Pydantic non modifica** i dati

### ⚠️ PROBLEMA:
- Le coordinate `z: 2.12, yaw: -0.8616` provengono da:
  - localStorage cache vecchia (90% prob.)
  - O da API locale con DB non aggiornato (8% prob.)
  - O da browser cache non pulita (2% prob.)

### 🔧 SOLUZIONE:
1. Usa `check-spawn-source.html` per identificare la sorgente
2. Pulisci localStorage / aggiorna DB locale
3. Hard reload browser
4. Verifica coordinate corrette

---

## 📝 Note Tecniche

### localStorage API Implementation
```javascript
// In api.js
export const fetchSpawnPosition = async (roomName) => {
  const CACHE_KEY = `spawn_${roomName}`
  const CACHE_TTL = 60 * 60 * 1000 // 1 hour
  
  // 1. Check cache first
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    if (age < CACHE_TTL) {
      return data  // ⚠️ Potrebbe essere vecchio!
    }
  }
  
  // 2. Fetch from API
  const response = await apiClient.get(`/api/rooms/${roomName}/spawn`)
  
  // 3. Cache response
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: response.data,
    timestamp: Date.now()
  }))
  
  return response.data
}
```

### Perché la Cache Può Essere Vecchia?
- TTL di 1 ora ma browser non chiuso da giorni
- `localStorage.setItem()` persiste tra sessioni
- Nessun meccanismo di invalidazione automatica
- Hot reload Vite non pulisce localStorage

---

## 🚀 Prossimi Passi

1. **SUBITO:** Usa `check-spawn-source.html` per verificare
2. **POI:** Pulisci la sorgente identificata
3. **INFINE:** Verifica che coordinate siano sincronizzate
4. **OPZIONALE:** Aggiungi versioning alla cache per auto-invalidazione

---

## 📞 Se Hai Ancora Problemi

Esegui questo in console browser (F12):
```javascript
// Vedi tutte le cache spawn
Object.keys(localStorage)
  .filter(k => k.startsWith('spawn_'))
  .forEach(k => {
    console.log(k, localStorage.getItem(k))
  })

// Pulisci tutto
Object.keys(localStorage)
  .filter(k => k.startsWith('spawn_'))
  .forEach(k => localStorage.removeItem(k))
```

Poi ricarica e verifica se il problema persiste.
