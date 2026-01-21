# 🔧 MULTI-OBJECT ANIMATION - Guida Implementazione Tecnica

## 📋 Panoramica

Questo documento descrive come estendere l'AnimationEditor esistente per supportare:
1. **Multi-object selection** - selezionare più oggetti contemporaneamente
2. **Sequential animations** - animazioni in sequenza con delay
3. **Synchronized playback** - tutti gli oggetti si muovono insieme

---

## 🎯 Modifiche Necessarie

### 1. AnimationEditor.jsx - State Management

**AGGIUNGI** questi nuovi state all'inizio del componente:

```javascript
// Modalità multi-object
const [multiObjectMode, setMultiObjectMode] = useState(false)
const [selectedObjects, setSelectedObjects] = useState([]) // Array di Object3D
const [objectsLocked, setObjectsLocked] = useState(false)

// Sequenza animazioni
const [sequenceConfig, setSequenceConfig] = useState({
  phase1: { type: 'rotation', config: {} },
  delay: 1000, // millisecondi
  phase2: { type: 'position', config: {} }
})
```

**MODIFICA** la logica di selezione:
- Se `multiObjectMode === true` → aggiungi oggetto a `selectedObjects[]`
- Se `multiObjectMode === false` → comportamento normale (singolo oggetto)

---

### 2. Nuova UI - Multi-Object Section

**INSERISCI** dopo la sezione "Tipo Animazione":

```jsx
{/* Multi-Object Section */}
<div className="animation-editor__section">
  <div className="animation-editor__section-title">Multi-Object</div>
  
  {/* Toggle Multi-Object Mode */}
  <button
    className={`animation-editor__button ${multiObjectMode ? 'active' : ''}`}
    onClick={() => {
      if (objectsLocked) {
        alert('Oggetti bloccati! Resetta per modificare.')
        return
      }
      setMultiObjectMode(!multiObjectMode)
      if (!multiObjectMode) {
        setSelectedObjects([selectedObject]) // Inizia con oggetto corrente
      }
    }}
    disabled={objectsLocked}
  >
    {multiObjectMode ? '✅ Modalità Multi-Object Attiva' : '🔄 Attiva Selezione Multipla'}
  </button>
  
  {/* Lista oggetti selezionati */}
  {multiObjectMode && (
    <div style={{ marginTop: '10px' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>
        Oggetti Selezionati ({selectedObjects.length}):
      </div>
      
      {selectedObjects.map((obj, index) => (
        <div 
          key={obj.uuid}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px',
            background: 'rgba(0,170,255,0.1)',
            borderRadius: '4px',
            marginBottom: '5px'
          }}
        >
          <span style={{ flex: 1, fontSize: '11px', color: '#00aaff' }}>
            {index + 1}. {obj.name || 'Unnamed'}
          </span>
          <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>
            {obj.uuid.substring(0, 8)}...
          </span>
          
          {!objectsLocked && (
            <button
              style={{
                padding: '4px 8px',
                background: '#ff4444',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '10px'
              }}
              onClick={() => {
                setSelectedObjects(selectedObjects.filter(o => o.uuid !== obj.uuid))
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      
      {/* Pulsante Conferma */}
      {!objectsLocked && selectedObjects.length > 0 && (
        <button
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '10px',
            background: '#00ff88',
            border: 'none',
            borderRadius: '8px',
            color: 'black',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={() => {
            setObjectsLocked(true)
            setMultiObjectMode(false) // Disattiva selezione
            alert(`✅ ${selectedObjects.length} oggetti bloccati!`)
          }}
        >
          ✅ Conferma Oggetti ({selectedObjects.length})
        </button>
      )}
      
      {/* Reset */}
      {objectsLocked && (
        <button
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '10px',
            background: '#ff6b6b',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px'
          }}
          onClick={() => {
            setObjectsLocked(false)
            setSelectedObjects([])
            alert('Reset completato')
          }}
        >
          🔓 Reset Selezione
        </button>
      )}
    </div>
  )}
</div>
```

---

### 3. Hook: useMultiObjectSelection.js

**CREA** nuovo file: `src/hooks/useMultiObjectSelection.js`

