# 🎯 PATTERN "ANCORA MATEMATICA" - Nodo Neutro ROOT

## 🧠 **CONCETTO FONDAMENTALE**

Per animazioni di **traslazione** (posizione) in gerarchie complesse, serve un **nodo neutro** che isola il movimento dalla gerarchia instabile del parent.

### **Metafora:**
```
🚢 Barca (pentola) legata a ⚓ ancora (root)
    
Anche se il mare (parent con scale/offset) si muove,
l'ancora resta ferma nel fondale (spazio coordinate stabile)
```

---

## ❌ **PROBLEMA: Gerarchia Instabile**

### **Setup Originale (BUGGY):**
```
[KitchenModel]
  └─ [Cucina_Mesh (con scale/offset variabili)]
       └─ [PENTOLA] ← Anima direttamente
           ↓
       Coordinate locali influenzate da parent
       targetLocal può "derivare" durante animazione
```

### **Sintomi:**
- ✅ I numeri sono corretti
- ✅ Il calcolo è giusto
- ❌ Ma la pentola non va dove dovrebbe
- ❌ Oppure "deriva" durante il movimento

**Causa:** Il parent ha transformazioni (scale, offset) che rendono lo spazio coordinate **non stabile** per animazioni.

---

## ✅ **SOLUZIONE: Nodo Neutro ROOT**

### **Gerarchia Corretta:**
```
[KitchenModel]
  └─ [Cucina_Mesh (scale/offset vari)]
       └─ [PENTOLA_ROOT] ← Group puro (ANCORA)
            └─ [PENTOLA] ← Mesh a (0,0,0) locale
```

### **Proprietà ROOT:**
- ✅ **Group puro** (identità: no scale, no rotation, no offset)
- ✅ **Stesso parent** del target
- ✅ **Spazio coordinate stabile**
- ✅ Pentola child sempre a (0,0,0) locale

---

## 🔧 **IMPLEMENTAZIONE**

### **1. Creazione ROOT nel Setup:**

```javascript
// In useEffect setup

// Trova l'oggetto da animare
const pentola = scene.getObjectByName('PENTOLA')
if (!pentola) return

// 🔧 CREA NODO NEUTRO ROOT
const pentolaRoot = new THREE.Group()
pentolaRoot.name = `${pentola.name}_ROOT`

// Salva riferimenti originali
const originalParent = pentola.parent
const originalPosition = pentola.position.clone()

// Costruisci gerarchia stabile: parent → root → pentola
pentolaRoot.position.copy(originalPosition)
originalParent.add(pentolaRoot)
pentola.position.set(0, 0, 0)  // Mesh a origine locale
pentolaRoot.add(pentola)

console.log('✅ Gerarchia ROOT creata')
```

### **2. Calcolo Target Deterministico:**

```javascript
// Calcola posizione target
const targetWorldPos = new THREE.Vector3()
targetObject.getWorldPosition(targetWorldPos)

// 🔥 CHIAVE: Forza aggiornamento matrice PRIMA di worldToLocal
pentolaRoot.parent.updateWorldMatrix(true, false)

// Converti in coordinate locali del parent del ROOT
const targetLocal = pentolaRoot.parent.worldToLocal(targetWorldPos.clone())

// Ora targetLocal è DETERMINISTICO e STABILE
```

### **3. Animazione (RESTA IDENTICA!):**

```javascript
// useFrame - anima il ROOT invece della mesh

useFrame((_, delta) => {
  const rootPos = pentolaRoot.position  // ← Root position
  const target = targetLocal
  
  const distanza = rootPos.distanceTo(target)
  const lerpFactor = Math.min(1, speed * delta / distanza)
  
  if (lerpFactor >= 0.95 || distanza < 0.02) {
    rootPos.copy(target)  // Snap finale
    return
  }
  
  rootPos.lerp(target, lerpFactor)  // ← Anima il root!
})
```

---

## 🧠 **PERCHÉ FUNZIONA**

### **Stabilità Matematica:**

```
pentolaRoot.parent === targetLocal.parent
         ↓
Entrambi nello STESSO spazio di coordinate
         ↓
lerp(rootPos, targetLocal) è STABILE
         ↓
Nessuna deriva, nessuna interferenza
```

