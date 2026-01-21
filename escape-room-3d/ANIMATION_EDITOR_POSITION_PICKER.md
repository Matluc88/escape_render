# 📍 Animation Editor - Sistema Pick Destination

## 🎯 Cosa è stato Implementato

### ✅ Nuovi File Creati

#### 1. **usePositionPicker.js** - Hook per Click Interattivo
- Hook React personalizzato per catturare coordinate 3D da click nella scena
- Raycasting automatico su tutti gli oggetti
- Supporto ESC per annullare
- Cursore crosshair durante selezione

#### 2. **PositionPathVisualizer.jsx** - Visual Feedback 3D
- Linea tratteggiata cyan da Start a End
- Marker verde sul punto di origine
- Marker verde lime brillante sul punto destinazione
- Ring animato attorno alla destinazione

### ✅ Modifiche all'Animation Editor

#### Nuovi Handler
- `handlePickDestination()` - Attiva modalità selezione
- `handleDestinationPicked(worldPosition)` - Riceve coordinate dal click
- `handleCancelPick()` - Annulla selezione (ESC)
- `handleImportJSON()` - Carica configurazioni da file JSON

#### Nuova UI
- **Pulsante "📍 Scegli Destinazione con Click"** nella sezione Posizione
- **Pulsante "📂 Carica Config"** nella sezione azioni
- **Display Punto A (Origine)** - Read-only, verde
- **Display Punto B (Destinazione)** - Aggiornato automaticamente, cyan
- **Hint animato** quando in pick mode

---

## 🔧 Come Completare l'Integrazione

### Step 1: Integrare usePositionPicker in una Scena

Esempio per **KitchenScene.jsx** (o qualsiasi altra scena):

```jsx
import { usePositionPicker } from '../hooks/usePositionPicker'
import PositionPathVisualizer from '../components/3D/PositionPathVisualizer'

function KitchenScene() {
  // ... codice esistente ...
  
  // Stato per pick mode
  const [pickDestinationActive, setPickDestinationActive] = useState(false)
  const [destinationPickedCallback, setDestinationPickedCallback] = useState(null)
  
  // Integra l'hook
  usePositionPicker(
    pickDestinationActive,
    (worldPos) => {
      console.log('[KitchenScene] Destinazione picked:', worldPos)
      if (destinationPickedCallback) {
        destinationPickedCallback(worldPos)
      }
      setPickDestinationActive(false)
    },
    () => {
      console.log('[KitchenScene] Pick annullato')
      setPickDestinationActive(false)
    }
  )
  
  return (
    <Canvas>
      {/* ... resto della scena ... */}
      
      {/* Visual feedback per animazione posizione */}
      {animationConfig?.mode === 'position' && (
        <PositionPathVisualizer 
          config={animationConfig}
          visible={true}
        />
      )}
      
      {/* Animation Editor */}
      {editorOpen && (
        <AnimationEditor
          selectedObject={selectedObject}
          onClose={() => setEditorOpen(false)}
          onConfigChange={setAnimationConfig}
          onTestAnimation={handleTestAnimation}
          isAnimationPlaying={isAnimating}
          onPickDestinationStart={() => {
            console.log('[KitchenScene] Pick destination start')
            setPickDestinationActive(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[KitchenScene] Pick destination end')
            setPickDestinationActive(false)
          }}
        />
      )}
    </Canvas>
  )
}
```

### Step 2: Collegare Callback Destinazione

Nel componente che usa AnimationEditor, devi connettere il callback:

```jsx
// Quando AnimationEditor chiama onPickDestinationStart
const handlePickStart = useCallback(() => {
  setPickDestinationActive(true)
}, [])

// Quando usePositionPicker cattura il click
const handlePositionPicked = useCallback((worldPos) => {
  // Questa funzione viene passata all'editor tramite props
  // L'editor la usa per aggiornare positionConfig
  if (editorRef.current) {
    editorRef.current.handleDestinationPicked(worldPos)
  }
}, [])
```

### Step 3: Testare il Workflow

