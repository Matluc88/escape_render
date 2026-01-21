# 🔧 Fix Coordinate WORLD/LOCAL - Comodino Animation

**Data**: 22/12/2025  
**File modificato**: `src/hooks/useComodinoAnimation.js`

## 📊 Problemi Identificati

### 1️⃣ Animazione POSITION: Mix WORLD↔LOCAL
**Problema dai log**:
```
LOCAL Start: [-0.631, -0.109, 0.220]
LOCAL End:   [-27.384, 41.762, 0.000]  ← SBAGLIATO!
WORLD End:   [-1.289, -0.109, 0.439]

[10%] Pos LOCAL: [31.295, 61.296, 0.000]  ← ESPLOSIVO!
```

**Causa**: 
- Start/end calcolati in WORLD
- Lerp applicato su `.position` (LOCAL)
- Parent con `scale x7` → conversione errata

### 2️⃣ Animazione ROTATION: Pivot su parent scalato
**Problema dai log**:
```
Pivot ROTATION (world): [-1.592, 0.627, 0.075]  ← Corretto
Pivot local pos: [-57.64, 78.16, 73.59]  ← SBAGLIATO!
```

**Causa**:
- `parent.worldToLocal()` applicato su nodo con `scale x7`
- Coordinate moltiplicate → valori esplosivi

---

## ✅ Fix Implementati

### Fix 1: POSITION - Salva WORLD, converti a LOCAL nel loop

**Prima** (❌ SBAGLIATO):
```javascript
// Salvava LOCAL direttamente (sballato dalla scala)
initialPositionRef.current = obj.position.clone()

// Interpolava tra coordinate diverse
obj.position.lerpVectors(localStart, localEnd, t)
```

**Dopo** (✅ CORRETTO):
```javascript
// 1. Salva posizioni WORLD all'avvio
initialPositionRef.current = objects.map(obj => {
  const worldPos = new THREE.Vector3()
  obj.getWorldPosition(worldPos)
  return worldPos  // ← WORLD puro
})

// 2. Nel loop: converti WORLD→LOCAL prima del lerp
const worldStart = initialPositionRef.current[index].clone()
const localStart = obj.parent.worldToLocal(worldStart.clone())

const offsetWorld = initialPositionRef.current[index].clone().sub(initialPositionRef.current[0])
const worldEndThis = worldEnd.clone().add(offsetWorld)
const localEndThis = obj.parent.worldToLocal(worldEndThis.clone())

// 3. Interpola 100% LOCAL
obj.position.lerpVectors(localStart, localEndThis, clampedProgress)
```

**Risultato atteso**:
- Coordinate LOCAL nell'ordine di ±0.3m (non centinaia!)
- Movimento fluido e matematicamente corretto

### Fix 2: ROTATION - Trova parent NON scalato

**Prima** (❌ SBAGLIATO):
```javascript
const parent = firstObject.parent  // scale x7!
const pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
parent.add(pivotGroup)  // Pivot su nodo scalato
```

**Dopo** (✅ CORRETTO):
```javascript
// 1. Log diagnostici completi
console.log('parent.scale:', parent.scale)  // [7.000, 7.000, 7.000]
console.log('parent.name:', parent.name)

// 2. Risali gerarchia fino a nodo con scale 1x
let referenceNode = parent
const unitScale = new THREE.Vector3(1, 1, 1)

while (referenceNode && !referenceNode.scale.equals(unitScale)) {
  console.log(`⚠️ ${referenceNode.name} ha scale ${referenceNode.scale.x}x - risalgo...`)
  referenceNode = referenceNode.parent
}

// 3. Converti su nodo CORRETTO
referenceNode.updateWorldMatrix(true, false)
const pivotLocalPos = referenceNode.worldToLocal(pivotWorldPos.clone())

// 4. Aggiungi pivot al referenceNode
referenceNode.add(pivotGroup)
```

**Risultato atteso**:
- `pivotLocalPos` nell'ordine di ±0.3m
- Rotazione attorno al punto corretto

---

## 🧪 Test e Validazione

### Test 1: Animazione POSITION (tasto K in Camera)

**Prima del fix**:
```
LOCAL Start: [-0.631, -0.109, 0.220]
LOCAL End:   [-27.384, 41.762, 0.000]  ← Centinaia!
[50%] Pos LOCAL: [5.208, 52.612, 0.000]
```

**Dopo il fix** (atteso):
```
LOCAL Start: [-0.090, -0.016, 0.031]  ← Decimi!
LOCAL End:   [-0.184, -0.016, 0.063]
[50%] Pos LOCAL: [-0.137, -0.016, 0.047]
```

### Test 2: Animazione ROTATION

**Prima del fix**:
```
Pivot ROTATION (world): [-1.592, 0.627, 0.075]
parent.scale: [7.000, 7.000, 7.000]
Pivot local pos: [-57.64, 78.16, 73.59]  ← Esplosivo!
```

**Dopo il fix** (atteso):
```
Pivot ROTATION (world): [-1.592, 0.627, 0.075]
⚠️ PIVOT_Comodino ha scale [7.0x] - risalgo gerarchia...
→ Nodo superiore: Scene, scale: [1.0x]
✅ Parent corretto trovato: Scene
Pivot local pos: [-1.592, 0.627, 0.075]  ← Corretto!
```

---

## 📋 Criterio di Validazione

**Pivot corretto** se:
- `pivotLocalPos` nell'ordine di grandezza del mesh
- Es: anta larga 0.6m → pivot X ≈ ±0.3m
- **Mai decine/centinaia** a meno che il modello non lo giustifichi

**Animazione corretta** se:
- Coordinate LOCAL rimangono < 10 durante tutta l'animazione
- Offset tra oggetti preservati (±0.5m costante)
- Il comodino mantiene la forma (gruppo rigido)

---

## 🎯 Domande Tecniche Risolte

### Q1: In che spazio sono config.pivotX/Y/Z?
**R**: ✅ Coordinate **WORLD** pure (da `raycaster.intersect()` su geometria finale)

### Q2: Quando vengono calcolati rispetto alla scale finale?
**R**: ✅ **DOPO** la scale del modello (geometria già renderizzata)

### Q3: Il parent usato per worldToLocal è corretto?
**R**: ❌ Era il parent scalato x7 → **fix**: risali fino a parent con scale 1x

### Q4: Bounding box: pre o post transform?
**R**: ✅ NON viene usato bbox (solo raycaster diretto)

### Q5: Validazione finale
**R**: ✅ Criterio: pivotLocalPos deve essere nell'ordine del mesh (±0.3m)

---

## 📝 Note Tecniche

### Perché salvare WORLD e non LOCAL?

Dopo il cleanup del pivot ROTATION, le posizioni LOCAL degli oggetti sono sballate perché il parent ha `scale x7`. Salvando WORLD:
- Abbiamo coordinate assolute stabili
- Convertiamo a LOCAL solo al momento del lerp
- Evitiamo accumulo di errori

### Perché risalire la gerarchia?

Il pivot deve essere nel **transform space** degli oggetti che ruotano. Se il parent ha scala, `worldToLocal()` moltiplica le coordinate. Risalendo a un nodo con `scale 1x`, manteniamo le coordinate corrette.

---

## 🚀 Prossimi Passi

1. **Testare in Browser**: Premi K in Camera
2. **Verificare Log**: Cerca i pattern corretti sopra
3. **Validare Visivamente**: Il comodino deve muoversi fluidamente
4. **Confermareordinamento**: Pivot deve essere ~±0.3m, non decine

---

**Status**: ✅ Fix implementato, pronto per test utente