### **Confronto:**

| Aspetto | SENZA Root | CON Root |
|---------|------------|----------|
| Spazio coordinate | Instabile (parent con scale) | Stabile (root puro) |
| Target validity | Può derivare | Sempre valido |
| Precisione | Dipende da parent | Deterministica |
| Robustezza | Fragile | Solida |

---

## 📐 **DETTAGLI TECNICI**

### **`updateWorldMatrix(true, false)`**

```javascript
pentolaRoot.parent.updateWorldMatrix(
  true,   // updateParents: aggiorna anche i parent nella catena
  false   // updateChildren: NON serve aggiornare i children
)
```

**Perché serve:**
- In React Three Fiber con async loading
- La `matrixWorld` può non essere aggiornata al momento del setup
- Forzare l'update garantisce conversioni coordinate **deterministiche**

**Senza update:**
```
Frame 1: GLB caricato
Frame 2: Scene graph costruito
Frame 3: useEffect setup ← matrixWorld VECCHIA!
         ↓
    worldToLocal() usa matrice sbagliata
         ↓
    targetLocal ERRATO
```

**Con update:**
```
pentolaRoot.parent.updateWorldMatrix(true, false)
         ↓
    Matrice world AGGIORNATA SUBITO
         ↓
    worldToLocal() CORRETTO
         ↓
    targetLocal PRECISO
```

---

## 🎨 **VANTAGGI**

1. ✅ **Stabilità matematica** - Spazio coordinate coerente
2. ✅ **Nessuna deriva** - Target resta valido per tutta l'animazione
3. ✅ **Codice pulito** - useFrame non cambia
4. ✅ **Deterministico** - updateWorldMatrix previene race conditions
5. ✅ **Riutilizzabile** - Pattern per qualsiasi oggetto
6. ✅ **Debug facile** - Root ha sempre coordinate "pulite"
7. ✅ **Performance** - Nessun overhead (Group è leggero)

---

## 🚀 **PATTERN GENERICO RIUTILIZZABILE**

### **Template per Qualsiasi Oggetto:**

```javascript
/**
 * Pattern generico per animare qualsiasi oggetto con gerarchia stabile
 */
function createStableAnimationRoot(mesh) {
  // 1. Crea root neutro
  const root = new THREE.Group()
  root.name = `${mesh.name}_ROOT`
  
  // 2. Salva riferimenti
  const parent = mesh.parent
  const originalPos = mesh.position.clone()
  
  // 3. Riorganizza gerarchia
  root.position.copy(originalPos)
  parent.add(root)
  mesh.position.set(0, 0, 0)
  root.add(mesh)
  
  return root
}

/**
 * Calcola target con matrice aggiornata (deterministico)
 */
function calculateStableTarget(root, targetWorldPos) {
  // Forza update matrice
  root.parent.updateWorldMatrix(true, false)
  
  // Converti in coordinate locali stabili
  return root.parent.worldToLocal(targetWorldPos.clone())
}

/**
 * Anima il root (non il mesh!)
 */
function animateRoot(root, targetPos, delta, speed = 2.0) {
  const currentPos = root.position
  const distance = currentPos.distanceTo(targetPos)
  const lerpFactor = Math.min(1, speed * delta / distance)
  
  // Snap se molto vicino (evita overshoot)
  if (lerpFactor >= 0.95 || distance < 0.02) {
    currentPos.copy(targetPos)
    return true  // Animazione completata
  }
  
  currentPos.lerp(targetPos, lerpFactor)
  return false  // Ancora in movimento
}
```

---

## 🎯 **APPLICAZIONI**

Questo pattern è **fondamentale** per:

### **1. Oggetti Pick & Place:**
```javascript
// Pentola: mobile → fornelli
const pentolaRoot = createStableAnimationRoot(pentola)
animateRoot(pentolaRoot, fornelliPos, delta)
```

### **2. Porte con Traslazione:**
```javascript
// Porta scorrevole
const portaRoot = createStableAnimationRoot(porta)
animateRoot(portaRoot, posizioneAperta, delta)
```

### **3. Cassetti:**
```javascript
// Cassetto: chiuso → aperto
const cassettoRoot = createStableAnimationRoot(cassetto)
animateRoot(cassettoRoot, posizioneEstratta, delta)
```

