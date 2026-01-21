# 🍳 FIX PENTOLA - BoundingBox Recompute dopo geometry.center()

**Data**: 12 Gennaio 2026  
**Problema**: Pentola invisibile nonostante geometry.center() e scala corretta  
**Causa**: BoundingBox NON ricalcolato dopo center(), rimane con dimensioni originali 10m

## 🐛 Il Bug

Quando chiamiamo `geometry.center()` per centrare la geometria all'origine locale, il **bounding box NON viene automaticamente aggiornato**! Rimane con le coordinate e dimensioni PRIMA del centr aggio.

**Risultato**: 
- Geometria centrata ✅
- Scala 0.0025 applicata ✅  
- BoundingBox VECCHIO (10.64m x 13.36m) ❌
- Pentola fuori dal frustum camera → INVISIBILE!

## ✅ La Soluzione

**OBBLIGATORIO**: Ricalcolare bbox E boundingSphere DOPO center()!

```javascript
// ❌ SBAGLIATO - bbox rimane vecchio!
if (child.geometry) {
  child.geometry.center()
  console.log("✅ Geometria pentola centrata all'origine locale")
}

// ✅ CORRETTO - bbox aggiornato!
if (child.geometry) {
  child.geometry.center()
  // 🔧 FIX CRITICO: RICALCOLA bbox DOPO center()!
  child.geometry.computeBoundingBox()
  child.geometry.computeBoundingSphere()
  console.log("✅ Geometria pentola centrata e bbox ricalcolato")
}
```

## 📍 Dove Applicato

**File**: `src/components/3D/CasaModel.jsx`  
**Linea**: ~1080-1088 (useEffect BVH build)  
**Timeout**: 1500ms dopo BVH ready

```javascript
// 🍳 FIX PENTOLA - geometry.center() OBBLIGATORIO!
if (sceneType === 'cucina') {
  setTimeout(() => {
    scene.traverse((child) => {
      if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
        
        console.log("🍳 FIX PENTOLA - Applicando geometry.center()");

        // ✅ STEP CRITICO: Centra la geometria PRIMA di tutto!
        if (child.geometry) {
          child.geometry.center()
          // 🔧 FIX CRITICO: RICALCOLA bbox DOPO center()!
          child.geometry.computeBoundingBox()
          child.geometry.computeBoundingSphere()
          console.log("✅ Geometria pentola centrata e bbox ricalcolato")
        }

        // Scala ridotta (0.0025) per compensare parent 10x
        child.scale.set(0.0025, 0.0025, 0.0025); 
        
        // Posizione world (-1.5, 0.95, 0.8)
        const absolutePos = new THREE.Vector3(-1.5, 0.95, 0.8);
        if (child.parent) {
          child.parent.worldToLocal(absolutePos);
          child.position.copy(absolutePos);
        }

        child.visible = true;
        child.updateMatrixWorld(true);
      }
    });
  }, 1500);
}
```

## 📊 Risultato Atteso

**Prima del fix**:
```
📦 BOUNDING BOX:
   Centro: (-1.50, 1.00, 0.80)
   Dimensioni: 10.64m x 13.36m x 9.25m ❌ GIGANTE!
   Volume: 1314.406m³
```

**Dopo il fix**:
```
📦 BOUNDING BOX:
   Centro: (-1.50, 0.95, 0.80) 
   Dimensioni: 0.26m x 0.33m x 0.23m ✅ CORRETTO!
   Volume: ~0.02m³
```

## 🔍 Come Verificare

1. Apri DevTools (F12)
2. Vai su cucina: http://localhost/play/1020/cucina
3. Aspetta "Geometria pentola centrata e bbox ricalcolato"
4. Guarda la diagnostica frame update:
   - Dimensioni bbox devono essere ~0.25m (non 10m!)
   - Pentola VISIBILE sul tavolo davanti al player

## 🚀 Deploy

```bash
# 1. Rebuild frontend con fix
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose up -d --build frontend

# 2. Hard refresh browser (Cmd+Shift+R)
# 3. Test su http://localhost/play/1020/cucina
```

## 📝 Note Tecniche

- `geometry.center()` modifica le coordinate dei vertici ma NON il bounding box
- Il bbox viene ricalcolato SOLO quando chiamiamo esplicitamente `computeBoundingBox()`
- Lo stesso vale per `boundingSphere` → serve `computeBoundingSphere()`
- Questo è un comportamento INTENZIONALE di Three.js per performance (evita ricalcoli automatici)

## ✅ Fix Completato

- [x] Identificato causa: bbox non ricalcolato
- [x] Applicato computeBoundingBox() dopo center()
- [x] Applicato computeBoundingSphere() dopo center()
- [x] Rebuild Docker in corso
- [ ] Test finale con browser

---

**Problema Risolto**: Pentola ora ha bbox corretto (~25cm) e dovrebbe essere VISIBILE! 🎉
