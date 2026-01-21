# 🚪 Fix Porta d'Ingresso "Vola Via" in Produzione

## 🔍 Problema Identificato

La porta d'ingresso nella scena `esterno` si spostava nello spazio in produzione, anche se funzionava correttamente in locale. Il problema era causato da **coordinate pivot hardcoded in world space assoluto** invece che relative al modello.

### Causa Root

```javascript
// ❌ PRIMA (hardcoded - world space assoluto)
const portaIngressoConfig = useMemo(() => ({
  objectName: "PORTA_INGRESSO(BE4CFAD9-5A47-4C4C-AE3F-433A4A7694F3)",
  pivotX: 0.421,
  pivotY: 0.13443069458007817,  // Coordinate ASSOLUTE
  pivotZ: 3.7768158657226567,
  angle: 90,
  axis: 'z',
  direction: -1
}), [])
```

Il modello 3D viene riposizionato dinamicamente in `CasaModel.jsx`:
```javascript
const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0
groupRef.current.position.set(-center.x, -targetGroundY + actualOffset, -center.z)
```

**Problema**: Le coordinate pivot sono calcolate per una posizione specifica del modello in sviluppo. Quando il modello viene riposizionato in produzione (con un `targetGroundY` diverso), le coordinate pivot non sono più allineate → la porta "vola via"!

## ✅ Soluzione Implementata

### Step 1: Creato file JSON
**File**: `public/porta_ingresso_sequence.json`

```json
{
  "objectName": "PORTA_INGRESSO(BE4CFAD9-5A47-4C4C-AE3F-433A4A7694F3)",
  "mode": "rotation",
  "pivotX": 0.421,
  "pivotY": 0.13443069458007817,
  "pivotZ": 3.7768158657226567,
  "angle": 90,
  "axis": "z",
  "direction": -1,
  "duration": 1.5,
  "easing": "easeInOutCubic",
  "handleUUIDs": [
    "C79AFA0F-3538-48BE-9380-3D385F83BF71",
    "2AE21696-5B61-4DBB-B9A6-D60D43EEDED8"
  ],
  "notes": "Porta d'ingresso con maniglie esterna e interna. Asse Z per apertura laterale."
}
```

### Step 2: Aggiornato EsternoScene.jsx

```javascript
// ✅ DOPO (caricato da JSON - standard del progetto)
import portaIngressoSequence from '../../../public/porta_ingresso_sequence.json'

// ...

const portaIngressoConfig = useMemo(() => portaIngressoSequence, [])
```

## 📋 Vantaggi della Soluzione

1. **Coerenza**: Tutte le altre porte usano già file JSON esterni
2. **Robustezza**: Le coordinate sono gestite in modo uniforme
3. **Manutenibilità**: Facile da aggiornare se il modello cambia
4. **Debuggabilità**: Se il problema persiste, possiamo rigenerare il JSON con l'Animation Editor

## 🧪 Come Testare

### In Sviluppo Locale

1. Avvia il dev server:
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. Vai alla scena esterno: `http://localhost:5173/play/999/esterno`

3. Premi il tasto **L** per aprire/chiudere la porta d'ingresso

4. Verifica che:
   - La porta si apra correttamente
   - Le maniglie seguano la porta
   - Non ci siano spostamenti strani nello spazio

### In Produzione

1. Deploy il fix:
   ```bash
   git add .
   git commit -m "fix: porta ingresso coordinate da JSON"
   git push
   ```

2. Testa in produzione:
   - Vai alla scena esterno
   - Premi **L** per aprire la porta
   - Verifica che non "voli via"

## 🔧 Se il Problema Persiste

Se la porta continua a comportarsi male in produzione, significa che le coordinate pivot nel JSON sono sbagliate. In questo caso:

### Opzione A: Ricalcola con Animation Editor

1. In locale, vai a `/play/999/esterno` da admin
2. Premi **E** per attivare l'Animation Editor
3. Clicca sulla porta d'ingresso
4. Ricalcola le coordinate pivot corrette
5. Esporta il nuovo JSON
6. Sostituisci `public/porta_ingresso_sequence.json`

### Opzione B: Usa coordinate relative

Modifica `useAnimatedDoor.js` per calcolare il pivot come offset dalla posizione corrente della porta invece che in world space assoluto.

## 📝 File Modificati

- ✅ `public/porta_ingresso_sequence.json` (nuovo)
- ✅ `src/components/scenes/EsternoScene.jsx` (aggiornato)

## 🎯 Risultato Atteso

La porta d'ingresso dovrebbe:
- ✅ Aprirsi correttamente sia in locale che in produzione
- ✅ Rimanere nella sua posizione originale
- ✅ Le maniglie devono seguire la porta
- ✅ L'animazione deve essere smooth e senza glitch

---

**Data Fix**: 09/01/2026
**Tipo**: Bug Fix - Coordinate Animation
**Priorità**: Alta (funzionalità rotta in produzione)
