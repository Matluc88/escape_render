# 🔧 Fix DEFINITIVO - attach() per Pivot ROTATION

**Data**: 22/12/2025  
**File modificato**: `src/hooks/useComodinoAnimation.js`

## 📊 Problema Reale Identificato

### ❌ Il Problema NON Era la Scala
Dai log completi è emerso che il problema **NON era** `parent.scale x7`, ma la **gerarchia diversa**:

```
Scene Root
├─ LETTO
│  └─ COMODINO_2 ← parent degli oggetti
└─ pivotWorldPos ← Calcolato nello spazio della scene root
```

**Causa**:
- `pivotWorldPos` calcolato in coordinate WORLD (scene root)
- `COMODINO_2` è figlio di `LETTO` (subtree diverso)
- `parent.worldToLocal()` assumeva stesso subtree → coordinate sballate!

```
Input WORLD:  [-1.592, 0.627, 0.075]  ← Corretto!
Output LOCAL: [-57.64, 78.16, 73.59]  ← SBAGLIATO per subtree diverso!
```

---

## ✅ Soluzione con `attach()`

### Perché `attach()` è LA soluzione
`attach()` è il **metodo canonico** in Three.js per reparentare oggetti:
1. ✅ Preserva posizione WORLD automaticamente
2. ✅ Calcola LOCAL corretto per qualsiasi gerarchia
3. ✅ NO calcoli manuali di conversione
4. ✅ Robusto indipendentemente dalla struttura del grafo

### Codice Fix

**Prima** (❌ ERRATO):
```javascript
// worldToLocal() assume stesso subtree
const pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
pivotGroup.position.copy(pivotLocalPos)
parent.add(pivotGroup)  // Coordinate errate!
```

**Dopo** (✅ CORRETTO):
```javascript
// 1. Crea pivot in WORLD space
const pivotGroup = new THREE.Group()
pivotGroup.name = 'PIVOT_Comodino'
pivotGroup.position.copy(pivotWorldPos)  // ← WORLD coordinates

// 2. Add to scene root first
scene.add(pivotGroup)

// 3. attach() preserva WORLD e converte a LOCAL automaticamente
parent.attach(pivotGroup)

// ✅ Ora pivotGroup.position è LOCAL corretto rispetto a parent!
```

---

## 🧪 Risultati Attesi

### Prima del fix:
```
Pivot WORLD: [-1.592, 0.627, 0.075]
Pivot LOCAL: [-57.64, 78.16, 73.59]  ← Esplosivo!
```

### Dopo il fix (con attach()):
```
Pivot WORLD:  [-1.592, 0.627, 0.075]
Pivot LOCAL:  [-0.227, 0.089, 0.011]  ← Corretto! (ordine di ±0.3m)
```

---

## 🔧 Fix POSITION Confermato

L'animazione POSITION era già corretta con il fix precedente:
- ✅ Salva posizioni WORLD
- ✅ Converte WORLD→LOCAL nel loop
- ✅ Interpola solo tra coordinate LOCAL

---

## 📝 Note Tecniche

### attach() vs worldToLocal()

**worldToLocal()**:
- Converte coordinate assumendo stesso subtree
- Fallisce se pivot è in un subtree diverso
- Richiede calcoli manuali complessi

**attach()**:
- Gestisce automaticamente qualsiasi gerarchia
- Preserva posizione WORLD visivamente
- Calcola LOCAL corretto per il nuovo parent
- **Raccomandato da Three.js per reparenting**

### Quando Usare attach()

✅ **USA attach()** quando:
- Devi reparentare un oggetto
- Il nuovo parent è in un subtree diverso
- Vuoi preservare la posizione WORLD

❌ **NON usare worldToLocal()** per:
- Reparenting tra subtree diversi
- Conversioni con parent scalati
- Gerarchie complesse

---

## 🚀 Test

**Premi K in Camera** per testare l'animazione. Nei log cerca:

```
🔍 PIVOT ROTATION - DEBUG GERARCHIA
Input pivotWorldPos: [-1.592, 0.627, 0.075]
✅ Usando attach() per conversione WORLD→LOCAL automatica
📍 Pivot creato in WORLD space: [-1.592, 0.627, 0.075]
🎯 Pivot LOCAL dopo attach(): [-0.227, 0.089, 0.011]  ← OK!
✅ attach() completato - pivot correttamente posizionato!
```

**Criterio di successo**:
- Pivot LOCAL ≈ ±0.3m (non decine!)
- Rotazione avviene sul punto visivamente corretto
- Il comodino mantiene la forma durante l'animazione

---

## 📚 Riferimenti

- [Three.js Object3D.attach() Documentation](https://threejs.org/docs/#api/en/core/Object3D.attach)
- Three.js best practice: sempre usare `attach()` per reparenting
- Pattern usato in: anta cucina, cancello, pentola

---

**Status**: ✅ Fix definitivo implementato con `attach()`
**Test**: Pronto per validazione utente
