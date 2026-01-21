# 🚪 Fix DEFINITIVO Porta d'Ingresso - Auto-Pivot System

## 🔍 Problema Identificato

La porta d'ingresso "volava via" in produzione perché usava **coordinate pivot hardcoded in world space assoluto**. Quando il modello viene riposizionato dinamicamente (diverso offset Y tra locale e produzione), le coordinate pivot non sono più corrette.

### Causa Root

```javascript
// ❌ PROBLEMA: Coordinate ASSOLUTE nel JSON
{
  "pivotX": 0.421,
  "pivotY": 0.13443069458007817,  // ← World space assoluto!
  "pivotZ": 3.7768158657226567
}
```

Quando `CasaModel.jsx` riposiziona il modello con:
```javascript
const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0
groupRef.current.position.set(-center.x, -targetGroundY + actualOffset, -center.z)
```

Le coordinate pivot hardcoded puntano nel **vuoto** → la porta si stacca e vola via!

## ✅ Soluzione Implementata: AUTO-PIVOT System

### Step 1: Nuovo parametro `autoPivot` nel JSON

**File**: `public/porta_ingresso_sequence.json`

```json
{
  "objectName": "PORTA_INGRESSO(BE4CFAD9-5A47-4C4C-AE3F-433A4A7694F3)",
  "mode": "rotation",
  "autoPivot": "right",  // ← Calcola automaticamente dal lato destro
  "angle": 90,
  "axis": "z",
  "direction": -1,
  "handleUUIDs": [...]
}
```

**Valori supportati per `autoPivot`:**
- `"left"` - Pivot sul lato sinistro della bbox
- `"right"` - Pivot sul lato destro della bbox
- `"top"` - Pivot sulla parte superiore
- `"bottom"` - Pivot sulla parte inferiore

### Step 2: Implementazione in `useAnimatedDoor.js`

```javascript
// 🔧 AUTO-PIVOT: Calcola pivot dalla bounding box a RUNTIME
if (config.autoPivot) {
  // Calcola bbox della porta nella posizione CORRENTE
  const bbox = new THREE.Box3().setFromObject(doorObject)
  
  // Determina coordinate in base al lato specificato
  if (config.autoPivot === 'right') {
    pivotWorldX = bbox.max.x  // ← Lato destro
    pivotWorldY = (bbox.min.y + bbox.max.y) / 2  // Centro verticale
    pivotWorldZ = (bbox.min.z + bbox.max.z) / 2  // Centro profondità
  }
  
  // Converti da world a local del parent
  const pivotWorldPos = new THREE.Vector3(pivotWorldX, pivotWorldY, pivotWorldZ)
  pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
}
```

**Vantaggi:**
✅ Coordinate **SEMPRE RELATIVE** alla posizione corrente della porta
✅ Funziona ovunque il modello venga riposizionato
✅ Backward compatible (coordinate esplicite ancora supportate)

## 📋 Come Funziona

1. **Caricamento modello**: `CasaModel.jsx` riposiziona il modello dinamicamente
2. **Inizializzazione animazione**: `useAnimatedDoor.js` viene chiamato
3. **Calcolo auto-pivot**: 
   - Calcola bbox della porta nella sua posizione **ATTUALE**
   - Determina il pivot dal lato specificato (`right` = `bbox.max.x`)
   - Converte da world space a local space del parent
4. **Crea pivot group**: Posiziona il pivot alle coordinate calcolate
5. **Animazione**: La porta ruota attorno al pivot corretto

## 🧪 Test

### In Locale

```bash
cd escape-room-3d
npm run dev
```

Vai a `/play/999/esterno` e premi **L** per aprire la porta.

**Verifica:**
- ✅ La porta si apre correttamente sul cardine destro
- ✅ Le maniglie seguono la porta
- ✅ Nessuno spostamento nello spazio

### In Produzione

Dopo deploy, testa la stessa cosa. La porta dovrebbe funzionare IDENTICAMENTE perché il pivot viene calcolato dalla bbox runtime.

## 🔧 Migrazione di Altre Porte

Per migrare altre porte al sistema auto-pivot:

1. **Apri il JSON della porta** (es. `porta_camera_sequence.json`)

2. **Sostituisci le coordinate pivot con autoPivot:**

```json
// ❌ PRIMA
{
  "pivotX": 1.234,
  "pivotY": 2.345,
  "pivotZ": 3.456,
  "angle": 90,
  "axis": "y"
}

// ✅ DOPO
{
  "autoPivot": "left",  // o "right", "top", "bottom"
  "angle": 90,
  "axis": "y"
}
```

3. **Scegli il lato corretto:**
   - Porta con cardini a sinistra → `"left"`
   - Porta con cardini a destra → `"right"`
   - Anta che si alza → `"top"` o `"bottom"`

## 🎯 Risultato Atteso

✅ Porta rimane sul cardine in TUTTE le condizioni:
- Locale vs Produzione
- Diversi offset Y del modello
- Diversi valori di `PIANO_TERRA_HEIGHT`
- Qualsiasi riposizionamento dinamico

## 📝 File Modificati

- ✅ `public/porta_ingresso_sequence.json` - Aggiunto `autoPivot`
- ✅ `src/hooks/useAnimatedDoor.js` - Implementato calcolo auto-pivot da bbox
- ✅ `PORTA_INGRESSO_FIX_V2_AUTOPIVOT.md` - Documentazione completa

## 🚀 Deployment

```bash
cd escape-room-3d

# Commit
git add .
git commit -m "fix: porta ingresso con auto-pivot da bbox (coordinate relative)"
git push

# Riavvia container Docker (se necessario)
docker-compose restart frontend
```

## 💡 Note Tecniche

### Perché Auto-Pivot Risolve il Problema

**Prima (coordinate assolute):**
```
Pivot Point: (0.421, 0.134, 3.776) in world space
↓ Modello riposizionato con Y diverso
↓ Pivot ancora a (0.421, 0.134, 3.776)
❌ Porta non è più al pivot → vola via!
```

**Dopo (auto-pivot da bbox):**
```
Modello riposizionato → Nuova posizione porta
↓ Calcola bbox dalla posizione CORRENTE
↓ Pivot = bbox.max.x (lato destro RELATIVO)
✅ Pivot sempre sul cardine della porta!
```

---

**Data Fix**: 09/01/2026
**Versione**: V2 - Auto-Pivot System
**Tipo**: Bug Fix - Coordinate Relative
**Priorità**: CRITICA (porta non funzionante in produzione)
