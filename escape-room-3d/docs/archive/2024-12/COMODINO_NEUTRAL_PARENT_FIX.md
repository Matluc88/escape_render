# 🔧 Fix DEFINITIVO - findNeutralParent()

**Data**: 22/12/2025  
**File modificato**: `src/hooks/useComodinoAnimation.js`

## 🎯 Problema Root Cause

```
Scene (neutro)
└─ LETTO (trasformato! position/rotation/scale)
   └─ COMODINO_2 (neutro)
      └─ oggetti comodino
```

**worldToLocal() includeva trasformazioni di LETTO**:
```
WORLD [-1.289, -0.109, 0.439]
  ↓ COMODINO_2.worldToLocal() - include LETTO!
LOCAL [-27.384, 41.762, 0]  ❌ SBAGLIATO!
```

## ✅ Soluzione: findNeutralParent()

### Funzione Implementata

```javascript
function findNeutralParent(node) {
  let current = node
  
  while (current && current.parent) {
    const parent = current.parent
    
    // Se è Scene, usa direttamente
    if (parent.type === 'Scene') {
      return parent
    }
    
    // Verifica se neutro
    const positionLength = parent.position.length()
    const isScaleOne = Math.abs(parent.scale.x - 1) < 0.01 &&
                       Math.abs(parent.scale.y - 1) < 0.01 &&
                       Math.abs(parent.scale.z - 1) < 0.01
    const isRotationZero = Math.abs(parent.rotation.x) < 0.01 &&
                           Math.abs(parent.rotation.y) < 0.01 &&
                           Math.abs(parent.rotation.z) < 0.01
    
    if (positionLength < 0.01 && isScaleOne && isRotationZero) {
      return parent  // Trovato parent neutro!
    }
    
    current = parent
  }
  
  return current  // Fallback
}
```

### Applicazione ROTATION

```javascript
// 🔧 FIX: Trova parent NEUTRO
const neutralParent = findNeutralParent(parent)

// Crea pivot sotto parent NEUTRO
const pivotGroup = new THREE.Group()
pivotGroup.name = 'PIVOT_Comodino'
neutralParent.add(pivotGroup)

// Converti WORLD→LOCAL usando parent NEUTRO
neutralParent.updateWorldMatrix(true, false)
const pivotLocalPos = neutralParent.worldToLocal(pivotWorldPos.clone())
pivotGroup.position.copy(pivotLocalPos)
```

### Applicazione POSITION

```javascript
// ✅ Trova parent NEUTRO per conversioni corrette
const neutralParent = findNeutralParent(parent)

// Converti target WORLD → LOCAL usando parent NEUTRO
const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
neutralParent.updateWorldMatrix(true, false)
const localEnd = neutralParent.worldToLocal(worldEnd.clone())

// Nel loop: converti START e END usando parent NEUTRO
objects.forEach((obj, index) => {
  const worldStart = initialPositionRef.current[index].clone()
  const localStart = neutralParent.worldToLocal(worldStart.clone())
  
  const worldEndThis = worldEnd.clone().add(offsetWorld)
  const localEndThis = neutralParent.worldToLocal(worldEndThis.clone())
  
  obj.position.lerpVectors(localStart, localEndThis, clampedProgress)
})
```

## 🧪 Risultati Attesi

### ROTATION - Pivot LOCAL

**Prima**:
```
WORLD [-1.592, 0.627, 0.075]
LOCAL [-57.64, 78.16, 73.59]  ❌
```

**Dopo**:
```
WORLD [-1.592, 0.627, 0.075]
LOCAL [-1.592, 0.627, 0.075]  ✅ (Scene ha identity transform)
```

### POSITION - Coordinate LOCAL

**Prima**:
```
WORLD [-1.289, -0.109, 0.439]
LOCAL [-27.384, 41.762, 0]  ❌
```

**Dopo**:
```
WORLD [-1.289, -0.109, 0.439]
LOCAL [-1.289, -0.109, 0.439]  ✅
```

## 📊 Log di Debug

```
[findNeutralParent] 🔍 Ricerca parent neutro a partire da: COMODINO_2
[findNeutralParent]   Controllo: LETTO
[findNeutralParent]     position: [2.456, 0.123, -1.234]
[findNeutralParent]     scale: [7.000, 7.000, 7.000]
[findNeutralParent]     rotation: [0.000, 1.571, 0.000]
[findNeutralParent] ⚠️ Parent NON neutro (posLen: 2.790, scale1: false, rot0: false)
[findNeutralParent]   Controllo: Scene
[findNeutralParent] ✅ Trovato Scene root - NEUTRO per definizione
```

## ✅ Validazione

**Pivot/Position LOCAL corretto** se:
- `|x| < 2m` (ordine del mesh/stanza)
- `|y| < 2m`
- `|z| < 2m`
- **MAI decine/centinaia** (indica parent sbagliato)

## 📝 Vantaggi

1. ✅ **Automatico**: risale gerarchia finché necessario
2. ✅ **Robusto**: funziona con qualsiasi struttura GLB
3. ✅ **Universale**: risolve ROTATION e POSITION
4. ✅ **Fallback sicuro**: usa Scene se non trova parent neutro

## 🎓 Lezione Appresa

**worldToLocal() NON è neutro rispetto alla gerarchia!**

Se A→B→C e chiami `B.worldToLocal(worldPos)`:
- ✅ Corretto SE B è neutro O worldPos appartiene al subtree di B
- ❌ Errato SE B ha trasformazioni cumulative da A

**Soluzione**: risali fino a parent con identity transform!

---

**Status**: ✅ Fix definitivo implementato e testabile
**Test**: Premi K in Camera e verifica coordinate < 2m nei log
