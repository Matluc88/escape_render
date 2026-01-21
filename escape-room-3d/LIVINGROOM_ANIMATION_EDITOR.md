# Animation Editor - Soggiorno (Tasto E)

**Data Implementazione:** 29/12/2025  
**Versione:** 1.0  
**Stato:** ✅ COMPLETATO

---

## 📋 Panoramica

Il tasto **E** attiva l'**Animation Editor** nella scena del soggiorno, fornendo un sistema completo per configurare e testare animazioni di oggetti 3D in tempo reale.

---

## 🎯 Funzionalità Implementate

### 1. **Tasto E - Toggle Editor**
- Premi `E` per attivare/disattivare l'Animation Editor
- Indicatore visivo in alto a sinistra quando attivo
- Console log di conferma attivazione

### 2. **Selezione Oggetti**
- Click su qualsiasi oggetto 3D per selezionarlo
- Evidenziazione con bounding box ciano
- Supporto per pattern ROOT (nodi movibili)
- Sistema multi-oggetto per animazioni composite

### 3. **Configurazione Animazioni**

#### **Modalità Rotazione:**
- Posizionamento cardine (bordo sinistro/destro/centro)
- Asse di rotazione (X/Y/Z)
- Angolo di apertura (30°-120°)
- Velocità (45°-180°/s)
- Direzione (oraria/antioraria)
- Helper visuale cardine rosso

#### **Modalità Posizione:**
- Punto A: Rilevato automaticamente dalla posizione oggetto
- Punto B: Selezionabile con click nella scena 3D
- Velocità movimento (0.5-30 u/s)
- Percorso visualizzato con linea arancione
- Marker rosso sulla destinazione

### 4. **Sistema Multi-Oggetto**
- Selezione multipla con sistema a slot
- Animazione sincronizzata di più parti
- Supporto per oggetti complessi (es: comodino)

### 5. **Preview in Tempo Reale**
- Pulsante "▶ Test / Riprendi" per testare animazione
- Pulsante "⏹ Stop" per fermare
- Reset automatico al completamento

### 6. **Export/Import**
- Export JSON semantico delle configurazioni
- Import configurazioni salvate
- Export analisi coordinate completa
- Salvataggio in localStorage

---

## 🎨 UI Components Integrati

### **AnimationEditor** (pannello laterale)
- Informazioni oggetto selezionato
- Controlli per modalità Guidata/Avanzata
- Selettore tipo animazione (Rotazione/Posizione)
- Preset intelligenti per porte/ante
- Sliders per parametri
- Pulsanti azione (Test, Save, Export)

### **AnimationEditorScene** (componente 3D)
- `ObjectHighlighter` - Evidenzia oggetto selezionato
- `PivotHelper` - Mostra cardine rotazione (sfera rossa)
- `PathHelper` - Mostra percorso movimento (linea arancione)
- Marker visivo destinazione (cilindro rosso)

### **Indicatore Stato**
Banner blu in alto a sinistra quando editor attivo:
```
🎨 ANIMATION EDITOR ATTIVO - Clicca su un oggetto
```

---

## 🔧 Implementazione Tecnica

### **Import Aggiunti**
```javascript
import { useMultiObjectAnimationPreview } from '../../hooks/useMultiObjectAnimationPreview'
```

### **State Variables Aggiunte**
```javascript
// Sistema di editing animazioni
const [editorEnabled, setEditorEnabled] = useState(false)
const [selectedObject, setSelectedObject] = useState(null)
const [animationConfig, setAnimationConfig] = useState(null)
const [showEditorUI, setShowEditorUI] = useState(false)
const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
const [pickDestinationMode, setPickDestinationMode] = useState(false)

// Sistema Multi-Object
const [multiObjectMode, setMultiObjectMode] = useState(false)
const [slots, setSlots] = useState([])
const [objectsLocked, setObjectsLocked] = useState(false)

// Marker visivo
const [visualMarkerPosition, setVisualMarkerPosition] = useState(null)
```

### **Keyboard Handler Modificato**
Aggiunto handler per tasto E nel `useEffect` esistente:
```javascript
// Tasto E - Toggle Animation Editor
if (key === 'e') {
  event.preventDefault()
  event.stopPropagation()
  setEditorEnabled(prev => {
    const newState = !prev
    // Reset completo quando disattivato
    if (!newState) {
      setSelectedObject(null)
      setShowEditorUI(false)
      // ... altri reset
    }
    return newState
  })
  return
}
```

