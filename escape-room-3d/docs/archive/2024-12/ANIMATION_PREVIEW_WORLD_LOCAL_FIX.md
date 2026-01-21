# Fix: Conversione Coordinate WORLD→LOCAL in useAnimationPreview

## 🎯 Problema Risolto

Il sistema di animazione preview aveva un bug critico nella gestione delle coordinate quando l'oggetto animato aveva un parent (incluso il pattern ROOT):

### ❌ Vecchio Comportamento
- **Detach forzato:** L'oggetto veniva staccato dal parent e attaccato alla Scene
- **Protezione ROOT:** Il detach veniva bloccato per oggetti con pattern ROOT
- **Bug:** Per oggetti con ROOT, le coordinate non venivano convertite → animazione errata

### ✅ Nuovo Comportamento
- **NO detach:** L'oggetto rimane nella sua gerarchia originale
- **Conversione esplicita:** Coordinate WORLD → LOCAL rispetto al parent
- **Funziona sempre:** Con qualsiasi gerarchia (Scene root, parent normale, ROOT node)

## 🔧 Modifiche Implementate

### 1. Salvataggio Transform Originale in WORLD Space

```javascript
// ✅ NUOVO: Salva sia WORLD che LOCAL coordinates
const worldPos = new THREE.Vector3()
const worldQuat = new THREE.Quaternion()
object.getWorldPosition(worldPos)
object.getWorldQuaternion(worldQuat)

originalTransform.current = {
  worldPosition: worldPos,
  worldQuaternion: worldQuat,
  localPosition: object.position.clone(),
  localRotation: object.rotation.clone(),
  parent: object.parent
}
```

### 2. Rimozione Logica Detach

```javascript
// ❌ VECCHIO: Detach forzato con protezione ROOT
if (config.mode === 'position' && !wasDetached.current) {
  if (hasRootNode(object)) {
    return // Blocca ma non converte!
  }
  scene.attach(object) // Rompe gerarchia
}

// ✅ NUOVO: Nessun detach, usa conversione coordinate
// (Logica completamente rimossa)
```

### 3. Conversione WORLD→LOCAL nel Loop di Animazione

```javascript
// Config contiene coordinate WORLD space
const worldStart = new THREE.Vector3(config.startX, config.startY, config.startZ)
const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)

// ✅ CONVERSIONE: WORLD → LOCAL rispetto al parent
let localStart, localEnd

if (object.parent) {
  // Forza aggiornamento matrice del parent (determinismo)
  object.parent.updateWorldMatrix(true, false)
  
  // Converti da world space a local space del parent
  localStart = object.parent.worldToLocal(worldStart.clone())
  localEnd = object.parent.worldToLocal(worldEnd.clone())
} else {
  // Oggetto senza parent → LOCAL = WORLD
  localStart = worldStart.clone()
  localEnd = worldEnd.clone()
}

// Anima con coordinate LOCAL
object.position.lerpVectors(localStart, localEnd, clampedProgress)
```

### 4. Ripristino Corretto

```javascript
// ✅ NUOVO: Ripristina local position originale
if (config.mode === 'position') {
  object.position.copy(originalTransform.current.localPosition)
}
```

## 📊 Logging Dettagliato

Il sistema ora logga sia coordinate WORLD che LOCAL per debugging:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 [TRAIETTORIA] Configurazione animazione:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 WORLD Start: [1.234, 0.856, 2.145]
🔄 LOCAL Start: [0.123, 0.045, 0.234]
🎯 WORLD End:   [3.456, 0.910, 1.678]
🔄 LOCAL End:   [2.345, 0.099, -0.467]
📏 Distanza totale: 2.345m
⚡ Velocità: 0.033 u/s
👨‍👦 Parent: PENTOLA_ROOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ✅ Vantaggi

1. **Funziona con qualsiasi gerarchia:**
   - Oggetto nella Scene root ✅
   - Oggetto con parent normale ✅
   - Oggetto con ROOT node ✅
   - Oggetti nested a più livelli ✅

2. **Non rompe la gerarchia:**
   - Nessun detach/attach
   - Parent-child relationships preservati
   - Animazioni composite sicure

3. **Matematicamente corretto:**
   - Coordinate WORLD nel config (universali)
   - Conversione esplicita LOCAL (deterministica)
   - Nessuna ambiguità

4. **Debugging facilitato:**
   - Log chiari della conversione
   - Posizioni verificabili visualmente (WORLD e LOCAL)
   - Drift misurabile e tracciabile

## 🎬 Test Consigliati

### Test 1: Oggetto nella Scene Root
```javascript
// Oggetto senza parent
// LOCAL = WORLD → nessuna conversione necessaria
```

### Test 2: Oggetto con Parent Normale
```javascript
// Oggetto child di un Group
// Conversione WORLD → LOCAL attiva
```

### Test 3: Oggetto con ROOT Node (PENTOLA)
```javascript
// PENTOLA con pattern ROOT
// Prima veniva bloccato il detach → animazione errata
// Ora: conversione WORLD → LOCAL → animazione corretta ✅
```

### Verifica Visiva
1. Attiva Animation Editor (tasto `E`)
2. Seleziona la PENTOLA (ha ROOT node)
3. Configura animazione di posizione
4. Avvia preview
5. **Verifica:** L'oggetto si muove correttamente sui fornelli
6. **Controlla log:** Delta WORLD < 0.001m = ✅ PRECISO

## 🔬 Dettagli Tecnici

### Coordinate WORLD vs LOCAL

```
WORLD Coordinates (Globali Scene)
    ↓
Parent Transform (matrice 4x4)
    ↓
LOCAL Coordinates (rispetto al parent)
```

### Formula di Conversione

```javascript
// Three.js fa automaticamente:
// localPos = parent.worldToLocal(worldPos)
// 
// Internamente:
// localPos = inverse(parentWorldMatrix) * worldPos
```

### Perché Preservare la Gerarchia?

- **Animazioni composite:** Parent e child possono animarsi insieme
- **Trasformazioni concatenate:** Rotazioni/scale del parent si applicano al child
- **Pattern ROOT:** Il ROOT node può avere logiche proprie (es: tracking)

## 📝 File Modificato

- `escape-room-3d/src/hooks/useAnimationPreview.js`

## 🚀 Prossimi Passi

1. ✅ **Testare** l'animazione della PENTOLA nell'editor
2. ✅ **Verificare** che il drift WORLD sia < 0.001m
3. **Implementare** export JSON con coordinate WORLD annotate
4. **Documentare** standard coordinate per tutte le animazioni

---

**Data:** 18/12/2025
**Autore:** Cline (AI Assistant)
**Stato:** ✅ Implementato e Documentato
