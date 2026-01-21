# 🏗️ Architettura Sistema Animazioni

## 📋 Stato Attuale

### ✅ Componenti Implementati

1. **Animation Editor UI** (`AnimationEditor.jsx`)
   - Modalità Guidata/Avanzata
   - Selezione oggetti con click
   - Preview animazioni in real-time
   - Export JSON configurazione

2. **Hook useAnimatedDoor** (`useAnimatedDoor.js`)
   - Pattern damping corretto (non incrementale)
   - Gestione pivot con coordinate world→local
   - Stati: aperto/chiuso con convergenza

3. **Normalizzatore** (`animationNormalizer.js`) ✨ **NUOVO**
   - Converte JSON semantico → config engine
   - Validazione con warning
   - Deduzione automatica asse/direzione

4. **Integrazione KitchenScene**
   - Tasti 1/2 per apri/chiudi
   - Config stabile con useMemo
   - Hook inizializzato una volta

---

## 🎯 Formato JSON Corretto

### ✅ JSON Semantico (da usare)

```json
{
  "objectName": "Anta_Mobile",
  "type": "hinged_door",
  "state": "closed",
  "openAngleDeg": 90,
  "pivotLocation": "left"
}
```

**Campi obbligatori**:
- `objectName` - Nome univoco mesh
- `openAngleDeg` - Angolo apertura in gradi
- `type` - Tipo oggetto (hinged_door, drawer, window)
- `state` - Stato iniziale (open/closed)

**Campi semantici**:
- `pivotLocation` - "left", "right", "center"
- `angleUnit` - "deg" o "rad" (se usi `angle` invece di `openAngleDeg`)

### ❌ JSON Implementativo (da NON usare)

```json
{
  "axis": "z",           // ❌ Dedotto dalla geometria
  "direction": -1,       // ❌ Calcolato dal pivot
  "speed": 90,           // ❌ Usata velocità default
  "pivotX": -2.872,      // ❌ Usa pivotLocation invece
  "rotation": 1.57       // ❌ Stato interno engine
}
```

---

## 🔄 Flow Completo

### 1. Configurazione (Animation Editor)

```
Utente → Click oggetto → Configura parametri → Export JSON
                              ↓
                    {
                      "objectName": "...",
                      "type": "hinged_door",
                      "state": "closed",
                      "openAngleDeg": 90,
                      "pivotLocation": "left"
                    }
```

### 2. Normalizzazione (Runtime)

```javascript
import { normalizeDoorConfig } from './utils/animationNormalizer'

// JSON grezzo dal pannello
const panelJson = {
  objectName: "Anta_Mobile",
  type: "hinged_door",
  state: "closed",
  openAngleDeg: 90,
  pivotLocation: "left"
}

// Normalizzazione
const normalized = normalizeDoorConfig(panelJson, doorMesh)

// Output engine-ready:
// {
//   objectName: "Anta_Mobile",
//   type: "hinged_door",
//   state: "closed",
//   axis: "y",              // ← Dedotto
//   closedAngle: 0,         // ← Calcolato
//   openAngle: 1.5708,      // ← Convertito
//   currentAngle: 0,        // ← Letto dalla mesh
//   pivotX: -2.872,         // ← Calcolato da "left"
//   pivotY: 0.754,
//   pivotZ: 0.571,
//   speed: 1.5708,          // ← Default 90°/s
//   _warnings: [...]
// }
```

### 3. Animazione (Engine)

```javascript
useAnimatedDoor(doorMesh, isOpen, normalized)
```

---

## 🚧 Roadmap

### Phase 1 - Attuale ✅
- [x] Editor UI funzionante
- [x] Hook con damping pattern
- [x] Integrazione base tasti 1-2
- [x] Normalizzatore creato

### Phase 2 - Da Fare 🔄
- [ ] Usare normalizzatore in CasaModel
- [ ] Aggiornare AnimationEditor per esportare JSON semantico
- [ ] Rimuovere campi implementativi dall'export
- [ ] Debug panel con JSON input/output

### Phase 3 - Future Features 🚀
- [ ] Stati FSM completi (opening/closing/locked)
- [ ] Eventi MQTT per trigger remoti
- [ ] Collision detection durante animazione
- [ ] Sound effects sincronizzati

---

## 🔧 Come Usare il Normalizzatore

### Attuale (JSON con dettagli impl.)
```javascript
// KitchenScene.jsx
const animatedDoorConfig = useMemo(() => ({
  objectName: "sweethome3d_opening_on_hinge_1_door_511(...)",
  mode: "rotation",
  pivotX: -2.872,
  pivotY: 0.754,
  pivotZ: 0.571,
  axis: "z",
  angle: 90,
  speed: 90,
  direction: -1
}), [])
```

### Future (JSON semantico + normalizzatore)
```javascript
// KitchenScene.jsx
import { normalizeDoorConfig } from '../utils/animationNormalizer'

const doorPanelJson = useMemo(() => ({
  objectName: "sweethome3d_opening_on_hinge_1_door_511(...)",
  type: "hinged_door",
  state: "closed",
  openAngleDeg: 90,
  pivotLocation: "left"
}), [])

// In CasaModel quando trova l'oggetto
const doorMesh = scene.getObjectByName(doorPanelJson.objectName)
const normalized = normalizeDoorConfig(doorPanelJson, doorMesh)

// Passa config normalizzata a useAnimatedDoor
useAnimatedDoor(doorMesh, isOpen, normalized)
```

---

## ✅ Vantaggi Approccio Semantico

### Per Utenti
- ✅ JSON facile da leggere
- ✅ Nessun dettaglio tecnico
- ✅ Validazione con errori chiari

### Per Developer
- ✅ Logica separata (intent vs implementation)
- ✅ Facile debug (JSON input vs output)
- ✅ Manutenibilità alta

### Per Sistema
- ✅ Configurazioni sempre valide
- ✅ Deduzione automatica parametri
- ✅ Warning per ambiguità

---

## 📝 Checklist Integrazione

### Prima di usare un JSON
- [ ] Ha campo `objectName`?
- [ ] Ha campo `openAngleDeg` o `angle`?
- [ ] Ha campo `type`?
- [ ] Ha campo `state`?
- [ ] NON ha `axis`?
- [ ] NON ha `direction`?
- [ ] NON ha `speed`?

### Dopo normalizzazione
- [ ] `axis` dedotto correttamente?
- [ ] `openAngle` in radianti?
- [ ] `currentAngle` allineato alla mesh?
- [ ] Warning risolti o giustificati?

---

## 🐛 Troubleshooting

### Problema: Anta gira all'infinito
**Causa**: Pattern incrementale (`+=`)
**Fix**: Usa damping pattern (`THREE.MathUtils.damp()`)

### Problema: Anta si stacca dal mobile
**Causa**: Coordinate pivot world non convertite in local
**Fix**: `parent.worldToLocal(pivotWorldPos.clone())`

### Problema: Hook ricreato ad ogni render
**Causa**: Config object non stabile
**Fix**: `useMemo(() => ({...}), [])`

### Problema: JSON ambiguo
**Causa**: Unità angolo non specificata
**Fix**: Usa `openAngleDeg` invece di `angle`, oppure aggiungi `angleUnit`

---

**Creato**: 14/12/2025
**Versione**: 1.0
**Autore**: Cline AI Assistant