### **4. Oggetti Controllati ESP32/MQTT:**
```javascript
// Oggetto comandato via MQTT
const oggettoRoot = createStableAnimationRoot(oggetto)
// Quando arriva comando MQTT
animateRoot(oggettoRoot, nuovaPosizione, delta)
```

### **5. Animazioni Complesse:**
```javascript
// Oggetto con waypoints multipli
const root = createStableAnimationRoot(oggetto)
waypoints.forEach(wp => {
  animateRoot(root, wp, delta)
})
```

---

## 📊 **CONFRONTO: Prima vs Dopo**

### **PRIMA (Instabile):**
```javascript
// ❌ Anima direttamente la mesh
pentola.position.lerp(target, factor)

Problemi:
- Coordinate influenzate da parent
- Target può derivare
- Comportamento imprevedibile
- Difficile da debuggare
```

### **DOPO (Stabile):**
```javascript
// ✅ Anima il root neutro
pentolaRoot.position.lerp(target, factor)

Vantaggi:
- Coordinate stabili
- Target sempre valido
- Comportamento prevedibile
- Facile da debuggare
```

---

## 💡 **LESSON LEARNED**

### **Regola d'Oro:**

> **Per animazioni di traslazione in gerarchie complesse:**
> 
> 1. Crea un **nodo neutro ROOT** (Group)
> 2. Metti il mesh come **child del root** a (0,0,0)
> 3. **Anima il root**, non il mesh
> 4. Usa **updateWorldMatrix()** per determinismo

### **Quando NON Serve:**

- ✅ Mesh a livello Scene (parent = Scene)
- ✅ Parent senza transformazioni
- ✅ Animazioni di rotazione sul posto
- ✅ Animazioni di scale

### **Quando SERVE SEMPRE:**

- ❌ Parent con scale non uniforme
- ❌ Parent con offset/transformazioni
- ❌ Gerarchia multi-livello
- ❌ Async loading (React Three Fiber)
- ❌ Oggetti importati da GLB/GLTF

---

## 🔍 **DEBUG & VERIFICA**

### **Come Verificare che Funziona:**

```javascript
console.log('📊 Verifica ROOT:')
console.log('  Root name:', pentolaRoot.name)
console.log('  Root parent:', pentolaRoot.parent.name)
console.log('  Root pos:', pentolaRoot.position)
console.log('  Mesh pos (locale):', pentola.position)  // Deve essere (0,0,0)
console.log('  Target pos:', targetLocal)

// Durante animazione
console.log('  Distanza da target:', pentolaRoot.position.distanceTo(targetLocal))
```

### **Checklist:**

- [ ] Pentola.position = (0, 0, 0)
- [ ] PentolaRoot.position = posizione originale pentola
- [ ] PentolaRoot.parent = parent originale pentola
- [ ] Target calcolato dopo updateWorldMatrix()
- [ ] Animazione su pentolaRoot.position (non pentola.position)

---

## 📚 **RIFERIMENTI**

### **File Implementati:**
- ✅ `src/hooks/usePentolaAnimation.js` - Implementazione completa
- ✅ `PENTOLA_OVERSHOOT_FIX.md` - Fix overshoot lerp
- ✅ `PATH_VISUALIZATION_GUIDE.md` - Sistema waypoints futuro

### **Pattern Correlati:**
- `useAnimatedDoor.js` - Usa pivot per rotazioni
- `useAntaCucina.js` - Rotazione ante mobili
- `useCancello.js` - Animazione cancello

### **Documentazione Three.js:**
- [Object3D.updateWorldMatrix()](https://threejs.org/docs/#api/en/core/Object3D.updateWorldMatrix)
- [Object3D.worldToLocal()](https://threejs.org/docs/#api/en/core/Object3D.worldToLocal)
- [Group](https://threejs.org/docs/#api/en/objects/Group)

---

**Implementato:** 18/12/2025  
**File:** `src/hooks/usePentolaAnimation.js`  
**Pattern:** Ancora Matematica (Mathematical Anchor)  
**Status:** ✅ PRODUZIONE  
**Riutilizzabile:** ✅ SÌ - Pattern generico per qualsiasi traslazione