1. **Apri Animation Editor** (tasto E)
2. **Click su oggetto** (es: un libro)
3. **Seleziona modalità "📍 Posizione"**
4. **Click "📍 Scegli Destinazione con Click"**
   - Cursore diventa crosshair
   - UI mostra hint "In attesa del click..."
5. **Click su punto nella scena 3D**
   - Coordinate catturate automaticamente
   - Punto B aggiornato
   - Linea tratteggiata appare
6. **Test animazione** → Oggetto si muove!
7. **Salva o Export JSON**

---

## 📋 Formato JSON Export

### Per Animazioni di Posizione

```json
{
  "objectName": "Libro_001",
  "mode": "position",
  "type": "movable",
  "state": "origin",
  "startX": 1.234,
  "startY": 0.856,
  "startZ": 2.100,
  "endX": 3.567,
  "endY": 0.856,
  "endZ": 1.543,
  "speed": 2.0,
  "_timestamp": "2025-12-17T14:30:00Z"
}
```

### Import JSON

1. Click **"📂 Carica Config"**
2. Seleziona file `.json`
3. Sistema valida automaticamente:
   - Campi richiesti presenti
   - Tipo corretto (position/rotation)
4. Configurazione applicata immediatamente
5. ✅ Pronto per test!

---

## 🎨 Visual Feedback 3D

### PositionPathVisualizer mostra:

- **Linea cyan tratteggiata**: Percorso Start → End
- **Marker verde scuro (A)**: Punto di origine (0.05m radius)
- **Marker verde lime (B)**: Punto destinazione (0.08m radius)
- **Ring verde**: Attorno al punto B per visibilità

### Props PositionPathVisualizer

```jsx
<PositionPathVisualizer
  config={{
    startX, startY, startZ,
    endX, endY, endZ
  }}
  visible={true}
/>
```

---

## 🔑 Props AnimationEditor (Aggiornate)

```jsx
<AnimationEditor
  selectedObject={object3D}           // THREE.Object3D
  onClose={handleClose}               // Function
  onConfigChange={handleConfigChange} // Function
  onTestAnimation={handleTest}        // Function
  isAnimationPlaying={boolean}        // Boolean
  initialConfig={config}              // Object (opzionale)
  
  // NUOVE PROPS per Pick Destination
  onPickDestinationStart={callback}   // Function - chiamata quando attiva pick
  onPickDestinationEnd={callback}     // Function - chiamata quando disattiva pick
/>
```

---

## 🎯 Vantaggi del Sistema

### Per Utenti
✅ **2 click** invece di inserire 6 numeri manualmente  
✅ **Visual feedback** immediato con linea 3D  
✅ **Coordinate precise** al pixel  
✅ **No errori** di digitazione  

### Per Developer
✅ **Riusabile** in qualsiasi scena  
✅ **Modulare** - hook separato dal componente  
✅ **Import/Export** JSON per persistenza  
✅ **Validazione** automatica dei file  

---

## 🚀 Next Steps (Opzionali)

### Miglioramenti Futuri

1. **Multi-waypoint**: Più punti intermedi per percorsi complessi
2. **Curve paths**: Bezier curves invece di linee rette
3. **Speed zones**: Velocità variabile lungo il percorso
4. **Collision avoidance**: Evita ostacoli automaticamente
5. **Animation library**: Browser di animazioni salvate

### Integrazione ESP32/MQTT

Quando un oggetto raggiunge la destinazione, puoi triggerare eventi:

```javascript
// In useAnimationPreview.js
if (animationProgress.current >= 1 && direction.current === 1) {
  // Oggetto ha raggiunto la destinazione
  mqtt.publish('escape-room/object/reached', {
    objectName: config.objectName,
    position: { x: endX, y: endY, z: endZ }
  })
}
```

---

## 📞 Support

Se hai bisogno di assistenza:
1. Controlla console browser per log dettagliati
2. Verifica che tutte le props siano passate correttamente
3. Assicurati che `usePositionPicker` sia integrato nella scena

---

**Creato:** 17/12/2025  
**Versione:** Animation Editor v2.1  
**Autore:** Cline AI Assistant
