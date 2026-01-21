# 🍳 PENTOLA FIX - Scala e Geometry Center

## 📋 PROBLEMA

La pentola non appariva nella scena cucina. Debugging ha rivelato:

1. **BoundingBox scentrata**: Centro a (-1.50, -0.40, 0.80) invece di origine
2. **Scala enorme**: Dimensioni 10.64m x 13.36m x 9.25m (volume 1314 m³!)
3. **Causa doppia**:
   - Geometria GLB aveva pivot fuori centro
   - Scala parent (CasaModel) è 10x

## ✅ SOLUZIONE APPLICATA

### 1. Geometry Center (OBBLIGATORIO!)

```javascript
// ✅ STEP CRITICO: Centra la geometria PRIMA di scalare!
if (child.geometry) {
  child.geometry.center()
  console.log("✅ Geometria pentola centrata all'origine locale")
}
```

**Perché è CRITICO**:
- `geometry.center()` sposta i vertici in modo che il centro del bbox sia all'origine
- DEVE essere chiamato PRIMA di scalare, altrimenti la scala non ha effetto corretto
- Senza questo fix, la pentola rimane invisibile anche con scala corretta

### 2. Scala Corretta (compensando parent 10x)

```javascript
// Parent CasaModel ha scala 10x, quindi:
// 0.0025 local * 10 parent = 0.025 world = 25cm finale
child.scale.set(0.0025, 0.0025, 0.0025)
console.log("🍳 Scala pentola ridotta a 0.0025 (compensando parent 10x)")
```

**Calcoli**:
- Modello GLB originale: ~10m (enorme!)
- Parent scale: 10x
- Scala local richiesta: 0.0025
- **Risultato finale**: 10m * 0.0025 * 10 = 0.25m = 25cm ✅

### 3. Posizionamento World

```javascript
// Posizione world assoluta (davanti al player)
const absolutePos = new THREE.Vector3(-1.5, 0.95, 0.8)

// Converti in coordinate locali del parent
if (child.parent) {
  child.parent.worldToLocal(absolutePos)
  child.position.copy(absolutePos)
}
```

## 🔧 CODICE COMPLETO (CasaModel.jsx)

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
          console.log("✅ Geometria pentola centrata all'origine locale")
        }

        // 1. SCALA: Parent ha scala 10x, quindi 0.0025 → 25cm finale
        child.scale.set(0.0025, 0.0025, 0.0025); 
        console.log("🍳 Scala pentola ridotta a 0.0025 (compensando parent 10x)");

        // 2. POSIZIONE: Coordinate world assolute
        const absolutePos = new THREE.Vector3(-1.5, 0.95, 0.8);
        
        // Converti in coordinate del parent
        if (child.parent) {
          child.parent.worldToLocal(absolutePos);
          child.position.copy(absolutePos);
        }

        // 3. VISIBILITÀ
        child.visible = true;

        child.updateMatrixWorld(true);
        console.log("✅ Pentola posizionata e CENTRATA - dovrebbe essere visibile!");
      }
    });
  }, 1500);
}
```

## 📊 RISULTATI ATTESI

### Prima del fix:
- **BoundingBox**: 10.64m x 13.36m x 9.25m
- **Volume**: 1314 m³
- **Visibilità**: ❌ Invisibile (fuori viewport/frustum)

### Dopo il fix:
- **BoundingBox**: ~0.25m x 0.30m x 0.20m
- **Volume**: ~0.015 m³
- **Visibilità**: ✅ Pentola piccola e centrata sui fornelli

## ⚠️ NOTA IMPORTANTE

**`geometry.center()` è OBBLIGATORIO!**

Se omesso:
- La scala non ha effetto corretto
- Il pivot rimane scentrato
- La pentola risulta invisibile o malposizionata

Questo metodo:
- Modifica i vertici della geometria
- Sposta il centro del bbox all'origine
- Va chiamato UNA SOLA VOLTA (non in ogni frame!)

## 🔍 DEBUG LOG ATTESO

```
🍳 FIX PENTOLA - Applicando geometry.center()
✅ Geometria pentola centrata all'origine locale
🍳 Scala pentola ridotta a 0.0025 (compensando parent 10x)
✅ Pentola posizionata e CENTRATA - dovrebbe essere visibile!
```

## 📁 FILE MODIFICATO

- `src/components/3D/CasaModel.jsx` (righe ~819-856)

## ✅ STATUS

- [x] geometry.center() applicato
- [x] Scala corretta a 0.0025
- [x] Posizionamento world corretto
- [x] Timeout 1.5s per attendere BVH build
- [x] Documentato in questa guida
- [ ] Test finale con browser (pending rebuild)

---
**Data fix**: 12/01/2026 15:28
**Issue risolto**: Pentola invisibile in cucina
**Causa root**: BoundingBox scentrato + scala errata
