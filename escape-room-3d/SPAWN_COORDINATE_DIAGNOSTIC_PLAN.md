# 🔬 SPAWN COORDINATE DIAGNOSTIC PLAN
**Data:** 16 Gennaio 2026, 13:56  
**Obiettivo:** Identificare se DB salva LOCAL o WORLD e allineare Editor ↔ Runtime

---

## 🎯 PROBLEMA IDENTIFICATO

**Ground Truth (misurato in gioco):**
```
X: 0.41  ✅ (match con DB: 0.4)
Y: 0.04  ✅ (a terra)
Z: -0.31 ❌ (MISMATCH!)
```

**Database (coordinate salvate):**
```
X: 0.4   ✅
Y: 0     ✅
Z: 1.49  ❌ (Delta ~1.8m!)
```

**→ CAUSA:** Editor e Runtime NON parlano la stessa lingua (LOCAL vs WORLD)

---

## 📋 FLUSSO ATTUALE (analisi codice)

### 1️⃣ **SpawnEditor.jsx** (SALVATAGGIO)
```javascript
// handleClick - Cattura coordinate
const worldPoint = intersects[0].point  // WORLD space (dal raycast)
const localPoint = groupRef.current.worldToLocal(worldPoint.clone())  // Conversione → LOCAL

// handleSave - Salva nel DB
const spawnData = {
  position: {
    x: localPoint.x,
    y: 0,  // FISSO
    z: localPoint.z
  }
}
```
**CONCLUSIONE:** SpawnEditor salva in **LOCAL SPACE** (relativo al groupRef)

### 2️⃣ **CasaModel.jsx** (SETUP MODELLO)
```javascript
// useLayoutEffect - Applica trasformazioni
const CASA_SCALE = 10
scene.scale.set(CASA_SCALE, CASA_SCALE, CASA_SCALE)

// Offset dinamico
const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0  // 2.0m interno!
groupRef.current.position.set(-center.x, -targetGroundY + PIANO_TERRA_HEIGHT, -center.z)
```
**TRASFORMAZIONI:**
- Scale: 10x
- Offset Y: 2.0m (scene interne)
- Center: modello centrato

### 3️⃣ **LivingRoomScene.jsx** (CARICAMENTO)
```javascript
// useEffect - Carica spawn da API
const loadSpawnPosition = async () => {
  const captured = await getCapturedPosition('soggiorno')
  setSpawnPosition({
    x: captured.position.x,
    y: captured.position.y,
    z: captured.position.z
  })
}
```
**NESSUNA CONVERSIONE!** Coordinate prese dal DB senza trasformazioni.

### 4️⃣ **useFPSControls.js** (APPLICAZIONE)
```javascript
// useEffect - Posiziona player
playerRootRef.current.position.set(
  initialPosition.x,
  initialPosition.y || 0,
  initialPosition.z
)
```
**PROBLEMA!** Coordinate LOCAL dal DB interpretate come WORLD!

---

## 🚨 ROOT CAUSE IDENTIFICATA

```
SpawnEditor:  worldToLocal(click) → DB salva LOCAL
Runtime:      DB → playerRoot.position (interpreta come WORLD)
              
              ❌ MANCA: localToWorld() conversion!
```

---

## 📊 PIANO LOG DIAGNOSTICI

### **FASE 1: Invalidare Cache**

**File:** `CLEAR_SPAWN_CACHE_DIAGNOSTIC.html` ✅ CREATO

**Azione:**
1. Aprire `CLEAR_SPAWN_CACHE_DIAGNOSTIC.html`
2. Click "CANCELLA CACHE SPAWN"
3. Verificare console: "✅ Tutte le cache spawn cancellate!"

---

### **FASE 2: Log SpawnEditor**

**File:** `src/pages/admin/SpawnEditor.jsx`

**Modifiche da applicare:**

```javascript
// DOPO il handleClick (riga ~140)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('[SpawnEditor] 📍 SPAWN EDITOR DEBUG - CLICK CAPTURE')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🏗️ MODEL SETUP:')
console.log('  CASA_SCALE:', CASA_SCALE)
console.log('  groupRef.position:', groupRef.current.position)
console.log('  groupRef.scale:', groupRef.current.scale)
console.log('  Model Group Y Offset:', groupRef.current.position.y.toFixed(3) + 'm')

console.log('\n🎯 COORDINATE CATTURATE:')
console.log('  Click WORLD (raycast):', {
  x: worldPoint.x.toFixed(3),
  y: worldPoint.y.toFixed(3),
  z: worldPoint.z.toFixed(3)
})
console.log('  Click LOCAL (worldToLocal):', {
  x: localPoint.x.toFixed(3),
  y: localPoint.y.toFixed(3),
  z: localPoint.z.toFixed(3)
})

console.log('\n💾 SALVANDO NEL DB:')
console.log('  Coordinate:', spawnData.position)
console.log('  Space Type: LOCAL (relativo a groupRef)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

---

### **FASE 3: Log CasaModel Runtime**

**File:** `src/components/3D/CasaModel.jsx`

**Modifiche da applicare (riga ~289, dentro useLayoutEffect):**

```javascript
// DOPO groupRef.current.position.set(...) (riga ~289)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('[CasaModel] 🏠 CASAMODEL RUNTIME DEBUG')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🏗️ MODEL SETUP:')
console.log('  CASA_SCALE:', CASA_SCALE)
console.log('  sceneType:', sceneType)
console.log('  PIANO_TERRA_HEIGHT:', actualOffset + 'm')
console.log('  targetGroundY:', targetGroundY.toFixed(3) + 'm')

