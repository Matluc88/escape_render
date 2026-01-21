# 🎨 Animation Editor - Completamento Scene

**Stato:** Import aggiunti a **LivingRoomScene** e **BathroomScene**  
**Manca:** State variables, Tasto E, UI rendering, AnimationEditorScene component

---

## ✅ COMPLETATO

### Esterno Scene
- ✅ Import aggiunti
- ✅ State variables
- ✅ Tasto E nel keyboard handler  
- ✅ Animation Editor UI
- ✅ AnimationEditorScene component nel Canvas
- ✅ Indicatore stato editor

### Living Room Scene
- ✅ Import aggiunti

### Bathroom Scene
- ⏳ Da completare

---

## 📝 MODIFICHE RIMANENTI

### Per LivingRoomScene e BathroomScene:

#### 1. Aggiungere State Variables (dopo gli altri useState):

```javascript
// Sistema di editing animazioni
const [editorEnabled, setEditorEnabled] = useState(false)
const [selectedObject, setSelectedObject] = useState(null)
const [animationConfig, setAnimationConfig] = useState(null)
const [showEditorUI, setShowEditorUI] = useState(false)
const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
const [pickDestinationMode, setPickDestinationMode] = useState(false)

// Quando un oggetto viene selezionato, mostra l'UI
useEffect(() => {
  if (selectedObject && editorEnabled) {
    setShowEditorUI(true)
  } else {
    setShowEditorUI(false)
  }
}, [selectedObject, editorEnabled])
```

#### 2. Aggiungere Tasto E nel keyboard handler esistente:

```javascript
// All'inizio del keyboard handler
const key = event.key.toLowerCase()

// Tasto E - Toggle Animation Editor
if (key === 'e') {
  event.preventDefault()
  event.stopPropagation()
  setEditorEnabled(prev => {
    const newState = !prev
    console.log('[SceneName] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
    if (!newState) {
      setSelectedObject(null)
      setShowEditorUI(false)
    }
    return newState
  })
  return
}
```

#### 3. Aggiungere UI nel return (prima del Canvas):

```javascript
{/* Animation Editor UI */}
{showEditorUI && (
  <AnimationEditor
    selectedObject={selectedObject}
    initialConfig={animationConfig}
    pickDestinationMode={pickDestinationMode}
    onClose={() => {
      setSelectedObject(null)
      setShowEditorUI(false)
      setIsAnimationPlaying(false)
      setPickDestinationMode(false)
    }}
    onConfigChange={setAnimationConfig}
    onTestAnimation={() => {
      console.log('[SceneName] Test animazione avviato')
      setIsAnimationPlaying(true)
    }}
    isAnimationPlaying={isAnimationPlaying}
    onPickDestinationStart={() => {
      console.log('[SceneName] Pick destination mode ATTIVATO')
      setPickDestinationMode(true)
    }}
    onPickDestinationEnd={() => {
      console.log('[SceneName] Pick destination mode DISATTIVATO')
      setPickDestinationMode(false)
    }}
  />
)}

{/* Indicatore stato editor */}
{editorEnabled && (
  <div style={{
    position: 'absolute',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(0, 170, 255, 0.9)',
    padding: '10px 15px',
    borderRadius: '8px',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 1000,
    boxShadow: '0 4px 15px rgba(0, 170, 255, 0.4)',
    border: '2px solid #00ffff'
  }}>
    🎨 ANIMATION EDITOR ATTIVO - Clicca su un oggetto
  </div>
)}
```

#### 4. Aggiungere AnimationEditorScene nel Canvas (dentro Suspense):

