# 🔍 PENTOLA DEBUG - Guida Test DevTools

## 📋 Prerequisiti

1. ✅ `window.__DEBUG.pentola` esposta nel codice
2. ✅ Frontend ribuildata con fix
3. ✅ Browser cache pulita (Ctrl+Shift+R)
4. ✅ DevTools aperte (F12) su http://localhost/cucina

---

## 🧪 TEST 1: Verifica Esposizione Pentola

Nella console DevTools, digita:

```javascript
__DEBUG.pentola
```

### ✅ Risultato Atteso
Dovresti vedere un oggetto THREE.Group o THREE.Object3D con informazioni sulla pentola.

### ❌ Se restituisce `undefined`
- La pentola NON è stata trovata dal sistema
- Verifica che `PentolaFix` si sia eseguito correttamente
- Controlla log console per messaggi `[DEBUG] Pentola esposta`

---

## 🧪 TEST 2: Forza Scala + Materiale Rosso

Questo test **FORZA** la visibilità della pentola ignorando scala e materiale SH3D:

```javascript
const p = __DEBUG.pentola

p.traverse(o => {
  if (o.isMesh) {
    o.geometry.computeBoundingBox()
    o.geometry.computeBoundingSphere()

    o.scale.setScalar(50)  // ← Scala ENORME (50x)
    o.material = new THREE.MeshBasicMaterial({
      color: 0xff0000,  // Rosso brillante
      wireframe: false
    })

    o.visible = true
    o.frustumCulled = false
  }
})

p.updateMatrixWorld(true)

console.log('✅ Pentola forzata a scala 50x + materiale rosso')
```

### 📊 Interpretazione Risultati

#### ✅ SE ORA LA VEDI (pentola rossa gigante)
**→ Problema = SweetHome3D export**
- La mesh ESISTE ma è microscopica
- Il materiale originale è trasparente/invisibile
- **Soluzione**: Applicare scala + materiale fisso nel codice

#### ❌ SE NON LA VEDI ANCORA
**→ Problema = Geometria degenerata**
- La mesh ha 0 vertici o triangoli zero-area
- Impossibile da rendere (anche forzando tutto)
- **Soluzione**: Re-esportare oggetto da SweetHome3D

---

## 🧪 TEST 3: Cubo Verde Marker

Questo test posiziona un **cubo verde test** esattamente dove dovrebbe essere la pentola:

```javascript
const box = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)

box.position.copy(__DEBUG.pentola.getWorldPosition(new THREE.Vector3()))
__DEBUG.scene.add(box)

console.log('✅ Cubo verde marker aggiunto alla posizione pentola')
```

### 📊 Interpretazione Risultati

#### 🟢 CUBO VISIBILE, pentola NO
**→ Conferma**: Problema è la pentola stessa
- Position corretta
- Rendering funziona
- Solo la pentola ha problemi di geometria/materiale

#### ❌ CUBO NON VISIBILE
**→ Camera/Position problema**
- Posizione errata (fuori frustum)
- Camera non configurata correttamente
- **Improbabile** dopo il fix PerspectiveCamera

---

## 🧪 TEST 4: Ispeziona Geometria Pentola

Controlla se la geometria ha vertici validi:

```javascript
const p = __DEBUG.pentola

p.traverse(o => {
  if (o.isMesh) {
    const geo = o.geometry
    console.log('🔍 MESH:', o.name)
    console.log('  Vertici:', geo.attributes.position?.count || 0)
    console.log('  BoundingBox:', geo.boundingBox)
    console.log('  BoundingSphere:', geo.boundingSphere)
    console.log('  Scale:', o.scale)
    console.log('  Visible:', o.visible)
    console.log('  Material:', o.material.type)
  }
})
```

### 📊 Valori Sospetti

- ⚠️ `Vertici: 0` → Geometria vuota (degenerata)
- ⚠️ `BoundingBox: null` → Geometria non calcolata
- ⚠️ `Scale: (0.001, 0.001, 0.001)` → Mesh microscopica
- ⚠️ `Visible: false` → Nascosta manualmente
- ⚠️ `Material: opacity=0` → Trasparente

---

## 🎯 DECISIONE FINALE

### 🔧 Se TEST 2 LA MOSTRA → Applica Fix Permanente

Modifica `PentolaFix` in `KitchenScene.jsx`:

```javascript
// 🔥 FIX PERMANENTE: Scala + Materiale forzati
movable.traverse((n) => {
  if (n.isMesh) {
    n.geometry.computeBoundingBox()
    n.geometry.computeBoundingSphere()
    
    n.scale.setScalar(5)  // Scala ragionevole (non 50!)
    n.material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.8,
      roughness: 0.2
    })
    
    n.visible = true
    n.frustumCulled = false
  }
})
```

### 🚫 Se TEST 2 NON LA MOSTRA → Re-esporta da SweetHome3D

La mesh è corrotta. Passi necessari:

1. Apri file `.sh3d` in SweetHome3D
2. Seleziona oggetto pentola
3. Re-esporta come OBJ/GLTF
4. Sostituisci il modello nel progetto
5. Ribuilda frontend

---

## 📝 Checklist Test

- [ ] Apri http://localhost/cucina
- [ ] Clear cache browser (Ctrl+Shift+R)
- [ ] Apri DevTools (F12)
- [ ] Esegui TEST 1: Verifica `__DEBUG.pentola`
- [ ] Esegui TEST 2: Forza scala + materiale
- [ ] Esegui TEST 3: Cubo verde marker
- [ ] Esegui TEST 4: Ispeziona geometria
- [ ] Annota risultati in questo documento
- [ ] Decidi fix da applicare

---

## 🔗 Collegamenti Utili

- [PentolaFix Component](./src/components/scenes/KitchenScene.jsx#L1800)
- [Three.js Geometry Docs](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [SweetHome3D Export Guide](http://www.sweethome3d.com/documentation.jsp)

---

**Ultima modifica**: 12/01/2026 14:07
**Stato**: Pronto per test
