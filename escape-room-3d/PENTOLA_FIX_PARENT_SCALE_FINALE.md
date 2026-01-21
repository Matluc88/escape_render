# 🍳 FIX PENTOLA - SCALA PARENT + COMPENSAZIONE POSIZIONE

**Data**: 12/01/2026, 11:09 AM  
**Problema**: Pentola invisibile (troppo piccola) a causa di parent group con scala 0.01x  
**Soluzione**: Scala il PARENT mesh invece della geometria + compensa posizione

---

## 🔍 Analisi Problema (da log console)

```javascript
✅ Pentola trovata: PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)
📏 Scale locale: {x: 1, y: 1, z: 1}
📍 Position locale: {x: -2.59, y: 0, z: 0.43}
👁️ Visible: true

🌍 World scale effettiva: {x: 0.01, y: 0.01, z: 0.01} ❌ PROBLEMA!
📦 Dimensioni bounding box: {x: 1063.91, y: 924.54, z: 1336.26}
```

### Causa Root

Il **parent group** ha una scala di `0.01x` che annulla qualsiasi scalatura applicata alla geometria:

```
Fix geometria precedente: 100x più grande ✅
Parent group: 0.01x più piccolo ❌
Risultato finale: 100 × 0.01 = 1 (dimensioni originali - troppo piccola!)
```

---

## ✅ Soluzione Implementata

### 1. Scala il PARENT (non la geometria)

```javascript
if (worldScale.x < 0.1) {
  const compensationFactor = 1 / worldScale.x // = 100
  
  // 🎯 FIX CORRETTO: Scala il PARENT mesh
  pentola.scale.set(compensationFactor, compensationFactor, compensationFactor)
  
  // Materiale visibile
  pentola.traverse((child) => {
    if (child.isMesh && child.material) {
      child.visible = true
      child.material.opacity = 1
      child.material.transparent = false
      child.material.needsUpdate = true
    }
  })
}
```

### 2. Compensazione Posizione

⚠️ **IMPORTANTE**: La scala del parent **amplifica anche la posizione locale**!

Se imposti `pentola.position.set(-2.59, 0, 0.43)` con scala `100x`:
- Posizione world finale: `(-259, 0, 43)` ❌ Troppo lontano!

**Soluzione**: Dividi coordinate per `compensationFactor`:

```javascript
const scaledX = -2.59 / compensationFactor // = -0.0259
const scaledY = 0 / compensationFactor     // = 0
const scaledZ = 0.43 / compensationFactor   // = 0.0043

pentola.position.set(scaledX, scaledY, scaledZ)
pentola.updateMatrix()
pentola.updateMatrixWorld(true)

// Log posizione world finale (dovrebbe essere circa -2.59, 0, 0.43)
const worldPos = new THREE.Vector3()
pentola.getWorldPosition(worldPos)
console.log(`[CasaModel] 🌍 Posizione world finale: X=${worldPos.x.toFixed(2)}, Y=${worldPos.y.toFixed(2)}, Z=${worldPos.z.toFixed(2)}`)
```

---

## 🧪 Test & Verifica

### Step 1: Rebuild Frontend

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose up -d --build frontend
```

### Step 2: Clear Cache Browser

Apri `http://localhost:3000` in **modalità incognito** o svuota cache (`Ctrl+Shift+R`)

### Step 3: Controlla Log Console

Cerca questi log:

```javascript
[CasaModel] 🍳 Fix Pentola: Scala world attuale: {x: 0.01, y: 0.01, z: 0.01}
[CasaModel] 🚀 Applico fix: Scala PARENT mesh x100.00
[CasaModel] ✅ Parent scalato
[CasaModel] ✅ Pentola riposizionata (posizione scalata): X=-0.0259, Y=0.0000, Z=0.0043
[CasaModel] 🌍 Posizione world finale: X=-2.59, Y=0.00, Z=0.43 ✅
```

### Step 4: Verifica Visibilità

1. Entra nella scena cucina
2. La pentola dovrebbe essere **VISIBILE** e **GRANde** sui fornelli
3. Posizione circa: `X: -2.59, Y: 0, Z: 0.43`

---

## 📝 Codice Completo

Posizione in `CasaModel.jsx` (dentro useEffect BVH):

```javascript
// 🍳 FIX PENTOLA FINALE - Scala il PARENT (non la geometria) + Riposiziona
if (sceneType === 'cucina') {
  setTimeout(() => {
    let pentola = null
    groupRef.current.traverse((child) => {
      if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
        pentola = child
      }
    })

    if (pentola) {
      const worldScale = new THREE.Vector3()
      pentola.getWorldScale(worldScale)
      
      console.log('[CasaModel] 🍳 Fix Pentola: Scala world attuale:', worldScale)
      
      if (worldScale.x < 0.1) {
        const compensationFactor = 1 / worldScale.x
        console.log(`[CasaModel] 🚀 Applico fix: Scala PARENT mesh x${compensationFactor.toFixed(2)}`)
        
        // 🎯 FIX CORRETTO: Scala il PARENT (pentola object), NON la geometria!
        pentola.scale.set(compensationFactor, compensationFactor, compensationFactor)
        
        // Materiale visibile
        pentola.traverse((child) => {
          if (child.isMesh && child.material) {
            child.visible = true
            child.material.opacity = 1
            child.material.transparent = false
            child.material.needsUpdate = true
          }
        })
        
        console.log('[CasaModel] ✅ Parent scalato')
      }
      
      // 🎯 FIX 2: RIPOSIZIONA sui fornelli (coordinate fornite dall'utente)
      // IMPORTANTE: Dividi per compensationFactor perché la scala amplifica la posizione!
      const scaledX = -2.59 / (worldScale.x < 0.1 ? (1 / worldScale.x) : 1)
      const scaledY = 0 / (worldScale.x < 0.1 ? (1 / worldScale.x) : 1)
      const scaledZ = 0.43 / (worldScale.x < 0.1 ? (1 / worldScale.x) : 1)
      
      pentola.position.set(scaledX, scaledY, scaledZ)
      pentola.updateMatrix()
      pentola.updateMatrixWorld(true)
      
      console.log(`[CasaModel] ✅ Pentola riposizionata (posizione scalata): X=${pentola.position.x.toFixed(4)}, Y=${pentola.position.y.toFixed(4)}, Z=${pentola.position.z.toFixed(4)}`)
      
      // Log posizione world finale
      const worldPos = new THREE.Vector3()
      pentola.getWorldPosition(worldPos)
      console.log(`[CasaModel] 🌍 Posizione world finale: X=${worldPos.x.toFixed(2)}, Y=${worldPos.y.toFixed(2)}, Z=${worldPos.z.toFixed(2)}`)
    } else {
      console.warn('[CasaModel] ⚠️ Pentola non trovata')
    }
  }, 500)
}
```

---

## 🎯 Risultato Atteso

- ✅ **Dimensioni**: Pentola visibile e grande (100x)
- ✅ **Posizione**: Esattamente su `X: -2.59, Y: 0, Z: 0.43` (fornelli)
- ✅ **Materiale**: Opaco, non trasparente
- ✅ **Visibilità**: `visible: true`

---

## 🔗 File Correlati

- `escape-room-3d/src/components/3D/CasaModel.jsx` - Componente 3D casa
- `escape-room-3d/PENTOLA_FIX_GEOMETRY_SCALE_FINALE.md` - Fix precedente (geometry scale)
- `escape-room-3d/DEBUG_PENTOLA_WORLD_POSITION.html` - Script debug console

---

**Status**: ✅ FIX APPLICATO - In attesa di test finale dopo build