console.log('\n📐 GROUP TRANSFORM:')
console.log('  groupRef.position:', {
  x: groupRef.current.position.x.toFixed(3),
  y: groupRef.current.position.y.toFixed(3),
  z: groupRef.current.position.z.toFixed(3)
})
console.log('  groupRef.scale:', {
  x: groupRef.current.scale.x,
  y: groupRef.current.scale.y,
  z: groupRef.current.scale.z
})

// ✅ AGGIUNGERE: Log matrixWorld
groupRef.current.updateMatrixWorld(true)
const matrixElements = groupRef.current.matrixWorld.elements
console.log('\n🌍 GROUP MATRIX WORLD (4x4):')
console.log('  Row 1:', matrixElements.slice(0, 4).map(n => n.toFixed(3)))
console.log('  Row 2:', matrixElements.slice(4, 8).map(n => n.toFixed(3)))
console.log('  Row 3:', matrixElements.slice(8, 12).map(n => n.toFixed(3)))
console.log('  Row 4:', matrixElements.slice(12, 16).map(n => n.toFixed(3)))
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

---

### **FASE 4: Test LOCAL vs WORLD**

**File:** `src/components/scenes/LivingRoomScene.jsx`

**Modifiche da applicare (dopo caricamento spawn, riga ~950):**

```javascript
// DENTRO useEffect loadSpawnPosition, DOPO setSpawnPosition()
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('[LivingRoomScene] 🔬 SPAWN INTERPRETATION TEST')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📥 SPAWN DA DB (captured):', captured.position)

// ✅ TEST: Se DB salva LOCAL, convertiamo a WORLD
if (modelRef && modelRef.current) {
  // Test LOCAL → WORLD conversion
  const spawnLocal = new THREE.Vector3(
    captured.position.x,
    captured.position.y,
    captured.position.z
  )
  const spawnWorld = modelRef.current.localToWorld(spawnLocal.clone())
  
  console.log('\n🧪 CONVERSION TEST:')
  console.log('  Interpretation: LOCAL (DB salva coordinate locali)')
  console.log('  LOCAL coords (from DB):', {
    x: spawnLocal.x.toFixed(3),
    y: spawnLocal.y.toFixed(3),
    z: spawnLocal.z.toFixed(3)
  })
  console.log('  WORLD coords (localToWorld):', {
    x: spawnWorld.x.toFixed(3),
    y: spawnWorld.y.toFixed(3),
    z: spawnWorld.z.toFixed(3)
  })
  
  console.log('\n🎯 EXPECTED vs ACTUAL:')
  console.log('  Ground Truth (misurato):', { x: 0.41, y: 0.04, z: -0.31 })
  console.log('  DB LOCAL (raw):', captured.position)
  console.log('  DB → WORLD (converted):', {
    x: spawnWorld.x.toFixed(2),
    y: spawnWorld.y.toFixed(2),
    z: spawnWorld.z.toFixed(2)
  })
  
  // Calcola delta
  const deltaX = Math.abs(spawnWorld.x - 0.41)
  const deltaZ = Math.abs(spawnWorld.z - (-0.31))
  console.log('  Delta X:', deltaX.toFixed(2) + 'm', deltaX < 0.1 ? '✅ MATCH!' : '❌ MISMATCH')
  console.log('  Delta Z:', deltaZ.toFixed(2) + 'm', deltaZ < 0.1 ? '✅ MATCH!' : '❌ MISMATCH')
} else {
  console.warn('⚠️ modelRef non disponibile - skip conversion test')
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

---

### **FASE 5: Log useFPSControls**

**File:** `src/hooks/useFPSControls.js`

**Modifiche da applicare (riga ~565, dentro useEffect repositioning):**

```javascript
// DOPO playerRootRef.current.position.set(...)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('[useFPSControls] 🎮 FPS CONTROLS DEBUG - SPAWN APPLICATION')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📥 INITIAL POSITION RICEVUTO:')
console.log('  From API/Scene:', initialPosition)
console.log('  Interpretation: WORLD space (no conversion)')

