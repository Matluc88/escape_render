# 🎯 ARCHITETTURA COORDINATE - VERSIONE FINALE

**Data:** 16/12/2025 13:15
**Status:** ✅ RISOLTO

## 📋 PROBLEMA ORIGINALE

- Docker mostrava **z: 2.03** invece di **z: 2.12**
- Il valore 2.03 NON esisteva nel codice sorgente
- Proveniva dai nodi embedded nel file **GLB** (modello 3D)

## 🏗️ ARCHITETTURA CORRETTA

### ✅ UNICA FONTE DI COORDINATE:

```javascript
PRIORITÀ 1: API Database (z: 2.12, yaw: -0.8392)
           ↓ Se fallisce
PRIORITÀ 2: FALLBACK_POSITIONS hardcoded (z: 2.12, yaw: -0.8392)
```

### ❌ RIMOSSO:

- ~~PRIORITÀ 3: Nodi GLB (INIZIO_CUCINA, PORTA CUCINA, ecc.)~~
- ~~PRIORITÀ 4: Porte delle stanze~~
- ~~PRIORITÀ 5: Bounding box centro stanza~~

## 🔧 MODIFICHE EFFETTUATE

### 1. **cameraPositioning.js**

**PRIMA** (Sistema a 5 livelli con nodi GLB):
```javascript
export function getSpawnPosition(scene, sceneType) {
  const captured = getCapturedPosition(sceneType); // ❌ Senza await!
  if (captured) { ... }
  
  // Poi cercava nei nodi GLB → z: 2.03 ❌
  let spawn = scene.getObjectByName("INIZIO_CUCINA");
  if (spawn) { return spawn.position; } // ← PROBLEMA!
}
```

**DOPO** (Sistema a 2 livelli pulito):
```javascript
export async function getSpawnPosition(scene, sceneType) {
  const captured = await getCapturedPosition(sceneType); // ✅ Con await!
  
  if (captured) {
    return {
      position: new THREE.Vector3(captured.position.x, ...),
      yaw: captured.yaw
    };
  }
  
  console.error(`NO SPAWN POSITION for ${sceneType}`);
  return null; // ✅ Non usa più nodi GLB!
}
```

### 2. **Database**

```sql
UPDATE rooms 
SET spawn_data = '{"position": {"x": -0.98, "y": 0, "z": 2.12}, "yaw": -0.8392}'::json 
WHERE name = 'kitchen';
```

### 3. **Nginx**

```nginx
# PRIMA (doppio /api/):
location /api/ {
  proxy_pass http://backend/api/; # ❌
}

# DOPO (corretto):
location /api/ {
  proxy_pass http://backend/; # ✅
}
```

## 📊 VALORI FINALI

```javascript
const FALLBACK_POSITIONS = {
  cucina: {
    position: { x: -0.98, y: 0, z: 2.12 }, // ✅
    yaw: -0.8392  // -48.08° ✅
  },
  // ... altre stanze
};
```

## 🎯 FLUSSO COORDINATE

```
BROWSER
   ↓
getCapturedPosition("cucina")
   ↓
fetchSpawnPosition("cucina") → API call
   ↓
http://localhost/api/rooms/cucina/spawn
   ↓
nginx proxy → backend:3000
   ↓
Database PostgreSQL
   ↓
{"position": {"x": -0.98, "y": 0, "z": 2.12}, "yaw": -0.8392}
   ↓
OPPURE (se API fallisce)
   ↓
FALLBACK_POSITIONS["cucina"]
   ↓
{"position": {"x": -0.98, "y": 0, "z": 2.12}, "yaw": -0.8392}
```

## 🚫 COSA NON DEVE PIÙ ESISTERE

1. ❌ Nodi nel file GLB con coordinate spawn
2. ❌ Logica di fallback a porte/bounding box
3. ❌ Coordinate hardcoded diverse tra file
4. ❌ Chiamate async senza await

## ✅ GARANZIE

- **API Database**: z: 2.12 ✅
- **FALLBACK_POSITIONS**: z: 2.12 ✅
- **Database**: z: 2.12 ✅
- **Backend migration**: z: 2.12 ✅
- **Test suite**: z: 2.12 ✅

## 🔒 SINCRONIZZAZIONE

Tutti i file sono sincronizzati:
- ✅ `src/utils/cameraPositioning.js` (FALLBACK_POSITIONS)
- ✅ `backend/alembic/versions/002_add_spawn_data.py` (migration)
- ✅ Database Docker
- ✅ Test suite

## 📝 NOTE

- Il valore **2.03 NON esiste più** nel flusso di coordinate
- Se vedi ancora 2.03 → problema di **cache browser**
- Soluzione: **CMD+SHIFT+R** (hard reload)

## 🎉 RISULTATO

**ADESSO:** Coordinate vengono SOLO da:
1. API Database (z: 2.12)
2. Fallback hardcoded (z: 2.12)

**NIENTE PIÙ** nodi GLB con coordinate vecchie!
