# 🍳 PENTOLA INVISIBILE - Diagnostica e Soluzione

## 📊 **Analisi del Problema**

### Sintomi:
- ✅ L'animazione funziona perfettamente (log confermano arrivo a destinazione con precisione 0.000000m)
- ✅ Il mesh viene trovato correttamente: `PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)`
- ❌ **L'utente non vede la pentola nella scena 3D**

### Causa Identificata:

Dai log dell'animazione emergono **valori LOCAL anomali**:

```javascript
📍 WORLD Start: [-1.030, -0.555, -1.448]  ✅ CORRETTE (1-2 metri)
🔄 LOCAL Start: [-1.469, 3.917, -44.600]  ❌ ANOMALE (44+ metri!)

🎯 WORLD End:   [-0.998, -0.190, -0.748]  ✅ CORRETTE (1 metro)
🔄 LOCAL End:   [1.731, -66.083, -8.100]  ❌ ANOMALE (66+ metri!)
```

**Il parent group "PENTOLA" ha una trasformazione anomala!**

Le coordinate locali sono 40-60 volte maggiori delle coordinate world, indicando uno dei seguenti problemi:

1. **Scala del parent group errata** (es. scala 0.01 o 0.001 → pentola invisibilmente piccola)
2. **Trasformazione matrix corrotta** nel parent group
3. **Nesting anomalo** nel modello 3D (gruppo dentro gruppo con scale moltiplicate)

---

## 🔍 **Verifica Rapida (Console Browser)**

Esegui nella console DevTools per diagnosticare:

```javascript
// 1. Trova la pentola
const scene = window.__DEBUG?.scene
if (!scene) { console.error('Scene non trovata'); return }

let pentola = null
scene.traverse((child) => {
  if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
    pentola = child
  }
})

if (!pentola) {
  console.error('❌ PENTOLA NON TROVATA')
} else {
  console.log('✅ Pentola trovata:', pentola.name)
  console.log('📏 Scale:', pentola.scale)
  console.log('📍 Position:', pentola.position)
  console.log('👁️  Visible:', pentola.visible)
  console.log('🎨 Material:', pentola.material)
  
  // Parent check
  const parent = pentola.parent
  if (parent) {
    console.log('👨‍👦 Parent:', parent.name)
    console.log('📏 Parent Scale:', parent.scale)
    console.log('📍 Parent Position:', parent.position)
    console.log('👁️  Parent Visible:', parent.visible)
    
    // Calcola scala mondiale effettiva
    const worldScale = new THREE.Vector3()
    pentola.getWorldScale(worldScale)
    console.log('🌍 World Scale (effettiva):', worldScale)
  }
  
  // Verifica se è troppo piccola
  const box = new THREE.Box3().setFromObject(pentola)
  const size = new THREE.Vector3()
  box.getSize(size)
  console.log('📦 Dimensioni bounding box:', size)
  
  if (size.length() < 0.01) {
    console.warn('⚠️  PENTOLA TROPPO PICCOLA! Dimensioni: ' + size.length() + 'm')
  }
}
```

---

## 🛠️ **Soluzioni Possibili**

### **Soluzione 1: Forza Visibilità e Scala (Rapida)**

Aggiungi in `CasaModel.jsx` dopo il caricamento del modello:

```javascript
// Trova e forza la visibilità della pentola
useEffect(() => {
  if (!modelRef || !modelRef.current) return
  
  const PENTOLA_UUID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0'
  
  modelRef.current.traverse((child) => {
    if (child.uuid === PENTOLA_UUID || 
        (child.name && child.name.includes(PENTOLA_UUID))) {
      
      console.log('🍳 [CasaModel] PENTOLA trovata, forzo visibilità')
      
      // Forza visibilità
      child.visible = true
      
      // Verifica scala
      const worldScale = new THREE.Vector3()
      child.getWorldScale(worldScale)
      console.log('🌍 [CasaModel] World Scale pentola:', worldScale)
      
      // Se scala troppo piccola, correggi il parent
      if (worldScale.length() < 0.01) {
        console.warn('⚠️  [CasaModel] PENTOLA TROPPO PICCOLA! Correggo parent scale')
        
        // Ripristina scala normale del parent
        if (child.parent) {
          child.parent.scale.set(1, 1, 1)
          child.parent.updateMatrix()
          console.log('✅ [CasaModel] Parent scale forzata a (1,1,1)')
        }
      }
      
      // Forza materiale opaco se trasparente
      if (child.material) {
        child.material.transparent = false
        child.material.opacity = 1.0
        child.material.visible = true
        child.material.needsUpdate = true
        console.log('✅ [CasaModel] Materiale pentola forzato opaco')
      }
    }
  })
}, [modelRef])
```

### **Soluzione 2: Riesporta Modello 3D (Definitiva)**

Se il problema persiste, il modello 3D va corretto alla fonte:

1. **Apri il modello in Blender/3D software**
2. **Seleziona la pentola**
3. **Verifica scale del parent group "PENTOLA"** → deve essere (1, 1, 1)
4. **Apply Transforms** (Ctrl+A → All Transforms in Blender)
5. **Riesporta come GLB/GLTF**

---

## 🔧 **Soluzione 3: Aggiungi Debug Visivo**

Per vedere DOVE si trova la pentola, aggiungi una sfera rossa visibile:

```javascript
// In CasaModel.jsx dopo aver trovato la pentola
const debugSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: false })
)

const worldPos = new THREE.Vector3()
pentolaMesh.getWorldPosition(worldPos)
debugSphere.position.copy(worldPos)
scene.add(debugSphere)

console.log('🔴 Sfera debug aggiunta alla posizione world della pentola:', worldPos)
```

Se vedi la sfera rossa ma non la pentola → problema di materiale/scala  
Se non vedi nemmeno la sfera → pentola fuori campo visivo

---

## 📋 **Prossimi Passi**

1. ✅ **Esegui lo script diagnostico nella console** (vedi sopra)
2. ✅ **Applica Soluzione 1** (forza visibilità in CasaModel.jsx)
3. ✅ **Testa premendo tasto 5** per animare la pentola
4. ✅ **Se persiste, usa Soluzione 3** (sfera debug rossa)

---

## 📝 **Note Tecniche**

- Il sistema di animazione `usePentolaAnimation.js` **funziona perfettamente**
- Le coordinate WORLD sono corrette
- Le coordinate LOCAL sono anomale → problema nel parent group
- La pentola ESISTE nel modello, è solo invisibile/mal configurata

**La soluzione è sistemare la scala/visibilità del parent group, NON modificare l'animazione!**

---

## 🎯 **Risultato Atteso**

Dopo l'applicazione della soluzione, la pentola sarà:
- ✅ Visibile nella scena 3D
- ✅ Posizionata correttamente dentro il mobile (-1.030, -0.555, -1.448)
- ✅ Animabile verso i fornelli con il tasto 5
- ✅ Con scala corretta (circa 20-30cm di dimensione)