### **Componente AnimationEditorScene**
Componente helper aggiunto alla fine del file che gestisce:
- Selezione oggetti con `useObjectSelection`
- Pick destination con `usePositionPicker`
- Preview animazioni con `useAnimationPreview` e `useMultiObjectAnimationPreview`
- Rendering helper visuali

---

## 🎮 Workflow Utente

### **1. Attivazione**
```
Premi E → Editor attivo → Banner blu appare
```

### **2. Selezione Oggetto**
```
Click su oggetto → Bounding box ciano → UI editor si apre
```

### **3. Configurazione Rotazione**
```
Scegli "Rotazione" → Snap cardine a bordo → Regola angolo/velocità
```

### **4. Configurazione Posizione**
```
Scegli "Posizione" → Click "Pick Destination" → Click sulla destinazione
```

### **5. Test**
```
Click "▶ Test" → Animazione parte → Verifica comportamento
```

### **6. Salvataggio**
```
Click "💾 Salva" → Config in localStorage
Click "📋 Export JSON" → Scarica file .json
```

---

## 🔗 Hook Utilizzati

### **useObjectSelection**
- Gestisce click su oggetti 3D
- Supporta modalità normale e multi-oggetto
- Pattern ROOT per nodi movibili

### **usePositionPicker**
- Attivo solo in pick destination mode
- Click sulla scena per coordinate 3D
- ESC per annullare

### **useAnimationPreview** (singolo oggetto)
- Preview animazione in tempo reale
- Gestisce rotazione e posizione
- Callback al completamento

### **useMultiObjectAnimationPreview** (multi-oggetto)
- Anima più oggetti simultaneamente
- Sincronizzazione movimento
- Supporto per oggetti compositi

---

## 📊 Helper Visuali

### **ObjectHighlighter** (ciano)
- Bounding box attorno oggetto selezionato
- Color: `#00ffff`
- Sempre visibile quando oggetto selezionato

### **PivotHelper** (rosso)
- Sfera rossa al punto cardine
- Asse indicato con frecce
- Solo per modalità rotazione
- Color: `#ff0000`

### **PathHelper** (arancione)
- Linea da Punto A a Punto B
- Marker sferici agli estremi
- Solo per modalità posizione
- Color: `#ffaa00`

### **Destination Marker** (rosso brillante)
- Sfera rossa dove utente ha cliccato
- Cilindro verticale per visibilità
- Emissive con intensità 2.0
- Solo quando destinazione selezionata

---

## 🧪 Testing

### **Test Base**
1. ✅ Tasto E attiva/disattiva editor
2. ✅ Banner appare quando attivo
3. ✅ Click su oggetto lo seleziona
4. ✅ UI editor si apre con oggetto selezionato
5. ✅ Bounding box ciano visibile

### **Test Rotazione**
1. ✅ Snap cardine a bordo funziona
2. ✅ Helper pivot rosso visibile
3. ✅ Angolo modificabile con slider
4. ✅ Preview rotazione in tempo reale
5. ✅ Export JSON funziona

### **Test Posizione**
1. ✅ Pick destination attivabile
2. ✅ Click nella scena imposta destinazione
3. ✅ Percorso arancione visualizzato
4. ✅ Marker rosso sulla destinazione
5. ✅ Preview movimento funziona

### **Test Multi-Oggetto**
1. ✅ Attivazione multi-oggetto
2. ✅ Slot system funziona
3. ✅ Preview simultanea multipli oggetti
4. ✅ Reset selection funziona

---

## 🐛 Known Issues & Limitations

### **Nessun problema critico rilevato**

Tutte le funzionalità core sono operative:
- ✅ Selezione oggetti
- ✅ Configurazione rotazione
- ✅ Configurazione posizione
- ✅ Preview animazioni
- ✅ Export/Import
- ✅ Sistema multi-oggetto

---

## 📚 Files Modificati

