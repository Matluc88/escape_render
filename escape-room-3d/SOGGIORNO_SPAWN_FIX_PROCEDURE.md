# 🎯 Procedura Fix Spawn Soggiorno

**Data:** 16 Gennaio 2026, 12:04 PM  
**Status:** FPSController OK ✅ | Coordinate DB KO ❌ | Cache Attiva ⚠️

---

## 📊 SITUAZIONE ATTUALE

### ✅ Sistema Funzionante
- **FPSController:** Inizializzazione atomica implementata e testata
- **Spawn system:** Player nasce esattamente alle coordinate DB
- **Physics:** Collision/gravity non spostano più il player

### ❌ Problema Identificato
**Spawn soggiorno nel database:** `(x: 0.54, y: 0, z: 1.51)`
- ❌ Queste coordinate NON sono dentro il soggiorno
- ✅ Il sistema le rispetta correttamente (come deve essere)
- ⚠️ Cache localStorage serve dati vecchi (TTL: 1 ora)

### 🔍 Evidenza dai Log
```
[API] Using cached spawn for soggiorno
Camera WORLD Position: (0.54, 1.40, 1.51)  ← Match perfetto con DB
```

**Conclusione:** Il codice funziona perfettamente. Le coordinate DB sono sbagliate.

---

## 🛠️ PROCEDURA DI FIX

### Step 1: Invalidare Cache Soggiorno ⏱️ 30 secondi

**Tool:** `CLEAR_SOGGIORNO_SPAWN_CACHE.html`

1. Apri il file nel browser:
   ```bash
   open /Users/matteo/Desktop/ESCAPE/escape-room-3d/CLEAR_SOGGIORNO_SPAWN_CACHE.html
   ```

2. Verifica cache status:
   - 🎯 Soggiorno evidenziato in rosso
   - Coordinate attuali: `(x: 0.54, z: 1.51)`
   - Age: quanto tempo fa è stata salvata

3. Click su **"🗑️ Clear Soggiorno"**
   - Log: `✅ Cache soggiorno rimossa con successo!`
   - Log: `ℹ️ Prossimo accesso fetcherà dal backend`

4. **Refresh** per confermare:
   - Soggiorno non deve più apparire nella lista
   - Se appare ancora, usa **"💣 Clear All Spawns"**

### Step 2: Ricatturare Spawn Corretto ⏱️ 2 minuti