```javascript
import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { getMovableNode } from '../utils/movableNodeHelper'

/**
 * Hook per gestire selezione multipla di oggetti
 * @param {boolean} enabled - Se la modalità multi-selezione è attiva
 * @param {Array<THREE.Object3D>} selectableObjects - Oggetti selezionabili
 * @param {Function} onAdd - Callback quando oggetto viene aggiunto
 */
export function useMultiObjectSelection({ enabled, selectableObjects, onAdd }) {
  const { raycaster, mouse, camera } = useThree()
  
  useEffect(() => {
    if (!enabled) return
    
    const handleClick = (event) => {
      // Impedisci click su UI
      if (event.target.closest('.animation-editor')) return
      
      // Raycast
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(selectableObjects, true)
      
      if (intersects.length > 0) {
        const object = intersects[0].object
        
        // Risolvi al nodo movibile
        const movable = getMovableNode(object)
        
        console.log('[useMultiObjectSelection] Oggetto cliccato:', object.name)
        console.log('[useMultiObjectSelection] Nodo movibile:', movable.name)
        
        if (onAdd) {
          onAdd(movable)
        }
      }
    }
    
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [enabled, selectableObjects, onAdd, raycaster, mouse, camera])
}
```

**INTEGRA** in BedroomScene dentro AnimationEditorScene:

```javascript
// In AnimationEditorScene component
useMultiObjectSelection({
  enabled: multiObjectMode && !objectsLocked,
  selectableObjects: modelRef.current ? [modelRef.current] : [],
  onAdd: (obj) => {
    console.log('[AnimationEditorScene] Aggiunto oggetto:', obj.name)
    // Notifica parent che deve aggiungere alla lista
    if (onObjectAdded) {
      onObjectAdded(obj)
    }
  }
})
```

---

### 4. Hook: useSequentialAnimation.js

**CREA** nuovo file: `src/hooks/useSequentialAnimation.js`

```javascript
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getMovableNode } from '../utils/movableNodeHelper'

/**
 * Hook per animazioni sequenziali su più oggetti
 * @param {Array<THREE.Object3D>} objects - Array di oggetti da animare
 * @param {Object} sequence - Configurazione sequenza
 * @param {boolean} isPlaying - Trigger per avviare animazione
 * @param {Function} onComplete - Callback a fine animazione
 */
export function useSequentialAnimation(objects, sequence, isPlaying, onComplete) {
  const animationStateRef = useRef({
    phase: 'idle', // 'idle' | 'phase1' | 'delay' | 'phase2' | 'complete'
    startTime: 0,
    phase1Duration: 0,
    delayDuration: 0,
    phase2Duration: 0,
    initialStates: [] // Salva stato iniziale per reset
  })
  
  // Salva stati iniziali quando cambia la lista oggetti
  useEffect(() => {
    if (!objects || objects.length === 0) return
    
    animationStateRef.current.initialStates = objects.map(obj => {
      const movable = getMovableNode(obj)
      return {
        position: movable.position.clone(),
        rotation: movable.rotation.clone(),
        quaternion: movable.quaternion.clone()
      }
    })
  }, [objects])
  
  // Avvia animazione quando isPlaying diventa true
  useEffect(() => {
    if (!isPlaying || !objects || objects.length === 0) return
    
    console.log('[useSequentialAnimation] 🎬 Avvio sequenza animazione')
    console.log('[useSequentialAnimation]   Oggetti:', objects.length)
    console.log('[useSequentialAnimation]   Sequence:', sequence)
    
    // Reset stato
    animationStateRef.current.phase = 'phase1'
    animationStateRef.current.startTime = Date.now()
    
    // Calcola durate fasi
    if (sequence.phase1.type === 'rotation') {
      const angle = sequence.phase1.config.angle || 90
      const speed = sequence.phase1.config.speed || 90
      animationStateRef.current.phase1Duration = (angle / speed) * 1000 // millisecondi
    } else {
      // position
      const distance = calculateDistance(sequence.phase1.config)
      const speed = sequence.phase1.config.speed || 2
      animationStateRef.current.phase1Duration = (distance / speed) * 1000
    }
    
    animationStateRef.current.delayDuration = sequence.delay || 1000
    
    if (sequence.phase2.type === 'position') {
      const distance = calculateDistance(sequence.phase2.config)
      const speed = sequence.phase2.config.speed || 2
      animationStateRef.current.phase2Duration = (distance / speed) * 1000
    }
    
    console.log('[useSequentialAnimation] ⏱️ Durate:', {
      phase1: animationStateRef.current.phase1Duration + 'ms',
      delay: animationStateRef.current.delayDuration + 'ms',
      phase2: animationStateRef.current.phase2Duration + 'ms'
    })
  }, [isPlaying, objects, sequence])
  
  // Frame loop per animazione
  useFrame(() => {
    const state = animationStateRef.current
    if (state.phase === 'idle' || state.phase === 'complete') return
    
    const elapsed = Date.now() - state.startTime
    
    // FASE 1
    if (state.phase === 'phase1') {
      const progress = Math.min(elapsed / state.phase1Duration, 1)
      
      // Applica animazione fase 1 a TUTTI gli oggetti
      objects.forEach((obj, index) => {
        applyAnimation(obj, sequence.phase1, progress, state.initialStates[index])
      })
      
      if (progress >= 1) {
        console.log('[useSequentialAnimation] ✅ Fase 1 completata, inizio DELAY')
        state.phase = 'delay'
        state.startTime = Date.now()
      }
    }
    
    // DELAY
    else if (state.phase === 'delay') {
      if (elapsed >= state.delayDuration) {
        console.log('[useSequentialAnimation] ⏱️ Delay completato, inizio Fase 2')
        state.phase = 'phase2'
        state.startTime = Date.now()
        
        // Salva nuovo stato iniziale per fase 2
        state.initialStates = objects.map(obj => {
          const movable = getMovableNode(obj)
          return {
            position: movable.position.clone(),
            rotation: movable.rotation.clone(),
            quaternion: movable.quaternion.clone()
          }
        })
      }
    }
    
    // FASE 2
    else if (state.phase === 'phase2') {
      const progress = Math.min(elapsed / state.phase2Duration, 1)
      
      // Applica animazione fase 2 a TUTTI gli oggetti
      objects.forEach((obj, index) => {
        applyAnimation(obj, sequence.phase2, progress, state.initialStates[index])
      })
      
      if (progress >= 1) {
        console.log('[useSequentialAnimation] 🎉 Sequenza COMPLETATA!')
        state.phase = 'complete'
        
        if (onComplete) {
          onComplete()
        }
      }
    }
  })
}

// Helper per applicare animazione
function applyAnimation(object, phaseConfig, progress, initialState) {
  const movable = getMovableNode(object)
  
  if (phaseConfig.type === 'rotation') {
    // Applica rotazione
    const config = phaseConfig.config
    const angle = (config.angle || 90) * (config.direction || 1) * (Math.PI / 180)
    const currentAngle = angle * progress
    
    // Ruota attorno al pivot
    const pivot = new THREE.Vector3(config.pivotX, config.pivotY, config.pivotZ)
    
    // Reset a stato iniziale
    movable.position.copy(initialState.position)
    movable.quaternion.copy(initialState.quaternion)
    
    // Applica rotazione
    const axis = new THREE.Vector3()
    axis[config.axis] = 1
    
    movable.position.sub(pivot)
    movable.position.applyAxisAngle(axis, currentAngle)
    movable.position.add(pivot)
    movable.rotateOnAxis(axis, currentAngle)
    
  } else if (phaseConfig.type === 'position') {
    // Applica traslazione
    const config = phaseConfig.config
    const start = new THREE.Vector3(config.startX, config.startY, config.startZ)
    const end = new THREE.Vector3(config.endX, config.endY, config.endZ)
    
    movable.position.lerpVectors(start, end, progress)
  }
}

// Helper per calcolare distanza
function calculateDistance(posConfig) {
  return Math.sqrt(
    Math.pow(posConfig.endX - posConfig.startX, 2) +
    Math.pow(posConfig.endY - posConfig.startY, 2) +
    Math.pow(posConfig.endZ - posConfig.startZ, 2)
  )
}
```