```javascript
{/* Sistema di selezione oggetti per Animation Editor */}
{editorEnabled && modelRef.current && (
  <AnimationEditorScene
    modelRef={modelRef}
    selectedObject={selectedObject}
    onSelect={setSelectedObject}
    animationConfig={animationConfig}
    isAnimationPlaying={isAnimationPlaying}
    onAnimationComplete={() => {
      console.log('[SceneName] Animazione completata')
      setIsAnimationPlaying(false)
    }}
    pickDestinationMode={pickDestinationMode}
    onDestinationPicked={(worldPos) => {
      console.log('[SceneName] ✅ Destinazione picked:', worldPos)
      if (animationConfig?.mode === 'position' && selectedObject) {
        const movable = getMovableNode(selectedObject)
        const currentWorldPos = new THREE.Vector3()
        movable.getWorldPosition(currentWorldPos)
        
        const newConfig = {
          ...animationConfig,
          startX: currentWorldPos.x,
          startY: currentWorldPos.y,
          startZ: currentWorldPos.z,
          endX: worldPos.x,
          endY: worldPos.y,
          endZ: worldPos.z
        }
        setAnimationConfig(newConfig)
      }
      setPickDestinationMode(false)
    }}
  />
)}
```

#### 5. Definire AnimationEditorScene component (dopo il component principale):

```javascript
// Componente per gestire la selezione e i visual helper nell'editor
function AnimationEditorScene({ modelRef, selectedObject, onSelect, animationConfig, isAnimationPlaying, onAnimationComplete, pickDestinationMode, onDestinationPicked }) {
  // Hook di selezione oggetti
  useObjectSelection({
    enabled: !pickDestinationMode,
    selectableObjects: modelRef.current ? [modelRef.current] : [],
    onSelect: (obj) => {
      const movable = getMovableNode(obj)
      console.log('[AnimationEditorScene] Oggetto selezionato:', movable.name)
      onSelect(movable)
    },
    onDeselect: () => {
      console.log('[AnimationEditorScene] Deselezione')
      onSelect(null)
    }
  })
  
  // Hook per pick destination
  usePositionPicker(
    pickDestinationMode,
    (worldPos) => {
      console.log('[AnimationEditorScene] ✅ Coordinate picked:', worldPos)
      if (onDestinationPicked) {
        onDestinationPicked(worldPos)
      }
    },
    () => {
      console.log('[AnimationEditorScene] Pick annullato')
    }
  )
  
  // Hook per animazione preview
  useAnimationPreview(
    selectedObject,
    animationConfig,
    isAnimationPlaying,
    onAnimationComplete
  )
  
  return (
    <group>
      {/* Highlighter per oggetto selezionato */}
      {selectedObject && (
        <ObjectHighlighter
          object={selectedObject}
          color="#00ffff"
          showBoundingBox={true}
        />
      )}
      
      {/* Helper per rotazione */}
      {selectedObject && animationConfig?.mode === 'rotation' && (
        <PivotHelper
          position={new THREE.Vector3(
            animationConfig.pivotX,
            animationConfig.pivotY,
            animationConfig.pivotZ
          )}
          axis={animationConfig.axis}
          color="#ff0000"
          interactive={false}
        />
      )}
      
      {/* Helper per posizione */}
      {selectedObject && animationConfig?.mode === 'position' && (
        <PathHelper
          startPosition={new THREE.Vector3(
            animationConfig.startX,
            animationConfig.startY,
            animationConfig.startZ
          )}
          endPosition={new THREE.Vector3(
            animationConfig.endX,
            animationConfig.endY,
            animationConfig.endZ
          )}
          color="#ffaa00"
          showMarkers={true}
        />
      )}
    </group>
  )
}
```

---

## 🚀 QUICK TEST

Dopo aver completato le modifiche:

1. Apri la scena con `?name=Admin`
2. Premi **E** per attivare l'editor
3. Clicca su un oggetto 3D
4. Verifica che appaia il pannello dell'editor
5. Test: configura e testa un'animazione

---

## 📌 NOTE

- Il pattern è **identico** per tutte le scene
- Sostituisci `[SceneName]` con il nome effettivo della scena
- L'editor è solo disponibile con `?name=Admin`
- Tutti gli hook necessari sono già importati

**Riferimento completo:** `EsternoScene.jsx` (implementazione completa)