**Tool:** Spawn Editor (http://localhost/admin/spawn-editor)

1. **Apri Spawn Editor:**
   ```bash
   open http://localhost/admin/spawn-editor
   ```

2. **Seleziona "soggiorno"** dalla lista stanze (sidebar sinistra)

3. **Naviga nella scena 3D:**
   - Usa mouse per ruotare view
   - Zoom per avvicinarti al modello
   - Identifica il **centro del soggiorno**

4. **Click sulla mappa 3D** nel punto desiderato:
   - Appare marker 🔴 rosso (posizione corrente)
   - Coordinate mostrate in sidebar
   - Ruota la vista per verificare che sia dentro il soggiorno

5. **Salva nuove coordinate:**
   - Click su **"💾 Salva Spawn Point"**
   - Verifica messaggio: `✅ Spawn salvato per soggiorno!`
   - Backend status deve essere **"🟢 Online"**

6. **Verifica coordinate salvate:**
   - Sezione "Posizione Salvata" mostra nuove coordinate
   - Marker 🟢 verde appare sulla mappa (posizione salvata)

### Step 3: Verifica nel Gioco ⏱️ 1 minuto

1. **Hard refresh della pagina gioco:**
   ```
   Chrome/Edge: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   Firefox: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
   Safari: Cmd+Option+R
   ```

2. **Apri DevTools Console** (F12)

3. **Entra nel soggiorno:**
   - Dalla lobby, click su "Soggiorno"

4. **Verifica logs attesi:**
   ```
   [API] 🌐 Fetching spawn from backend: /spawn/soggiorno
   [API] ✅ Fetched and cached spawn for soggiorno: {position: {x: ..., z: ...}, yaw: ...}
   [FPS Controls] ⏳ Waiting for initialPosition before creating hierarchy
   [FPS Controls] ✅ Hierarchy initialized at ATOMIC position: {x: ..., z: ...}
   Camera WORLD Position: (..., ..., ...)
   ```

5. **Conferma visiva:**
   - Player deve spawnare **dentro il soggiorno**
   - Vista deve essere orientata correttamente (verso centro stanza)
   - Nessun movimento/teleport dopo lo spawn

---

## 📝 NOTE TECNICHE

### Cache System (`src/utils/api.js`)
```javascript
// Cache localStorage con TTL 1 ora
const CACHE_KEY = `spawn_${roomName}`
const CACHE_TTL = 60 * 60 * 1000

// Funzione per clear cache
export const clearSpawnCache = () => {
  const spawnKeys = Object.keys(localStorage).filter(k => k.startsWith('spawn_'))
  spawnKeys.forEach(k => localStorage.removeItem(k))
}
```

### Spawn Editor (`/admin/spawn-editor`)
- **Route:** http://localhost/admin/spawn-editor
- **Salva su:** Backend API `/rooms/${roomName}/spawn` (POST)
- **Cache update:** Automatico dopo salvataggio
- **Formato dati:**
  ```json
  {
    "room": "soggiorno",
    "position": { "x": 2.5, "y": 0, "z": -1.2 },
    "yaw": 3.14
  }
  ```

### FPS Controller Atomic Init
- **Guard 1:** Primo useEffect blocca creazione gerarchia senza `initialPosition`
- **Guard 2:** useFrame blocca physics senza `initialPosition`
- **NO fallback:** Rimosso `(0, 0, 5)` completamente
- **Spawn protection:** 600 frames (~10 secondi) per ground detection

---

## 🎯 CHECKLIST COMPLETA

### Pre-Fix
- [x] FPSController atomic init implementato
- [x] Deploy Docker completato
- [x] Verificato spawn system funzionante
- [x] Identificato problema coordinate DB
- [x] Identificato problema cache

### Fix Execution
- [ ] **Step 1:** Cache soggiorno invalidata
- [ ] **Step 2:** Spawn soggiorno ricatturato con Spawn Editor
- [ ] **Step 3:** Verifica in-game spawn corretto

### Post-Fix Verification
- [ ] Player spawna dentro soggiorno (visuale)
- [ ] Coordinate console === coordinate Spawn Editor
- [ ] Nessun movimento post-spawn
- [ ] Cache aggiornata con nuove coordinate

---

## 🚨 TROUBLESHOOTING

### Problema: Cache non si invalida
**Soluzione:**
```javascript
// Console browser (F12)
localStorage.clear()  // ATTENZIONE: rimuove TUTTO
// Oppure
Object.keys(localStorage).filter(k => k.startsWith('spawn_')).forEach(k => localStorage.removeItem(k))
```

### Problema: Spawn Editor offline
**Verifica backend:**
```bash
docker ps
# escape-backend deve essere "Up (healthy)"

docker logs escape-backend
# Cerca errori nel log
```

**Restart backend:**
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose restart backend
```

### Problema: Coordinate salvate ma non applicate
**Hard refresh + clear cache:**
1. Apri `CLEAR_SOGGIORNO_SPAWN_CACHE.html`
2. Click **"💣 Clear All Spawns"**
3. Hard refresh gioco (Cmd+Shift+R)
4. Riprova ad entrare in soggiorno

### Problema: Player spawna ancora fuori
**Verifica coordinate database:**
```bash
# Accedi al container database
docker exec -it escape-db psql -U escaperoom -d escaperoom

# Query spawn soggiorno
SELECT * FROM spawn_positions WHERE room_name = 'soggiorno';

# Dovrebbe mostrare le nuove coordinate
# Se mostra ancora (0.54, 1.51), il salvataggio non è andato a buon fine
```

---

## 📚 RIFERIMENTI

### File Modificati (FPS Controller Fix)
- `src/hooks/useFPSControls.js` - Atomic initialization
- `FPS_CONTROLLER_ATOMIC_INIT_DEPLOY.md` - Documentazione fix

### Tool Creati
- `CLEAR_SOGGIORNO_SPAWN_CACHE.html` - Invalidazione cache
- `SOGGIORNO_SPAWN_FIX_PROCEDURE.md` - Questo documento

### Risorse Esistenti
- `src/pages/admin/SpawnEditor.jsx` - Editor spawn visuale
- `src/utils/api.js` - Sistema cache spawn

---

**Status Finale:** 🟡 IN ATTESA DI RICATTURA COORDINATE

**Prossima Azione:** Eseguire Step 1-3 della procedura sopra