### **1. LivingRoomScene.jsx**
- ✅ Import hook `useMultiObjectAnimationPreview`
- ✅ 9 nuovi state variables
- ✅ Handler tasto E nel keyboard listener
- ✅ Componente `AnimationEditorScene` aggiunto
- ✅ UI editor integrata nell'overlay
- ✅ Indicatore stato editor

**Righe modificate:** ~100  
**Componenti aggiunti:** 1 (AnimationEditorScene)  
**Funzionalità aggiunte:** 8

---

## 🎓 Pattern Utilizzati

### **1. Controlled Components**
Tutti gli state sono gestiti dal parent (LivingRoomScene):
```javascript
<AnimationEditor
  selectedObject={selectedObject}
  onClose={() => setSelectedObject(null)}
  // ... altri props
/>
```

### **2. Callback Pattern**
Eventi passati come callback per comunicazione child→parent:
```javascript
onDestinationPicked={(worldPos) => {
  setVisualMarkerPosition(worldPos)
  setAnimationConfig(newConfig)
}}
```

### **3. Conditional Rendering**
Componenti renderizzati solo quando necessari:
```javascript
{editorEnabled && modelRef.current && (
  <AnimationEditorScene ... />
)}
```

### **4. useMemo per Performance**
Evita ricreazioni inutili:
```javascript
const filledSlots = useMemo(() => 
  slots.filter(s => s.object !== null),
  [slots]
)
```

---

## 🚀 Utilizzo Pratico

### **Scenario: Configurare Apertura Porta**

1. **Avvia Editor**
   ```
   Premi E
   ```

2. **Seleziona Porta**
   ```
   Click sulla porta nel soggiorno
   ```

3. **Configura Rotazione**
   ```
   - Modalità: Rotazione
   - Cardine: Bordo Sinistro
   - Asse: Y (verticale)
   - Angolo: 90°
   - Velocità: 45°/s
   ```

4. **Test Animazione**
   ```
   Click "▶ Test" → Porta si apre di 90°
   ```

5. **Salva Configurazione**
   ```
   Click "💾 Salva Configurazione"
   Click "📋 Export JSON"
   ```

6. **File JSON Generato**
   ```json
   {
     "objectName": "PORTA_SOGGIORNO(...)",
     "type": "hinged_door",
     "state": "closed",
     "openAngleDeg": 90,
     "pivotLocation": "left"
   }
   ```

---

## 🔄 Sincronizzazione con Altre Scene

L'implementazione del soggiorno è **identica** alle altre scene:
- ✅ BedroomScene.jsx
- ✅ KitchenScene.jsx
- ✅ EsternoScene.jsx
- ✅ **LivingRoomScene.jsx** ← NUOVO

Questo garantisce:
- Comportamento coerente tra scene
- Stessa UX ovunque
- Facilità manutenzione

---

## 📝 Note Sviluppatore

### **Perché il Pattern ROOT?**
Il pattern ROOT (`getMovableNode`) è necessario perché alcuni oggetti in Blender hanno una gerarchia particolare:
```
ROOT (Group vuoto - movibile)
└── Mesh (geometria - non movibile)
```

Animando il ROOT invece della Mesh si ottengono animazioni corrette.

### **Perché Visual Marker Position?**
Il marker rosso mostra dove l'utente ha CLICCATO (centro visivo), mentre l'animazione usa coordinate CORRETTE del pivot. Questo previene confusione quando pivot e centro visivo non coincidono.

### **Perché useMemo sui filledSlots?**
Senza `useMemo`, l'array `filledSlots` viene ricreato ad ogni render, causando loop infiniti nei hook che dipendono da esso.

---

## 🎉 Conclusione

Il tasto E nel soggiorno è ora **completamente funzionale** e offre:
- ✅ Editor animazioni completo
- ✅ Preview in tempo reale
- ✅ Sistema multi-oggetto
- ✅ Export/Import configurazioni
- ✅ Helper visuali intuitivi
- ✅ UX coerente con altre scene

**Pronto per il testing in produzione!** 🚀

---

## 🔗 Riferimenti

- **AnimationEditor.jsx** - Componente UI principale
- **useObjectSelection.js** - Hook selezione oggetti
- **useAnimationPreview.js** - Hook preview singola
- **useMultiObjectAnimationPreview.js** - Hook preview multipla
- **BedroomScene.jsx** - Riferimento implementazione completa
