# 🎯 SOLUZIONE CORRETTA - WORLD ROOT Reference

**Data**: 22/12/2025  
**Problema**: Conversione WORLD→LOCAL con reference sbagliato

## ❌ Errore Concettuale Identificato

### Il Problema con findNeutralParent()

Anche se `LETTO` ha trasformazioni "neutre":
```javascript
position: [0, 0, 0]
scale: [1, 1, 1]
rotation: [0, 0, 0]
```

**NON è il vero reference WORLD** perché:
- La scena ha offset globali (Y-shift, scale, ecc.)
- `CasaModel` applica trasformazioni
- `FPSControls` modifica il root
- `LETTO` è comunque figlio di nodi trasformati

### Prova Definitiva

```
WORLD [-1.289, -0.109, 0.439]  ← Corretto (da raycaster)
LOCAL [-27.384, 41.762, 0.000]  ← IMPOSSIBILE fisicamente!
```

**Questo può succedere SOLO se worldToLocal() è fatto rispetto al reference sbagliato.**

## ✅ Regola d'Oro

**Le coordinate WORLD vanno convertite SOLO rispetto allo stesso nodo rispetto al quale sono state generate.**

- Raycaster lavora su `scene.children` (WORLD SPACE puro)
- Quindi conversione DEVE usare `scene` o un `WORLD_ROOT` esplicito
- **MAI** nodi intermedi (LETTO, COMODINO_2, ecc.)

## 🛠️ Soluzione Corretta

### Opzione A: Usa `scene` direttamente

```javascript
// ROTATION
const pivotGroup = new THREE.Group()
pivotGroup.name = 'PIVOT_Comodino'
scene.add(pivotGroup)

// Converti WORLD→LOCAL rispetto a scene
scene.updateWorldMatrix(true, false)
const pivotLocalPos = scene.worldToLocal(pivotWorldPos.clone())
pivotGroup.position.copy(pivotLocalPos)

// Poi attach oggetti al pivot
objects.forEach(obj => pivotGroup.attach(obj))
```

### Opzione B: WORLD_ROOT esplicito (RACCOMANDATO)

**Setup iniziale** (in CasaModel o equivalente):
```javascript
// Crea WORLD_ROOT sotto scene
const worldRoot = new THREE.Group()
worldRoot.name = 'WORLD_ROOT'
scene.add(worldRoot)

// Carica TUTTO il modello sotto WORLD_ROOT
worldRoot.add(casaModel)
```

**Nell'hook**:
```javascript
// Trova WORLD_ROOT risalendo la gerarchia
function findWorldRoot(node) {
  let current = node
  while (current && current.parent) {
    if (current.name === 'WORLD_ROOT') {
      return current
    }
    if (current.parent.type === 'Scene') {
      // Siamo arrivati a scene, usa scene stesso
      return current.parent
    }
    current = current.parent
  }
  return current
}

// Usa WORLD_ROOT per tutte le conversioni
const worldRoot = findWorldRoot(parent)
const pivotLocalPos = worldRoot.worldToLocal(pivotWorldPos.clone())
```

## 📊 Confronto Soluzioni

| Soluzione | Pro | Contro |
|-----------|-----|--------|
| **findNeutralParent()** | Automatico | ❌ Concettualmente SBAGLIATO |
| **scene diretto** | Semplice, sempre funziona | Accoppiamento con scene |
| **WORLD_ROOT** | ✅ Architettura pulita | Richiede modifica setup modello |

## ⚠️ Cosa NON Fare

❌ **NON** cercare "parent neutri" risalendo la gerarchia  
❌ **NON** usare oggetti intermedi (LETTO, COMODINO_2)  
❌ **NON** fidarsi di `scale=1` come criterio di neutralità  
❌ **NON** convertire WORLD con nodi che non sono il vero root WORLD  

## ✅ Implementazione Consigliata

### 1. Nel componente che carica il modello

```javascript
// src/components/3D/CasaModel.jsx
const worldRoot = useMemo(() => {
  const root = new THREE.Group()
  root.name = 'WORLD_ROOT'
  return root
}, [])

return (
  <group ref={worldRoot}>
    <primitive object={nodes.Scene} />
    {/* tutto il resto */}
  </group>
)
```

### 2. Nell'hook di animazione

```javascript
// Trova WORLD_ROOT
const worldRoot = findWorldRoot(parent)

// ROTATION
worldRoot.add(pivotGroup)
const pivotLocalPos = worldRoot.worldToLocal(pivotWorldPos.clone())
pivotGroup.position.copy(pivotLocalPos)

// POSITION
const localEnd = worldRoot.worldToLocal(worldEnd.clone())
```

## 🎓 Lezione Tecnica

### Il Problema dei Transform Cumulativi

In Three.js, ogni nodo ha una **matrice cumulativa** che include:
1. Le sue trasformazioni locali
2. Le trasformazioni di TUTTI i parent

Quando fai `node.worldToLocal(worldPos)`:
- Three.js calcola la matrice inversa cumulativa di `node`
- Se `node` non è il vero root WORLD, la matrice include trasformazioni spurie
- Risultato: coordinate LOCAL sbagliate

### Perché Scene è il Reference Corretto

`scene` in Three.js:
- Ha **sempre** matrice identity
- È il vero root del WORLD space
- Il raycaster lavora in questo spazio
- Quindi `scene.worldToLocal()` è sempre corretto

## 📝 Messaggio ai Programmatori

```
Dai log è evidente che il problema non è il pivot né il raycaster.

Il vero errore è concettuale: stiamo convertendo coordinate WORLD usando nodi 
che non sono il reference WORLD reale della scena.

Anche se LETTO ha scale/rotation/position neutre, non vive nello stesso spazio 
WORLD del raycaster (la scena ha offset globali, Y-shift, scale e reposition 
applicati in CasaModel/FPS).

La prova è questa:
WORLD [-1.289, -0.109, 0.439]
LOCAL [-27.384, 41.762, 0.000] ❌

Questo può succedere solo se worldToLocal() viene fatto rispetto al 
riferimento sbagliato.

La soluzione corretta è:
- Introdurre un WORLD_ROOT esplicito sotto scene
- Caricare il modello sotto WORLD_ROOT
- Convertire SEMPRE WORLD → LOCAL usando WORLD_ROOT (o scene)

Cercare "parent neutri" nella gerarchia non funziona in una scena trasformata.
```

---

**Status**: ⚠️ Soluzione findNeutralParent() è concettualmente sbagliata  
**Fix Corretto**: Usare `scene` o `WORLD_ROOT` esplicito per tutte le conversioni
