# 🔧 FIX: Spawn Position Timing Issue

## 🐛 Problema Identificato

Le scene (tranne Esterno) usano `useMemo` per calcolare spawn position:
```javascript
const safeSpawnPosition = useMemo(() => {
  if (spawnData?.position) return spawnData.position
  if (modelRef.spawnPoint) return modelRef.spawnPoint
  if (boundaryLimits) return roomCenter
  return fallback
}, [spawnData, modelRef.spawnPoint, boundaryLimits])
```

**PROBLEMA**: Race condition tra:
1. `spawnData` (async, arriva dopo ~100ms)
2. `boundaryLimits` (calcolato in useEffect quando modello è pronto)
3. `useMemo` (viene eseguito PRIMA che entrambi siano pronti)

## ✅ Soluzione (Pattern EsternoScene)

EsternoScene risolve tutto DENTRO lo stesso `useEffect`:

```javascript
const [spawnPosition, setSpawnPosition] = useState(null)
const [initialYaw, setInitialYaw] = useState(0)

useEffect(() => {
  if (!modelRef.current) return
  
  // Calcola bounding box
  const box = new THREE.Box3().setFromObject(modelRef.current)
  const limits = { minX: box.min.x, ... }
  
  // PRIORITÀ 1: Async data
  if (spawnData?.position) {
    setSpawnPosition(spawnData.position)
    setInitialYaw(spawnData.yaw || 0)
  } else {
    // PRIORITÀ 2-4: Fallback calcolati QUI
    const fallbackPos = calculateFallback(box, modelRef.spawnPoint, limits)
    setSpawnPosition(fallbackPos)
    setInitialYaw(0)
  }
  
  setBoundaryLimits(limits)
}, [modelRef, spawnData])  // <-- spawnData in dependency!
```

**VANTAGGI**:
1. ✅ Tutto sincronizzato nello stesso effect
2. ✅ `spawnData` è nella dependency, quindi quando arriva ricalcola
3. ✅ Non serve useMemo, state diretto
4. ✅ Niente race conditions

## 📝 Scene da Fixare

- [ ] KitchenScene.jsx
- [ ] LivingRoomScene.jsx  
- [ ] BathroomScene.jsx
- [ ] BedroomScene.jsx
- [x] EsternoScene.jsx (già corretto)

## 🎯 Action Plan

1. Rimuovere `useMemo` per spawn position e yaw
2. Aggiungere state: `const [spawnPosition, setSpawnPosition] = useState(null)`
3. Spostare calcolo spawn DENTRO useEffect del bounding box
4. Aggiungere `spawnData` alle dependencies
5. Condizionare render FPSController a `spawnPosition !== null`
