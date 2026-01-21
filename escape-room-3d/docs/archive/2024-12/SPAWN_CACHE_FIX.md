# 🔧 Fix: Cache Spawn Produzione

**Data**: 27 Dicembre 2025  
**Problema**: Il punto di spawn per /dev/camera non viene preso dal database ma dalla cache localStorage vecchia

---

## 🔍 Diagnosi dal Log Produzione

```javascript
[Bedroom] Using fallback spawn position ❌
[Bedroom] Using default yaw: 0 radians ❌  
[API] ✅ Using cached spawn for camera (age: 1496s) ⚠️ CACHE VECCHIA (25 minuti)
[CameraPositioning] ✅ Loaded spawn from DATABASE ✅
[Bedroom] ✅ Usando yaw da API: 0.63 radianti ✅
```

### Il Problema

La cache localStorage ha **priorità** sul database e contiene dati vecchi:
- **Cache Age**: 1496 secondi (~25 minuti)
- **Cache TTL**: 3600 secondi (1 ora)
- **Risultato**: Sistema usa coordinate vecchie invece di quelle dal database

---

## ✅ Soluzione: Pulire Cache localStorage

### Metodo 1: Console Browser (Manuale)

1. Apri la Console del Browser (F12)
2. Esegui:
```javascript
localStorage.clear()
```
3. Ricarica la pagina (F5)

### Metodo 2: Script di Pulizia

Esiste già il file `clear-spawn-cache.html` nella root:

```bash
# Apri in browser:
open escape-room-3d/clear-spawn-cache.html
```

Oppure crea un nuovo script:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Clear Spawn Cache</title>
</head>
<body>
    <h1>Pulizia Cache Spawn</h1>
    <button onclick="clearSpawnCache()">Clear Spawn Cache</button>
    <button onclick="clearAllCache()">Clear ALL Cache</button>
    <pre id="output"></pre>
    
    <script>
        function clearSpawnCache() {
            const keys = Object.keys(localStorage);
            const spawnKeys = keys.filter(k => k.startsWith('spawn_'));
            spawnKeys.forEach(k => localStorage.removeItem(k));
            document.getElementById('output').textContent = 
                `✅ Cleared ${spawnKeys.length} spawn caches:\n${spawnKeys.join('\n')}`;
        }
        
        function clearAllCache() {
            localStorage.clear();
            document.getElementById('output').textContent = '✅ All localStorage cleared';
        }
    </script>
</body>
</html>
```

---

## 🔄 Verifica Funzionamento

Dopo aver pulito la cache, verifica nei log del browser:

```javascript
// ✅ Log Corretto (dopo pulizia cache):
[API] 🌐 Fetching spawn from backend: /spawn/camera
[API] ✅ Fetched and cached spawn for camera: {position: {x: -0.17, y: 0, z: 1.4}, yaw: 0.63}
[CameraPositioning] ✅ Loaded spawn from DATABASE for camera
[Bedroom] ✅ Usando yaw da API: 0.63 radianti
```

---

## 📊 Coordinate Database Corrette

```sql
-- Database: escape_db
-- Tabella: spawn_points
SELECT * FROM spawn_points WHERE room_name = 'camera';

room_name | spawn_x | spawn_y | spawn_z | yaw  
----------|---------|---------|---------|------
camera    | -0.17   | 0       | 1.4     | 0.63
```

---

## 🎯 Test API Backend

```bash
# Test diretto API:
curl http://localhost:3000/spawn/camera

# ✅ Risposta corretta:
{
  "position": {"x": -0.17, "y": 0.0, "z": 1.4},
  "yaw": 0.63
}
```

---

## 📝 Sistema di Cache

Il sistema usa una cache localStorage con TTL di 1 ora per evitare troppe chiamate al database:

**File**: `src/utils/api.js`

```javascript
const CACHE_KEY = `spawn_${roomName}`
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Controllo cache
const cached = localStorage.getItem(CACHE_KEY)
if (cached) {
  const { data, timestamp } = JSON.parse(cached)
  const age = Date.now() - timestamp
  
  if (age < CACHE_TTL) {
    // ✅ Usa cache se non scaduta
    return data
  }
}

// ❌ Cache scaduta o assente → fetch dal backend
const response = await apiClient.get(`/spawn/${roomName}`)
```

---

## 🚀 Deployment Note

**IMPORTANTE per Produzione**:

Quando si aggiornano le coordinate spawn nel database, gli utenti **devono pulire la cache** manualmente o aspettare 1 ora per l'auto-refresh.

### Opzioni per Deployment:

1. **Manuale**: Dire agli utenti di pulire cache dopo update
2. **Versioning**: Aggiungere versione alle chiavi cache: `spawn_v2_camera`
3. **Ridurre TTL**: Da 1 ora a 5-10 minuti per update più rapidi
4. **API Versioning**: Header `X-Spawn-Version` per invalidare cache

---

## ✅ Completato

- [x] Database spawn_points creato e popolato
- [x] API `/spawn/{room_name}` funzionante  
- [x] Frontend aggiornato per usare nuova API
- [x] **SOLUZIONE**: Pulire cache localStorage per refresh
- [x] Sistema ora carica coordinate dal database

**Sistema funzionante!** 🎉