---

## 🚀 Integrazione Completa

### BedroomScene.jsx - Modifiche

**PASSA** array di oggetti invece di singolo oggetto:

```javascript
// Invece di:
selectedObject={selectedObject}

// Usa:
selectedObjects={objectsLocked ? selectedObjects : [selectedObject]}
multiObjectMode={multiObjectMode}
objectsLocked={objectsLocked}
onObjectAdded={(obj) => {
  setSelectedObjects([...selectedObjects, obj])
}}
```

### AnimationEditorScene - Rendering multiplo

```javascript
// Render highlighter per TUTTI gli oggetti
{selectedObjects.map(obj => (
  <ObjectHighlighter
    key={obj.uuid}
    object={obj}
    color="#00ffff"
    showBoundingBox={true}
  />
))}
```

---

## ✅ Checklist Implementazione

- [ ] Aggiungere state management in AnimationEditor
- [ ] Creare UI per multi-object selection
- [ ] Implementare hook useMultiObjectSelection
- [ ] Implementare hook useSequentialAnimation
- [ ] Modificare AnimationEditorScene per array di oggetti
- [ ] Testare con 3 elementi comodino
- [ ] Aggiungere export/import per configurazioni multi-object

---

## 📝 Note Importanti

**Sincronizzazione:**
- Tutti gli oggetti usano lo stesso clock
- Movimento perfettamente sincronizzato
- Stesso progress value per tutti

**Performance:**
- Calcolo matrici world ottimizzato
- Un solo `useFrame` per tutti gli oggetti
- Throttling automatico su mobile

**Debug:**
- Console log dettagliati per ogni fase
- Visualizzazione progress in UI
- Export analisi movimento

---

**Creato:** 22/12/2025  
**Status:** Blueprint tecnico completo - Pronto per implementazione