console.log('\n🎯 PLAYER ROOT POSITIONING:')
console.log('  playerRoot.position PRIMA:', '<posizione precedente>')
console.log('  playerRoot.position SET TO:', initialPosition)

// Dopo updateMatrixWorld()
const worldPos = new THREE.Vector3()
playerRootRef.current.getWorldPosition(worldPos)
console.log('  playerRoot WORLD position (getWorldPosition):', {
  x: worldPos.x.toFixed(3),
  y: worldPos.y.toFixed(3),
  z: worldPos.z.toFixed(3)
})

console.log('\n👁️ CAMERA SETUP:')
console.log('  cameraRig.position.y (eyeHeight):', CAMERA_EYE_LEVEL + 'm')
console.log('  camera.position (local, bobbing):', { x: 0, y: 0, z: 0 })
console.log('  FINAL Camera WORLD Y:', (worldPos.y + CAMERA_EYE_LEVEL).toFixed(3) + 'm')

console.log('\n🔍 DIAGNOSIS:')
console.log('  Ground Truth Z (misurato):', -0.31)
console.log('  DB Z:', 1.49)
console.log('  playerRoot Z (applicato):', worldPos.z.toFixed(2))
console.log('  ❌ PROBLEMA: DB LOCAL interpretato come WORLD!')
console.log('  ✅ SOLUZIONE: Applicare localToWorld() PRIMA di set()')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

---

## 🎯 PROCEDURA TEST COMPLETA

### **Step-by-Step:**

1. ✅ **Aprire** `CLEAR_SPAWN_CACHE_DIAGNOSTIC.html`
   - Click "CANCELLA CACHE SPAWN"
   - Verificare console: cache cancellata

2. ✅ **Aprire DevTools** (F12) → Tab Console

3. ✅ **Aprire SpawnEditor** (`/admin/spawn-editor`)
   - Click su un punto del pavimento soggiorno
   - Leggere log "SPAWN EDITOR DEBUG"
   - ✅ Annotare: CASA_SCALE, groupRef.position.y, coordinate LOCAL

4. ✅ **Aprire Runtime** (`/play` → soggiorno)
   - Leggere log "CASAMODEL RUNTIME DEBUG"
   - Leggere log "SPAWN INTERPRETATION TEST"
   - Leggere log "FPS CONTROLS DEBUG"
   - ✅ Annotare: CASA_SCALE, groupRef.position.y, coordinate WORLD

5. ✅ **Confrontare:**
   - CASA_SCALE uguale? ✅
   - groupRef.position.y uguale? ✅
   - matrixWorld uguale? ✅
   - Conversion test → Delta Z < 0.1m? ❌

---

## 🔧 FIX ATTESO

**Se test conferma problema LOCAL→WORLD:**

**Opzione A (RACCOMANDATO): Runtime converte LOCAL→WORLD**

```javascript
// LivingRoomScene.jsx - PRIMA di setSpawnPosition()
if (modelRef && modelRef.current && captured) {
  const spawnLocal = new THREE.Vector3(
    captured.position.x,
    captured.position.y || 0,
    captured.position.z
  )
  const spawnWorld = modelRef.current.localToWorld(spawnLocal)
  
  setSpawnPosition({
    x: spawnWorld.x,
    y: spawnWorld.y,
    z: spawnWorld.z
  })
  
  console.log('[LivingRoomScene] ✅ Converted LOCAL→WORLD:', spawnWorld)
}
```

**Opzione B: SpawnEditor salva WORLD (richiede ricattura)**

```javascript
// SpawnEditor.jsx - handleSave
const spawnData = {
  position: {
    x: parseFloat(worldPoint.x.toFixed(2)),  // WORLD, no conversion!
    y: 0,
    z: parseFloat(worldPoint.z.toFixed(2))
  }
}
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

- [ ] Invalidare cache spawn (HTML)
- [ ] Aggiungere log SpawnEditor
- [ ] Aggiungere log CasaModel
- [ ] Aggiungere log LivingRoomScene (test LOCAL vs WORLD)
- [ ] Aggiungere log useFPSControls
- [ ] Eseguire test completo
- [ ] Confrontare log punto-per-punto
- [ ] Decidere fix (Opzione A o B)
- [ ] Implementare fix
- [ ] Testare in gioco (confronto con Ground Truth)
- [ ] Ricatturare coordinate se necessario
- [ ] Documentazione finale

---

**Tempo stimato:** 45 minuti (15min log + 15min test + 15min fix)

**Confidence Level:** 95% (problema identificato, fix chiaro)