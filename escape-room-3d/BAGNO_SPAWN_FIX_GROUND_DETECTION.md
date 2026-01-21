# 🔧 FIX SPAWN BAGNO - Ground Detection Reset

**Data**: 10 gennaio 2026  
**Problema**: Player spawna sempre nello stesso punto nonostante coordinate corrette  
**Soluzione**: Disabilitata ground detection per bagno

---

## 🐛 Il Bug

### Sintomi
- ✅ Coordinate caricate correttamente da database: `{x: 1.3, y: 0, z: 2.6}`
- ✅ Player posizionato inizialmente alle coordinate corrette
- ❌ Dopo ~5 secondi player torna sempre allo stesso punto
- ❌ Player non si muove o si blocca

### Causa Root
Il **ground detection system** in `useFPSControls.js` resettava la posizione Y dopo il periodo di spawn protection (5 secondi):

```javascript
// useFPSControls.js - linea ~1150
if (!hasSpawnedRef.current && hasCollisions) {
  const correctedY = detectGround(eyePosition, playerRoot.position.y)
  
  if (correctedY !== null) {
    playerRoot.position.y = newY  // ← QUI resettava la Y!
  }
}
```

### Perché la Cucina Funzionava?
La cucina aveva **già disabilitato la gravità** (`disableGravity: true`), quindi il ground detection non si attivava mai.

---

## ✅ Soluzione Applicata

### 1. Modifica BathroomScene.jsx

Aggiunto parametro `disableGravity: true` alla chiamata di `useFPSControls`:

```javascript
// Prima (BUGGY)
useFPSControls(
  collisionObjects,
  mobileInput,
  groundObjects,
  boundaryLimits,
  initialPosition,
  initialYaw,
  eyeHeight,
  scaledCollisionRadius,
  scaledPlayerHeight,
  MOVE_SPEED
)

// Dopo (FIXED)
useFPSControls(
  collisionObjects,
  mobileInput,
  groundObjects,
  boundaryLimits,
  initialPosition,
  initialYaw,
  eyeHeight,
  scaledCollisionRadius,
  scaledPlayerHeight,
  MOVE_SPEED,
  true // ✅ DISABLE GRAVITY per bagno (come cucina)
)
```

### 2. Rebuild Frontend Docker

```bash
docker-compose restart frontend
```

---

## 🎯 Risultato Atteso

- ✅ Player spawna alle coordinate corrette: `(1.3, 0, 2.6)`
- ✅ Posizione Y **NON viene più resettata** dopo 5 secondi
- ✅ Player può **muoversi liberamente**
- ✅ Ground detection **disabilitata** (come cucina)

---

## 📝 Note Tecniche

### Perché Disabilitare la Gravità?

Il ground detection è progettato per scene "aperte" dove il player può cadere (es. esterni). Per scene interne chiuse (cucina, bagno) con spawn point precisi, la gravità causa più problemi che benefici:

1. **Reset indesiderato**: Corregge la Y anche quando non serve
2. **Race condition**: Se le collision mesh non sono pronte, il raycast fallisce
3. **Snap improvviso**: Player viene "tirato" verso il pavimento rilevato

### Alternative Considerate

1. ❌ **Aumentare spawn protection**: Problema rimane, solo ritardato
2. ❌ **Modificare detectGround()**: Troppo invasivo, impatta tutte le scene
3. ✅ **Disabilitare gravità per scene interne**: Soluzione pulita e già usata

---

## 🔗 File Modificati

- `src/components/scenes/BathroomScene.jsx` - Aggiunto `disableGravity: true`

## 🔗 File Correlati

- `src/hooks/useFPSControls.js` - Sistema ground detection
- `fix-spawn-bagno-IMPROVED.sql` - Coordinate database
- `src/utils/cameraPositioning.js` - Caricamento spawn

---

## ✅ Checklist Testing

- [ ] Aprire bagno da link diretto (`/room/bagno?session=999`)
- [ ] Verificare che player spawni a `(1.3, 0, 2.6)`
- [ ] Attendere 10 secondi (oltre spawn protection)
- [ ] Verificare che player **NON si teletrasporti**
- [ ] Verificare che player **possa muoversi** con WASD
- [ ] Pulire cache browser (Ctrl+Shift+R)
- [ ] Ripetere test

---

## 🚀 Prossimi Passi

Se anche **Camera** e **Soggiorno** hanno problemi di spawn, applicare lo stesso fix:

```javascript
useFPSControls(
  // ... parametri ...
  true // disableGravity
)
```
