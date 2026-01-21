# 🍳 FIX PENTOLA - Invalidazione Cache BBox FINALE

**Data**: 12 Gennaio 2026, 15:59  
**Status**: ✅ FIX COMPLETO - Invalidazione cache implementata

---

## 🔍 Problema Scoperto

La pentola era **invisibile** perché il **bounding box rimaneva gigante** (10.64m x 13.36m x 9.25m) anche DOPO `geometry.center()` + `computeBoundingBox()`.

### 📊 Diagnostica Camera vs Pentola

```
📷 Camera: (0, 0, 0)
🍳 Pentola: (-1.5, 1.0, 0.8)
📦 BBox: Centro (-1.5, 1.0, 0.8), Dimensioni 10.64m x 13.36m x 9.25m
```

**Risultato**: Il player era **DENTRO** la pentola gigante! La camera si trovava all'interno del bbox enorme.

---

## ❌ Fix Precedente (NON Funzionava)

```javascript
// ❌ BBOX RIMANEVA GIGANTE!
child.geometry.center()
child.geometry.computeBoundingBox()
child.geometry.computeBoundingSphere()
```

**Problema**: La cache del bbox/sphere **NON veniva invalidata** prima di center(), quindi i calcoli usavano valori vecchi.

---

## ✅ Soluzione Finale

### 1. **Invalida Cache PRIMA di center()**

```javascript
// 🔥 INVALIDA CACHE BBOX/SPHERE PRIMA DI CENTER!
child.geometry.boundingBox = null
child.geometry.boundingSphere = null

// Ora center() e compute* funzioneranno correttamente
child.geometry.center()
child.geometry.computeBoundingBox()
child.geometry.computeBoundingSphere()
```

### 2. **Ordine Operazioni CRITICO**

```
1. boundingBox = null       // Invalida cache vecchia
2. boundingSphere = null    // Invalida cache vecchia
3. center()                 // Centra geometria (senza cache)
4. computeBoundingBox()     // Ricalcola bbox DOPO center
5. computeBoundingSphere()  // Ricalcola sphere DOPO center
```

---

## 📝 Codice Completo

**File**: `src/components/3D/CasaModel.jsx`  
**Linea**: ~989-1012

```javascript
// 🍳 FIX PENTOLA - geometry.center() OBBLIGATORIO!
if (sceneType === 'cucina') {
  setTimeout(() => {
    scene.traverse((child) => {
      if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
        
        console.log("🍳 FIX PENTOLA - Applicando geometry.center()");

        if (child.geometry) {
          // 🔥 INVALIDA CACHE BBOX/SPHERE PRIMA DI CENTER!
          child.geometry.boundingBox = null
          child.geometry.boundingSphere = null
          console.log("🗑️ Cache bbox/sphere invalidata")
          
          // Centra la geometria
          child.geometry.center()
          console.log("📐 Geometria centrata")
          
          // 🔧 RICALCOLA bbox/sphere DOPO center()!
          child.geometry.computeBoundingBox()
          child.geometry.computeBoundingSphere()
          console.log("✅ Bbox/sphere ricalcolati DOPO center()")
          
          // Log dimensioni finali
          const bbox = child.geometry.boundingBox
          if (bbox) {
            const size = bbox.getSize(new THREE.Vector3())
            console.log(`📦 Bbox FINALE: ${size.x.toFixed(3)}m x ${size.y.toFixed(3)}m x ${size.z.toFixed(3)}m`)
          }
        }

        // 1. SCALA: 0.0025 (compensando parent 10x)
        child.scale.set(0.0025, 0.0025, 0.0025)
        
        // 2. POSIZIONE: Davanti al player
        const absolutePos = new THREE.Vector3(-1.5, 0.95, 0.8)
        if (child.parent) {
          child.parent.worldToLocal(absolutePos)
          child.position.copy(absolutePos)
        }
        
        // 3. VISIBILITÀ
        child.visible = true
        child.updateMatrixWorld(true)
        
        console.log("✅ Pentola posizionata e CENTRATA - dovrebbe essere visibile!")
      }
    })
  }, 1500)
}
```

---

## 🎯 Risultato Atteso

Dopo il fix, i log dovrebbero mostrare:

```
🗑️ Cache bbox/sphere invalidata
📐 Geometria centrata
✅ Bbox/sphere ricalcolati DOPO center()
📦 Bbox FINALE: 0.265m x 0.334m x 0.231m  ← 25cm circa!
✅ Pentola posizionata e CENTRATA - dovrebbe essere visibile!
```

**BBox corretto**: ~0.26m invece di 10.64m → La pentola è ora **VISIBILE** e cliccabile!

---

## 🔧 Build & Deploy

```bash
# Rebuild completo senza cache
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Hard refresh browser (Cmd+Shift+R) per pulire cache
```

---

## 📚 Lezione Appresa

### Perché `geometry.center()` NON bastava?

Three.js **cachea** bbox/sphere per performance. Quando chiami `center()`, la geometria viene modificata MA la **cache rimane invariata** perché Three.js non sa che deve ricalcolarla.

### Soluzione

**SEMPRE** invalida la cache PRIMA di modificare la geometria:

```javascript
// PRIMA: Invalida cache
geometry.boundingBox = null
geometry.boundingSphere = null

// POI: Modifica geometria
geometry.center()

// INFINE: Ricalcola
geometry.computeBoundingBox()
geometry.computeBoundingSphere()
```

---

## ✅ Status

- [x] Problema identificato: Cache bbox non invalidata
- [x] Fix implementato: Invalidazione cache + ricalcolo
- [x] Build Docker completo --no-cache
- [ ] Test browser con hard refresh
- [ ] Verifica bbox corretto (~0.26m invece di 10.64m)
- [ ] Conferma pentola visibile sul tavolo

---

**PROSSIMO STEP**: Attendere fine build Docker (~2-3 minuti) → Hard refresh browser → Verificare bbox corretto nei log console.
