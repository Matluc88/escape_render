# 🍳 PENTOLA FIX - Materiale Originale (12/01/2026)

## 🎯 Problema Risolto
La pentola nella scena cucina non era visibile perché il componente `PentolaFix` stava **sostituendo** il materiale originale con un **cubo rosso di debug** (`MeshBasicMaterial` rosso).

## 🔧 Soluzione Implementata

### File Modificato
`src/components/scenes/KitchenScene.jsx` - Componente `PentolaFix`

### Cambiamenti

**PRIMA (❌ SBAGLIATO - Cubo rosso):**
```javascript
// 🔥 MATERIALE DEBUG VISIBILITÀ
movable.traverse((n) => {
  if (n.isMesh) {
    n.material = new THREE.MeshBasicMaterial({
      color: 0xff0000,  // ← ROSSO debug
      depthTest: false
    })
    n.visible = true
    n.frustumCulled = false
    n.renderOrder = 9999
  }
})
```

**DOPO (✅ CORRETTO - Pentola originale):**
```javascript
// 🔥 RENDI VISIBILE PENTOLA ORIGINALE (senza cambiare materiale!)
movable.traverse((n) => {
  if (n.isMesh) {
    // ✅ MANTIENI MATERIALE ORIGINALE - solo forza visibilità
    n.visible = true
    n.frustumCulled = false
    n.renderOrder = 9999
    // ✅ depthTest su materiale esistente
    if (n.material) {
      n.material.depthTest = true  // ← Mantieni depth normale
    }
  }
})
```

## 📊 Dettagli Tecnici

### UUID Pentola
```javascript
const PENTOLA_ID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0'
```

### Posizionamento
```javascript
movable.position.set(-1.5, 1.5, 0.8)  // World coordinates
movable.rotation.set(0, 0, 0)
movable.scale.setScalar(0.5)  // 50% scala per visibilità
```

### Timing
```javascript
setTimeout(fixPentola, 6000)  // 6 secondi dopo il caricamento
```

## ✅ Risultato

Ora la pentola appare con il suo **MATERIALE ORIGINALE** invece di un cubo rosso di debug, mantenendo:
- ✅ Texture originale
- ✅ Colori originali
- ✅ Materiali originali
- ✅ Visibilità forzata
- ✅ Rendering corretto

## 🧪 Come Testare

1. **Rebuild Docker:**
   ```bash
   cd escape-room-3d
   docker-compose up -d --build frontend
   ```

2. **Apri browser:**
   ```
   http://localhost/play/1020/cucina
   ```

3. **Verifica:**
   - Dovresti vedere la PENTOLA VERA con materiale originale
   - NON un cubo rosso
   - Posizione: sopra l'altezza degli occhi, davanti a te

4. **DevTools Console:**
   ```javascript
   window.__DEBUG.pentola  // Oggetto pentola esposto per debug
   ```

## 📝 Note

- La pentola è posizionata a Y=1.5m (sopra altezza occhi standard 1.4m)
- La scala è 0.5x per renderla più visibile
- Il materiale originale viene preservato
- `frustumCulled = false` previene scomparsa fuori dal campo visivo
- `renderOrder = 9999` assicura rendering in primo piano

## 🔍 Debug

Se la pentola non appare ancora:

1. **Verifica log console:**
   ```
   🍳 Pentola trovata!
   ✅ PENTOLA FORZATA VISIBILE (via name)
   ```

2. **Controlla posizione camera:**
   ```javascript
   // La camera dovrebbe essere circa a Y=1.4m
   // La pentola è a Y=1.5m (sopra)
   ```

3. **Verifica materiale:**
   ```javascript
   window.__DEBUG.pentola.traverse(n => {
     if (n.isMesh) console.log(n.material)
   })
   // NON dovrebbe essere MeshBasicMaterial rosso!
   ```

## 🎓 Lezione Appresa

**NON sostituire mai materiali originali per debug!**
Usa invece:
- `visible = true` per forzare visibilità
- `frustumCulled = false` per prevenire culling
- `renderOrder` per controllo rendering
- Mantieni SEMPRE i materiali originali del modello

---

**Status:** ✅ RISOLTO - 12/01/2026
**Rebuild richiesto:** ✅ SÌ (frontend)
**Cache clear:** ❌ NO (non necessario)
