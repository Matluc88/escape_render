// AnimationEditor.jsx
// Componente principale per l'editing delle animazioni in real-time

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import './AnimationEditor.css'
import ValidationBadge from './ValidationBadge'
import { getMovableNode, getMovablePosition } from '../../utils/movableNodeHelper'

/**
 * Componente AnimationEditor - UI per configurare animazioni
 * @param {THREE.Object3D} selectedObject - Oggetto 3D selezionato
 * @param {Function} onClose - Callback per chiudere l'editor
 * @param {Function} onConfigChange - Callback quando la configurazione cambia
 * @param {Object} initialConfig - Configurazione iniziale (opzionale)
 */
export default function AnimationEditor({ 
  selectedObject, 
  onClose,
  onConfigChange,
  onTestAnimation,
  isAnimationPlaying = false,
  initialConfig = null,
  onPickDestinationStart,
  onPickDestinationEnd,
  pickDestinationMode: externalPickMode = false,
  slots: externalSlots = [],
  onSlotsChange,
  multiObjectMode: externalMultiObjectMode = false,
  onMultiObjectModeChange,
  objectsLocked: externalObjectsLocked = false,
  onObjectsLockedChange,
  modelRef = null,  // 🆕 Root della scena per cercare oggetti
  comodinoPartsRef = null  // 🆕 REF DIRETTO per oggetti comodino (bypassa timing issue)
}) {
  // Modalità UI: 'guided' o 'advanced'
  const [uiMode, setUiMode] = useState('guided')
  
  // Modalità animazione: 'rotation' o 'position'
  const [mode, setMode] = useState(initialConfig?.mode || 'rotation')
  
  // 🔄 Sistema Multi-Object con Slot - USA PROPS ESTERNE
  const multiObjectMode = externalMultiObjectMode
  const setMultiObjectMode = onMultiObjectModeChange || (() => {})
  const slots = externalSlots
  const setSlots = onSlotsChange || (() => {})
  const objectsLocked = externalObjectsLocked
  const setObjectsLocked = onObjectsLockedChange || (() => {})
  
  // Stato per pick destination mode
  const [pickDestinationMode, setPickDestinationMode] = useState(false)
  
  // Sincronizza stato interno con prop esterno
  useEffect(() => {
    setPickDestinationMode(externalPickMode)
  }, [externalPickMode])
  
  // Configurazione per rotazione
  const [rotationConfig, setRotationConfig] = useState(() => {
    if (initialConfig?.mode === 'rotation') {
      return initialConfig
    }
    
    // ✅ FIX: Safe initialization se selectedObject è null
    if (!selectedObject) {
      // Default values sicuri
      return {
        pivotX: 0,
        pivotY: 0,
        pivotZ: 0,
        axis: 'y',
        angle: 90,
        speed: 45,
        direction: 1
      }
    }
    
    // Valori default per rotazione CON VINCOLI REALISTICI
    const box = new THREE.Box3().setFromObject(selectedObject)
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    // Auto-detect tipo oggetto dal nome
    const objectType = detectObjectType(selectedObject.name)
    const preset = getRotationPreset(objectType, box, center)
    
    return preset
  })
  
  // Configurazione per posizione
  const [positionConfig, setPositionConfig] = useState(() => {
    if (initialConfig?.mode === 'position') {
      return initialConfig
    }
    
    // ✅ FIX: Safe initialization se selectedObject è null
    if (!selectedObject) {
      return {
        startX: 0,
        startY: 0,
        startZ: 0,
        endX: 1,
        endY: 0.5,
        endZ: 0,
        speed: 2.0
      }
    }
    
    // 🪑 SPECIAL CASE: Se oggetto è dentro un PIVOT (comodino), leggi posizione WORLD del pivot
    let movablePos = new THREE.Vector3()
    
    if (selectedObject.parent && selectedObject.parent.name === 'PIVOT_Comodino') {
      // Leggi posizione WORLD del pivot (non del mesh!)
      selectedObject.parent.getWorldPosition(movablePos)
      console.log('[AnimationEditor] 🪑 Init position config - COMODINO DENTRO PIVOT')
      console.log('[AnimationEditor]   Oggetto mesh:', selectedObject.name)
      console.log('[AnimationEditor]   Parent pivot:', selectedObject.parent.name)
      console.log('[AnimationEditor]   Posizione WORLD pivot:', movablePos)
    } else {
      // ✅ USA NODO MOVIBILE per posizione iniziale (caso normale)
      const movable = getMovableNode(selectedObject)
      movablePos = movable ? movable.position.clone() : new THREE.Vector3()
      
      console.log('[AnimationEditor] Init position config - oggetto:', selectedObject.name)
      console.log('[AnimationEditor]   Nodo movibile:', movable?.name)
      console.log('[AnimationEditor]   Posizione:', movablePos)
    }
    
    return {
      startX: movablePos.x,
      startY: movablePos.y,
      startZ: movablePos.z,
      endX: movablePos.x + 1,
      endY: movablePos.y + 0.5,
      endZ: movablePos.z,
      speed: 2.0
    }
  })
  
  // Stato per preview animazione
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  
  // Info oggetto selezionato
  const objectInfo = useRef(null)
  
  useEffect(() => {
    if (!selectedObject) return
    
    const box = new THREE.Box3().setFromObject(selectedObject)
    const size = new THREE.Vector3()
    box.getSize(size)
    
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    const worldPosition = new THREE.Vector3()
    selectedObject.getWorldPosition(worldPosition)
    
    objectInfo.current = {
      name: selectedObject.name || 'Unnamed Object',
      position: worldPosition,
      boundingBox: { min: box.min, max: box.max, center, size }
    }
  }, [selectedObject])
  
  // Ref per tracciare l'ultimo initialConfig processato
  const lastInitialConfigRef = useRef(null)
  
  // Sincronizza stato interno con initialConfig quando cambia dall'esterno
  useEffect(() => {
    if (initialConfig && initialConfig.mode === 'position') {
      // Confronta con l'ultimo config processato
      const lastConfig = lastInitialConfigRef.current
      
      // Aggiorna se è diverso - controlla SIA Punto A CHE Punto B
      const isDifferent = !lastConfig || 
          Math.abs(lastConfig.startX - initialConfig.startX) > 0.001 ||
          Math.abs(lastConfig.startY - initialConfig.startY) > 0.001 ||
          Math.abs(lastConfig.startZ - initialConfig.startZ) > 0.001 ||
          Math.abs(lastConfig.endX - initialConfig.endX) > 0.001 ||
          Math.abs(lastConfig.endY - initialConfig.endY) > 0.001 ||
          Math.abs(lastConfig.endZ - initialConfig.endZ) > 0.001
      
      if (isDifferent) {
        console.log('[AnimationEditor] 🔄 Sincronizzazione con initialConfig:', initialConfig)
        console.log('[AnimationEditor] 📍 Punto A:', initialConfig.startX.toFixed(3), initialConfig.startY.toFixed(3), initialConfig.startZ.toFixed(3))
        console.log('[AnimationEditor] 🎯 Punto B:', initialConfig.endX.toFixed(3), initialConfig.endY.toFixed(3), initialConfig.endZ.toFixed(3))
        
        setPositionConfig({
          startX: initialConfig.startX,
          startY: initialConfig.startY,
          startZ: initialConfig.startZ,
          endX: initialConfig.endX,
          endY: initialConfig.endY,
          endZ: initialConfig.endZ,
          speed: initialConfig.speed
        })
        
        // Salva il config appena processato
        lastInitialConfigRef.current = initialConfig
      }
    }
  }, [initialConfig])
  
  // Quando cambia la configurazione, notifica il parent
  useEffect(() => {
    const config = mode === 'rotation' ? 
      { mode: 'rotation', ...rotationConfig } : 
      { mode: 'position', ...positionConfig }
    
    if (onConfigChange) {
      onConfigChange(config)
    }
  }, [mode, rotationConfig, positionConfig, onConfigChange])
  
  // Handler per cambio modalità
  const handleModeChange = (newMode) => {
    setMode(newMode)
    setIsAnimating(false)
    setAnimationProgress(0)
  }
  
  // useEffect per rileggere posizione dopo detach quando mode cambia
  useEffect(() => {
    console.log('[AnimationEditor] ⚠️ useEffect CHIAMATO! mode:', mode, 'selectedObject:', selectedObject?.name)
    
    if (mode === 'position' && selectedObject) {
      console.log('[AnimationEditor] ✅ Condizione soddisfatta - mode è position e selectedObject esiste')
      console.log('[AnimationEditor] 🕐 Avvio timeout di 500ms per aspettare detach...')
      
      // Aspetta che il detach sia completato (500ms)
      setTimeout(() => {
        // 🪑 SPECIAL CASE: Se oggetto è dentro un PIVOT, leggi posizione WORLD del pivot
        let movablePos = new THREE.Vector3()
        
        if (selectedObject.parent && selectedObject.parent.name === 'PIVOT_Comodino') {
          // Leggi posizione WORLD del pivot (non del mesh!)
          selectedObject.parent.getWorldPosition(movablePos)
          console.log('[AnimationEditor] 🪑 🔄 Rilettura posizione dopo detach - COMODINO DENTRO PIVOT')
          console.log('[AnimationEditor]    Oggetto mesh:', selectedObject.name)
          console.log('[AnimationEditor]    Parent pivot:', selectedObject.parent.name)
          console.log('[AnimationEditor]    Posizione WORLD pivot:', movablePos)
        } else {
          // ✅ USA NODO MOVIBILE per leggere posizione (caso normale)
          const movable = getMovableNode(selectedObject)
          movablePos = movable ? movable.position.clone() : new THREE.Vector3()
          
          console.log('[AnimationEditor] 🔄 Rilettura posizione dopo detach:')
          console.log('[AnimationEditor]    Oggetto:', selectedObject.name)
          console.log('[AnimationEditor]    Parent:', selectedObject.parent?.name || selectedObject.parent?.type)
          console.log('[AnimationEditor]    Nodo movibile:', movable?.name)
          console.log('[AnimationEditor]    Movable pos:', movablePos)
          console.log('[AnimationEditor]    Mesh local pos:', selectedObject.position)
        }
        
        setPositionConfig({
          startX: movablePos.x,
          startY: movablePos.y,
          startZ: movablePos.z,
          endX: movablePos.x + 1,
          endY: movablePos.y + 0.5,
          endZ: movablePos.z,
          speed: 2.0
        })
      }, 500)
    } else {
      console.log('[AnimationEditor] ❌ Condizione NON soddisfatta:')
      console.log('[AnimationEditor]    mode === "position"?', mode === 'position')
      console.log('[AnimationEditor]    selectedObject esiste?', !!selectedObject)
    }
  }, [mode, selectedObject]) // Esegui quando mode o selectedObject cambiano
  
  // Handler per test animazione
  const handleTestAnimation = () => {
    if (onTestAnimation) {
      onTestAnimation()
    }
  }
  
  // Sincronizza stato interno con prop esterna
  useEffect(() => {
    setIsAnimating(isAnimationPlaying)
  }, [isAnimationPlaying])
  
  // Handler per salvataggio configurazione
  const handleSave = () => {
    const config = mode === 'rotation' ? 
      { mode: 'rotation', ...rotationConfig } : 
      { mode: 'position', ...positionConfig }
    
    console.log('[AnimationEditor] Configurazione salvata:', config)
    
    // Salva in localStorage per persistenza
    const savedConfigs = JSON.parse(localStorage.getItem('animationConfigs') || '{}')
    savedConfigs[selectedObject.name] = config
    localStorage.setItem('animationConfigs', JSON.stringify(savedConfigs))
    
    alert('Configurazione salvata!')
  }
  
  // Handler per export COORDINATE ANALYSIS (PENTOLA + ANIMAZIONE)
  const handleExportCoordinates = () => {
    const worldPos = new THREE.Vector3()
    selectedObject.getWorldPosition(worldPos)
    
    const localPos = selectedObject.position.clone()
    const bbox = new THREE.Box3().setFromObject(selectedObject)
    
    // Analisi coordinate
    const analysis = {
      timestamp: new Date().toISOString(),
      
      // DATI OGGETTO SELEZIONATO
      object: {
        name: selectedObject.name,
        uuid: selectedObject.uuid,
        type: selectedObject.type,
        parent: selectedObject.parent ? selectedObject.parent.name : null,
        
        // Posizione REALE attuale
        position_world: {
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z
        },
        position_local: {
          x: localPos.x,
          y: localPos.y,
          z: localPos.z
        },
        
        // Bounding box
        bounding_box: {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
          center: {
            x: (bbox.min.x + bbox.max.x) / 2,
            y: (bbox.min.y + bbox.max.y) / 2,
            z: (bbox.min.z + bbox.max.z) / 2
          },
          size: {
            x: bbox.max.x - bbox.min.x,
            y: bbox.max.y - bbox.min.y,
            z: bbox.max.z - bbox.min.z
          }
        },
        
        rotation: {
          x: selectedObject.rotation.x,
          y: selectedObject.rotation.y,
          z: selectedObject.rotation.z
        }
      },
      
      // CONFIGURAZIONE ANIMAZIONE
      animation: mode === 'rotation' ? {
        mode: 'rotation',
        pivot: {
          x: rotationConfig.pivotX,
          y: rotationConfig.pivotY,
          z: rotationConfig.pivotZ
        },
        axis: rotationConfig.axis,
        angle: rotationConfig.angle,
        speed: rotationConfig.speed,
        direction: rotationConfig.direction
      } : {
        mode: 'position',
        start: {
          x: positionConfig.startX,
          y: positionConfig.startY,
          z: positionConfig.startZ
        },
        end: {
          x: positionConfig.endX,
          y: positionConfig.endY,
          z: positionConfig.endZ
        },
        speed: positionConfig.speed,
        
        // ANALISI DELTA
        delta: {
          x: positionConfig.endX - positionConfig.startX,
          y: positionConfig.endY - positionConfig.startY,
          z: positionConfig.endZ - positionConfig.startZ,
          distance: Math.sqrt(
            Math.pow(positionConfig.endX - positionConfig.startX, 2) +
            Math.pow(positionConfig.endY - positionConfig.startY, 2) +
            Math.pow(positionConfig.endZ - positionConfig.startZ, 2)
          )
        }
      },
      
      // DISCREPANZE (se mode è position)
      discrepancies: mode === 'position' ? {
        point_a_vs_current_position: {
          x_diff: positionConfig.startX - worldPos.x,
          y_diff: positionConfig.startY - worldPos.y,
          z_diff: positionConfig.startZ - worldPos.z,
          total_distance: Math.sqrt(
            Math.pow(positionConfig.startX - worldPos.x, 2) +
            Math.pow(positionConfig.startY - worldPos.y, 2) +
            Math.pow(positionConfig.startZ - worldPos.z, 2)
          )
        },
        notes: "Se total_distance > 0.001, c'è discrepanza tra Punto A e posizione reale"
      } : null,
      
      // ✅ COORDINATE REALI dal tracker (se disponibili)
      real_movement: typeof window !== 'undefined' && window.__PENTOLA_REAL_MOVEMENT ? {
        ...window.__PENTOLA_REAL_MOVEMENT,
        comparison: {
          configured_start: mode === 'position' ? { x: positionConfig.startX, y: positionConfig.startY, z: positionConfig.startZ } : null,
          configured_end: mode === 'position' ? { x: positionConfig.endX, y: positionConfig.endY, z: positionConfig.endZ } : null,
          
          // Discrepanza START configurato vs START reale
          start_discrepancy: mode === 'position' && window.__PENTOLA_REAL_START ? {
            x_diff: positionConfig.startX - window.__PENTOLA_REAL_START.x,
            y_diff: positionConfig.startY - window.__PENTOLA_REAL_START.y,
            z_diff: positionConfig.startZ - window.__PENTOLA_REAL_START.z,
            distance: Math.sqrt(
              Math.pow(positionConfig.startX - window.__PENTOLA_REAL_START.x, 2) +
              Math.pow(positionConfig.startY - window.__PENTOLA_REAL_START.y, 2) +
              Math.pow(positionConfig.startZ - window.__PENTOLA_REAL_START.z, 2)
            )
          } : null,
          
          // Discrepanza END configurato vs END reale
          end_discrepancy: mode === 'position' && window.__PENTOLA_REAL_END ? {
            x_diff: positionConfig.endX - window.__PENTOLA_REAL_END.x,
            y_diff: positionConfig.endY - window.__PENTOLA_REAL_END.y,
            z_diff: positionConfig.endZ - window.__PENTOLA_REAL_END.z,
            distance: Math.sqrt(
              Math.pow(positionConfig.endX - window.__PENTOLA_REAL_END.x, 2) +
              Math.pow(positionConfig.endY - window.__PENTOLA_REAL_END.y, 2) +
              Math.pow(positionConfig.endZ - window.__PENTOLA_REAL_END.z, 2)
            )
          } : null,
          
          notes: {
            start: "Confronto tra Punto A configurato e posizione START effettiva",
            end: "Confronto tra Punto B configurato e posizione END effettiva - QUI TROVI LE DISCREPANZE!",
            usage: "Se end_discrepancy.distance > 0.01m, il Punto B configurato NON corrisponde a dove va davvero la pentola"
          }
        }
      } : null
    }
    
    console.log('[AnimationEditor] 📊 Export Coordinate Analysis:', analysis)
    
    const json = JSON.stringify(analysis, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coordinates_${selectedObject.name}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('✅ Coordinate esportate con successo!')
  }
  
  // Handler per export JSON SEMANTICO
  const handleExportJSON = () => {
    let semanticConfig
    
    if (mode === 'rotation') {
      // ✅ FORMATO SEMANTICO per rotazioni
      // Deduce pivotLocation dalle coordinate
      const box = new THREE.Box3().setFromObject(selectedObject)
      const center = new THREE.Vector3()
      box.getCenter(center)
      
      let pivotLocation = 'left' // Default
      const tolerance = 0.1
      
      if (Math.abs(rotationConfig.pivotX - box.min.x) < tolerance) {
        pivotLocation = 'left'
      } else if (Math.abs(rotationConfig.pivotX - box.max.x) < tolerance) {
        pivotLocation = 'right'
      } else if (Math.abs(rotationConfig.pivotX - center.x) < tolerance) {
        pivotLocation = 'center'
      }
      
      // Deduce type dal nome oggetto
      const objectType = detectObjectType(selectedObject.name)
      const typeMap = {
        'porta': 'hinged_door',
        'anta': 'hinged_door',
        'sportello': 'hinged_door',
        'cassetto': 'drawer',
        'finestra': 'window',
        'generico': 'hinged_door'
      }
      
      semanticConfig = {
        objectName: selectedObject.name,
        type: typeMap[objectType] || 'hinged_door',
        state: 'closed', // Default: assume chiusa
        openAngleDeg: rotationConfig.angle, // CHIARO: gradi
        pivotLocation, // SEMANTICO: posizione invece di coordinate
        
        // Metadata opzionali
        _notes: "Generated by Animation Editor V2.0",
        _timestamp: new Date().toISOString()
      }
      
      console.log('[AnimationEditor] ✅ Export JSON SEMANTICO:', semanticConfig)
      console.log('[AnimationEditor] ⚠️ Campi ignorati (dedotti a runtime):', {
        axis: rotationConfig.axis,
        direction: rotationConfig.direction,
        speed: rotationConfig.speed,
        pivotX: rotationConfig.pivotX,
        pivotY: rotationConfig.pivotY,
        pivotZ: rotationConfig.pivotZ
      })
      
    } else {
      // Per animazioni di posizione (TODO: formato semantico)
      semanticConfig = {
        objectName: selectedObject.name,
        type: 'movable',
        state: 'origin',
        targetX: positionConfig.endX,
        targetY: positionConfig.endY,
        targetZ: positionConfig.endZ,
        _timestamp: new Date().toISOString()
      }
    }
    
    const json = JSON.stringify(semanticConfig, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `animation_${selectedObject.name}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Handler per auto-fix configurazione
  const handleAutoFix = (checks) => {
    console.log('[AnimationEditor] Auto-fix attivato', checks)
    
    // Se in modalità rotazione, correggi i valori fuori range
    if (mode === 'rotation') {
      const newConfig = { ...rotationConfig }
      
      // Correggi angolo se fuori range
      if (!checks.angle?.valid) {
        newConfig.angle = Math.max(30, Math.min(120, newConfig.angle))
      }
      
      // Correggi velocità se fuori range
      if (!checks.speed?.valid) {
        newConfig.speed = Math.max(45, Math.min(180, newConfig.speed))
      }
      
      // Correggi cardine se fuori bounding box
      if (!checks.pivot?.valid && objectInfo.current) {
        const box = objectInfo.current.boundingBox
        newConfig.pivotX = Math.max(box.min.x, Math.min(box.max.x, newConfig.pivotX))
        newConfig.pivotY = Math.max(box.min.y, Math.min(box.max.y, newConfig.pivotY))
        newConfig.pivotZ = Math.max(box.min.z, Math.min(box.max.z, newConfig.pivotZ))
      }
      
      setRotationConfig(newConfig)
      alert('Configurazione corretta automaticamente!')
    }
  }
  
  // Handler per auto-posizionamento cardine sui bordi
  const handleSnapPivotToEdge = (edge) => {
    const box = new THREE.Box3().setFromObject(selectedObject)
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    let newPivot = { ...rotationConfig }
    
    switch (edge) {
      case 'left':
        newPivot.pivotX = box.min.x
        break
      case 'right':
        newPivot.pivotX = box.max.x
        break
      case 'top':
        newPivot.pivotY = box.max.y
        break
      case 'bottom':
        newPivot.pivotY = box.min.y
        break
      case 'front':
        newPivot.pivotZ = box.max.z
        break
      case 'back':
        newPivot.pivotZ = box.min.z
        break
      case 'center':
        newPivot.pivotX = center.x
        newPivot.pivotY = center.y
        newPivot.pivotZ = center.z
        break
    }
    
    setRotationConfig(newPivot)
  }
  
  // Handler per attivare pick destination mode
  const handlePickDestination = () => {
    console.log('[AnimationEditor] Attivazione pick destination mode')
    setPickDestinationMode(true)
    
    // Notifica parent component
    if (onPickDestinationStart) {
      onPickDestinationStart()
    }
  }
  
  // Handler quando viene selezionata una destinazione
  const handleDestinationPicked = (worldPosition) => {
    console.log('[AnimationEditor] Destinazione selezionata:', worldPosition)
    
    // Aggiorna configurazione posizione
    setPositionConfig({
      ...positionConfig,
      endX: worldPosition.x,
      endY: worldPosition.y,
      endZ: worldPosition.z
    })
    
    // Disattiva pick mode
    setPickDestinationMode(false)
    
    // Notifica parent component
    if (onPickDestinationEnd) {
      onPickDestinationEnd()
    }
  }
  
  // Handler per annullare pick mode
  const handleCancelPick = () => {
    console.log('[AnimationEditor] Pick mode annullato')
    setPickDestinationMode(false)
    
    if (onPickDestinationEnd) {
      onPickDestinationEnd()
    }
  }
  
  // Handler per import JSON
  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0]
        if (!file) return
        
        const text = await file.text()
        const config = JSON.parse(text)
        
        console.log('[AnimationEditor] Config caricata da file:', config)
        
        // Validazione base
        if (!config.objectName || !config.mode) {
          alert('❌ File JSON non valido: mancano campi richiesti')
          return
        }
        
        // Applica configurazione in base al tipo
        if (config.mode === 'position') {
          // Validazione campi posizione
          const requiredFields = ['startX', 'startY', 'startZ', 'endX', 'endY', 'endZ', 'speed']
          const missing = requiredFields.filter(field => config[field] === undefined)
          
          if (missing.length > 0) {
            alert(`❌ Campi mancanti per posizione: ${missing.join(', ')}`)
            return
          }
          
          setPositionConfig({
            startX: config.startX,
            startY: config.startY,
            startZ: config.startZ,
            endX: config.endX,
            endY: config.endY,
            endZ: config.endZ,
            speed: config.speed
          })
          setMode('position')
          
        } else if (config.mode === 'rotation') {
          // Validazione campi rotazione
          const requiredFields = ['pivotX', 'pivotY', 'pivotZ', 'axis', 'angle', 'speed']
          const missing = requiredFields.filter(field => config[field] === undefined)
          
          if (missing.length > 0) {
            alert(`❌ Campi mancanti per rotazione: ${missing.join(', ')}`)
            return
          }
          
          setRotationConfig({
            pivotX: config.pivotX,
            pivotY: config.pivotY,
            pivotZ: config.pivotZ,
            axis: config.axis,
            angle: config.angle,
            speed: config.speed,
            direction: config.direction || 1
          })
          setMode('rotation')
        }
        
        alert(`✅ Configurazione "${config.objectName}" caricata con successo!`)
        
      } catch (error) {
        console.error('[AnimationEditor] Errore import JSON:', error)
        alert('❌ Errore nel caricamento del file JSON')
      }
    }
    
    input.click()
  }
  
  if (!selectedObject) {
    return (
      <div className="animation-editor">
        <div className="animation-editor__no-selection">
          <div className="animation-editor__no-selection-icon">🎯</div>
          <p>Clicca su un oggetto per iniziare</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="animation-editor">
      {/* Header */}
      <div className="animation-editor__header">
        <div className="animation-editor__title">
          🎨 Animation Editor
        </div>
        <button className="animation-editor__close" onClick={onClose}>
          ×
        </button>
      </div>
      
      {/* Oggetto selezionato */}
      <div className="animation-editor__section">
        <div className="animation-editor__section-title">Oggetto</div>
        <div className="animation-editor__object-name">
          {selectedObject.name || 'Unnamed Object'}
        </div>
        
        {objectInfo.current && (
          <div className="animation-editor__info-grid">
            <div className="animation-editor__info-item">
              <div className="animation-editor__info-item-label">Pos X</div>
              <div className="animation-editor__info-item-value">
                {objectInfo.current.position.x.toFixed(2)}
              </div>
            </div>
            <div className="animation-editor__info-item">
              <div className="animation-editor__info-item-label">Pos Y</div>
              <div className="animation-editor__info-item-value">
                {objectInfo.current.position.y.toFixed(2)}
              </div>
            </div>
            <div className="animation-editor__info-item">
              <div className="animation-editor__info-item-label">Pos Z</div>
              <div className="animation-editor__info-item-value">
                {objectInfo.current.position.z.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="animation-editor__divider" />
      
      {/* Toggle UI Mode */}
      <div className="animation-editor__section">
        <div className="animation-editor__section-title">Modalità Editor</div>
        <div className="animation-editor__mode-selector">
          <button
            className={`animation-editor__mode-button ${uiMode === 'guided' ? 'animation-editor__mode-button--active' : ''}`}
            onClick={() => setUiMode('guided')}
            title="Modalità guidata con preset intelligenti"
          >
            🎯 Guidata
          </button>
          <button
            className={`animation-editor__mode-button ${uiMode === 'advanced' ? 'animation-editor__mode-button--active' : ''}`}
            onClick={() => setUiMode('advanced')}
            title="Modalità avanzata con controlli completi"
          >
            ⚙️ Avanzata
          </button>
        </div>
      </div>
      
      <div className="animation-editor__divider" />
      
      {/* Selettore modalità animazione */}
      <div className="animation-editor__section">
        <div className="animation-editor__section-title">Tipo Animazione</div>
        <div className="animation-editor__mode-selector">
          <button
            className={`animation-editor__mode-button ${mode === 'rotation' ? 'animation-editor__mode-button--active' : ''}`}
            onClick={() => handleModeChange('rotation')}
          >
            🔄 Rotazione
          </button>
          <button
            className={`animation-editor__mode-button ${mode === 'position' ? 'animation-editor__mode-button--active' : ''}`}
            onClick={() => handleModeChange('position')}
          >
            📍 Posizione
          </button>
        </div>
        
        {/* 🔒 PRESET ROTAZIONE PIANO (per mobili) */}
        {mode === 'rotation' && (
          <button
            onClick={() => {
              if (!selectedObject) return
              
              // Calcola centro del bounding box
              const box = new THREE.Box3().setFromObject(selectedObject)
              const center = new THREE.Vector3()
              box.getCenter(center)
              
              // PRESET SICURO per mobili:
              // - Asse Y (rotazione verticale = movimento sul piano orizzontale)
              // - Pivot al centro dell'oggetto (ruota su se stesso)
              // - Angolo 90° (quarto di giro)
              // - Velocità moderata 90°/s
              const safeConfig = {
                pivotX: center.x,
                pivotY: box.min.y,  // Base dell'oggetto (ground)
                pivotZ: center.z,
                axis: 'y',           // SEMPRE Y per rotazione sul piano
                angle: 90,           // 90° di default
                speed: 45,          // 45°/s = rotazione naturale (2sec per 90°)
                direction: 1
              }
              
              setRotationConfig(safeConfig)
              
              console.log('[AnimationEditor] 🔒 Preset Rotazione Piano applicato:', safeConfig)
              alert('✅ Preset Rotazione Piano attivato!\n\n' +
                    '• Asse: Y (rotazione sul piano orizzontale)\n' +
                    '• Cardine: Centro oggetto\n' +
                    '• Angolo: 90°\n' +
                    '• Velocità: 90°/s\n\n' +
                    'Il mobile ruoterà su se stesso senza inclinarsi!')
            }}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
            title="Configura rotazione sicura sul piano orizzontale (ideale per mobili)"
          >
            🔒 Preset: Rotazione Piano (Mobili)
          </button>
        )}
      </div>
      
      <div className="animation-editor__divider" />
      
      {/* 🔄 Multi-Object Section */}
      <div className="animation-editor__section">
        <div className="animation-editor__section-title">Selezione Multi-Object</div>
        
        {/* 🪑 BUTTON ANIMAZIONE COMODINO - One-click setup */}
        <button
          onClick={() => {
            // ✅ FIX: Non serve selectedObject - Auto-Setup cerca da solo!
            if (!modelRef || !modelRef.current) {
              alert('⚠️ ModelRef non disponibile! Impossibile cercare le parti.')
              return
            }
            
            console.log('[AnimationEditor] 🪑 SETUP AUTOMATICO COMODINO...')
            console.log('[AnimationEditor] 🔍 Root della scena:', modelRef.current.name || modelRef.current.type)
            
            // 🔍 DEBUG COMPLETO: Esplora TUTTA la gerarchia
            console.log('[AnimationEditor] 🔍 ===== DEBUG GERARCHIA COMPLETA =====')
            let nodeCount = 0
            const allNodes = []
            
            modelRef.current.traverse((child) => {
              nodeCount++
              const info = {
                index: nodeCount,
                name: child.name || '(unnamed)',
                type: child.type,
                parent: child.parent ? (child.parent.name || child.parent.type) : 'null',
                hasChildren: child.children.length > 0,
                childrenCount: child.children.length,
                isMesh: child.isMesh || false,
                uuid: child.uuid.substring(0, 8)
              }
              allNodes.push(info)
              
              // Log ogni nodo
              console.log(`[AnimationEditor] ${nodeCount}. ${info.name} (${info.type}) → Parent: ${info.parent} | Children: ${info.childrenCount}`)
            })
            
            console.log('[AnimationEditor] 📊 Totale nodi:', nodeCount)
            console.log('[AnimationEditor] ===== FINE DEBUG GERARCHIA =====')
            
            // 🎯 Cerca gli oggetti con gli ID specifici nei nomi (4 parti del comodino)
            const targetIDs = ['9EC68E8D', '506AD06A', 'CF7CACC7', 'F8B2F30A']
            console.log('[AnimationEditor] 🎯 Cercando oggetti con ID:', targetIDs)
            
            const comodinoParts = []
            modelRef.current.traverse((child) => {
              if (targetIDs.some(id => child.name && child.name.includes(id))) {
                comodinoParts.push(child)
                console.log('[AnimationEditor] ✅ Trovato:', child.name, '(Type:', child.type, ')')
              }
            })
            
            console.log('[AnimationEditor] 📦 Parti trovate con ID:', comodinoParts.length)
            
            if (comodinoParts.length === 0) {
              alert('❌ Nessuna parte del comodino trovata!\n\n' +
                    'Nessun oggetto con gli ID specificati è stato trovato.\n' +
                    'Controlla la console per i dettagli.')
              return
            }
            
            if (comodinoParts.length < 4) {
              console.warn('[AnimationEditor] ⚠️ Trovati solo', comodinoParts.length, 'parti su 4 previste')
              console.warn('[AnimationEditor] Parti mancanti - controlla gli ID nella console')
            }
            
            console.log(`[AnimationEditor] ✅ Trovate ${comodinoParts.length} parti`)
            
            // 🚀 SALVA NEL REF IMMEDIATAMENTE (bypassa timing issue!)
            if (comodinoPartsRef) {
              comodinoPartsRef.current = comodinoParts
              console.log('[AnimationEditor] 🚀 Oggetti salvati nel REF DIRETTO:', comodinoParts.length)
            }
            
            // 1. Attiva multi-object mode
            setMultiObjectMode(true)
            
            // 2. Crea slot per ogni parte
            const newSlots = comodinoParts.map((part, index) => ({
              id: Date.now() + index,
              object: part
            }))
            setSlots(newSlots)
            
            // 3. Blocca oggetti
            setObjectsLocked(true)
            
            // 4. Calcola posizione WORLD reale (non bounding box!)
            const worldPositions = comodinoParts.map(part => {
              const pos = new THREE.Vector3()
              part.getWorldPosition(pos)
              return pos
            })
            
            // Media posizioni WORLD delle parti
            const avgWorldPos = new THREE.Vector3()
            worldPositions.forEach(pos => avgWorldPos.add(pos))
            avgWorldPos.divideScalar(worldPositions.length)
            
            console.log('[AnimationEditor] 🪑 Posizione WORLD media:', avgWorldPos)
            
            // Per riferimento: calcola anche bounding box
            const box = new THREE.Box3()
            comodinoParts.forEach(part => {
              const partBox = new THREE.Box3().setFromObject(part)
              box.union(partBox)
            })
            
            const center = new THREE.Vector3()
            box.getCenter(center)
            
            // ✅ Config ROTAZIONE
            const rotConfig = {
              pivotX: avgWorldPos.x,
              pivotY: avgWorldPos.y,  // Posizione WORLD reale
              pivotZ: avgWorldPos.z,
              axis: 'y',
              angle: 90,
              speed: 45,          // 45°/s = rotazione naturale (2sec per 90°)
              direction: 1
            }
            
            // 🎯 PRESERVA Punto B se già impostato dall'utente
            // ✅ FIX: Usa positionConfig invece di animationConfig (che non esiste)
            const hasCustomDestination = 
              positionConfig.endX !== undefined &&
              positionConfig.endY !== undefined &&
              positionConfig.endZ !== undefined &&
              // Verifica che non sia il default (distanza significativa da avgWorldPos)
              Math.sqrt(
                Math.pow(positionConfig.endX - avgWorldPos.x, 2) +
                Math.pow(positionConfig.endY - avgWorldPos.y, 2) +
                Math.pow(positionConfig.endZ - avgWorldPos.z, 2)
              ) > 0.5 // Se distanza > 0.5m, è custom
            
            console.log('[AnimationEditor] 🎯 Destinazione personalizzata?', hasCustomDestination)
            if (hasCustomDestination) {
              console.log('[AnimationEditor] ✅ PRESERVO Punto B esistente:', {
                x: positionConfig.endX.toFixed(3),
                y: positionConfig.endY.toFixed(3),
                z: positionConfig.endZ.toFixed(3)
              })
            }
            
            // ✅ Config POSIZIONE - Preserva destinazione se esiste
            const posConfig = {
              startX: avgWorldPos.x,  // ✅ Usa posizione WORLD reale
              startY: avgWorldPos.y,
              startZ: avgWorldPos.z,
              // PRESERVA Punto B se già impostato, altrimenti usa default
              endX: hasCustomDestination ? positionConfig.endX : avgWorldPos.x + 1,
              endY: hasCustomDestination ? positionConfig.endY : avgWorldPos.y + 0.5,
              endZ: hasCustomDestination ? positionConfig.endZ : avgWorldPos.z,
              speed: 2.0
            }
            
            setRotationConfig(rotConfig)
            setPositionConfig(posConfig)
            
            // ✅ Notifica parent del config attivo
            const activeConfig = mode === 'rotation' 
              ? { mode: 'rotation', ...rotConfig } 
              : { mode: 'position', ...posConfig }
            
            if (onConfigChange) {
              onConfigChange(activeConfig)
            }
            
            console.log('[AnimationEditor] ✅ Config creato e propagato:', activeConfig)
            
            console.log('[AnimationEditor] 🎉 Setup comodino COMPLETATO!')
            console.log('[AnimationEditor]   Parti:', comodinoParts.length)
            console.log('[AnimationEditor]   Pivot:', center)
            
            const warningMsg = comodinoParts.length < 4 
              ? `\n\n⚠️ Attenzione: trovate ${comodinoParts.length}/4 parti` 
              : ''
            
            alert(`✅ Comodino configurato!${warningMsg}\n\n` +
                  `• ${comodinoParts.length} parti selezionate\n` +
                  `• Rotazione: 90° sul piano Y\n` +
                  `• Pronto per Test Animazione!`)
          }}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '15px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(240, 147, 251, 0.4)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 20px rgba(240, 147, 251, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 15px rgba(240, 147, 251, 0.4)'
          }}
          title="Setup automatico animazione comodino - Un click e tutto è pronto!"
        >
          🪑 Animazione Comodino (Auto-Setup)
        </button>
        
        <button
          className={`animation-editor__button ${multiObjectMode ? 'animation-editor__mode-button--active' : ''}`}
          onClick={() => {
            if (objectsLocked) {
              alert('⚠️ Oggetti bloccati! Usa il pulsante Reset per modificare.')
              return
            }
            
            const newMode = !multiObjectMode
            setMultiObjectMode(newMode)
            
            if (newMode) {
              // Attiva multi-object: crea primo slot con oggetto corrente
              setSlots([{ id: Date.now(), object: selectedObject }])
              console.log('[AnimationEditor] 🔄 Multi-Object Mode ATTIVATO - Primo slot creato')
            } else {
              // Disattiva: reset slots
              setSlots([])
              console.log('[AnimationEditor] Multi-Object Mode disattivato')
            }
          }}
          disabled={objectsLocked}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '600',
            background: multiObjectMode ? '#00ff88' : '#00aaff',
            border: 'none',
            borderRadius: '8px',
            color: multiObjectMode ? 'black' : 'white',
            cursor: objectsLocked ? 'not-allowed' : 'pointer',
            opacity: objectsLocked ? 0.5 : 1,
            transition: 'all 0.3s'
          }}
        >
          {multiObjectMode ? '✅ Modalità Multi-Object Attiva' : '🔄 Attiva Selezione Multipla'}
        </button>
        
        {/* Lista Slot quando multi-object è attivo */}
        {multiObjectMode && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', fontWeight: '600' }}>
              Oggetti Selezionati ({slots.filter(s => s.object !== null).length}/{slots.length}):
            </div>
            
            {/* Render degli slot */}
            {slots.map((slot, index) => (
              <div 
                key={slot.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: slot.object ? 'rgba(0,170,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: slot.object ? '2px solid rgba(0,170,255,0.4)' : '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  minWidth: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: slot.object ? '#00aaff' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  {slot.object ? (
                    <>
                      <div style={{ fontSize: '12px', color: '#00aaff', fontWeight: '600' }}>
                        {slot.object.name || 'Unnamed'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                        UUID: {slot.object.uuid.substring(0, 8)}...
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                      Slot vuoto - clicca su un oggetto
                    </div>
                  )}
                </div>
                
                {!objectsLocked && slot.object && (
                  <button
                    onClick={() => {
                      const newSlots = slots.filter(s => s.id !== slot.id)
                      setSlots(newSlots)
                      console.log('[AnimationEditor] Slot rimosso:', slot.object.name)
                    }}
                    style={{
                      padding: '6px 10px',
                      background: '#ff4444',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                    title="Rimuovi questo slot"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            
            {/* Button Aggiungi Slot */}
            {!objectsLocked && (
              <button
                onClick={() => {
                  const newSlot = { id: Date.now(), object: null }
                  setSlots([...slots, newSlot])
                  console.log('[AnimationEditor] ➕ Nuovo slot aggiunto')
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '10px',
                  background: 'rgba(0,170,255,0.2)',
                  border: '2px dashed rgba(0,170,255,0.5)',
                  borderRadius: '6px',
                  color: '#00aaff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0,170,255,0.3)'
                  e.target.style.borderColor = 'rgba(0,170,255,0.8)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0,170,255,0.2)'
                  e.target.style.borderColor = 'rgba(0,170,255,0.5)'
                }}
              >
                ➕ Aggiungi Slot
              </button>
            )}
            
            {/* Pulsante Conferma o Reset */}
            <div style={{ marginTop: '15px' }}>
              {!objectsLocked ? (
                <button
                  onClick={() => {
                    const filledSlots = slots.filter(s => s.object !== null)
                    if (filledSlots.length === 0) {
                      alert('⚠️ Nessun oggetto selezionato! Aggiungi almeno un oggetto prima di confermare.')
                      return
                    }
                    
                    setObjectsLocked(true)
                    console.log(`[AnimationEditor] ✅ ${filledSlots.length} oggetti BLOCCATI`)
                    alert(`✅ ${filledSlots.length} oggett${filledSlots.length === 1 ? 'o bloccato' : 'i bloccati'}!`)
                  }}
                  disabled={slots.filter(s => s.object !== null).length === 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: slots.filter(s => s.object !== null).length > 0 ? '#00ff88' : '#555',
                    border: 'none',
                    borderRadius: '8px',
                    color: slots.filter(s => s.object !== null).length > 0 ? 'black' : '#999',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    cursor: slots.filter(s => s.object !== null).length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s'
                  }}
                >
                  ✅ Conferma Oggetti ({slots.filter(s => s.object !== null).length})
                </button>
              ) : (
                <button
                  onClick={() => {
                    setObjectsLocked(false)
                    setSlots([])
                    setMultiObjectMode(false)
                    console.log('[AnimationEditor] 🔓 Reset selezione completato')
                    alert('🔓 Selezione resettata!')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#ff6b6b',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#ff5555'}
                  onMouseLeave={(e) => e.target.style.background = '#ff6b6b'}
                >
                  🔓 Reset Selezione
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="animation-editor__divider" />
      
      {/* Badge validazione */}
      {objectInfo.current && (
        <div className="animation-editor__section">
          <ValidationBadge
            config={mode === 'rotation' ? { mode: 'rotation', ...rotationConfig } : { mode: 'position', ...positionConfig }}
            objectInfo={objectInfo.current}
            onAutoFix={handleAutoFix}
          />
        </div>
      )}
      
      {/* Controlli per Rotazione */}
      {mode === 'rotation' && (
        <RotationControls
          config={rotationConfig}
          onChange={setRotationConfig}
          onSnapToEdge={handleSnapPivotToEdge}
          uiMode={uiMode}
        />
      )}
      
      {/* Controlli per Posizione */}
      {mode === 'position' && (
        <PositionControls
          config={positionConfig}
          onChange={setPositionConfig}
          pickDestinationMode={pickDestinationMode}
          onPickDestination={handlePickDestination}
          onCancelPick={handleCancelPick}
        />
      )}
      
      <div className="animation-editor__divider" />
      
      {/* Pulsanti azione */}
      <div className="animation-editor__section">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            className="animation-editor__button animation-editor__button--test"
            onClick={handleTestAnimation}
            disabled={isAnimating}
            style={{ flex: 1 }}
          >
            ▶ {isAnimating ? 'In corso...' : 'Test / Riprendi'}
          </button>
          
          {isAnimating && (
            <button
              className="animation-editor__button"
              onClick={handleTestAnimation}
              style={{
                flex: 1,
                background: '#ff4444',
                color: 'white',
                fontWeight: '600'
              }}
              title="Ferma immediatamente l'animazione"
            >
              ⏹ Stop
            </button>
          )}
        </div>
        
        {/* Pulsante Reset - appare solo quando NON sta animando */}
        {!isAnimating && (
          <button
            className="animation-editor__button"
            onClick={() => {
              // Trigger reset attraverso l'evento personalizzato
              window.dispatchEvent(new CustomEvent('resetComodinoAnimation'))
              console.log('[AnimationEditor] 🔄 Reset animazione richiesto')
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#ffa500',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '10px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff9500'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ffa500'
              e.target.style.transform = 'translateY(0)'
            }}
            title="Riporta il comodino alla posizione iniziale (0°)"
          >
            🔄 Reset Posizione (→ 0°)
          </button>
        )}
        
        <button
          className="animation-editor__button animation-editor__button--save"
          onClick={handleSave}
        >
          💾 Salva Configurazione
        </button>
        
        {/* Pulsante Export Coordinate Analysis */}
        <button
          className="animation-editor__button"
          onClick={handleExportCoordinates}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          📊 Scarica Analisi Coordinate
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="animation-editor__button animation-editor__button--import"
            onClick={handleImportJSON}
            style={{ flex: 1 }}
          >
            📂 Carica Config
          </button>
          
          <button
            className="animation-editor__button animation-editor__button--export"
            onClick={handleExportJSON}
            style={{ flex: 1 }}
          >
            📋 Export JSON
          </button>
        </div>
      </div>
    </div>
  )
}

// Funzioni helper per auto-detect e preset
function detectObjectType(objectName) {
  const name = objectName.toLowerCase()
  
  if (name.includes('porta') || name.includes('door')) return 'porta'
  if (name.includes('anta') || name.includes('cabinet')) return 'anta'
  if (name.includes('cassetto') || name.includes('drawer')) return 'cassetto'
  if (name.includes('finestra') || name.includes('window')) return 'finestra'
  if (name.includes('sportello')) return 'sportello'
  
  return 'generico'
}

function getRotationPreset(type, box, center) {
  const presets = {
    porta: {
      pivotX: box.min.x,
      pivotY: box.min.y,
      pivotZ: center.z,
      axis: 'y',
      angle: 90,
      speed: 45,          // 45°/s = rotazione naturale
      direction: 1
    },
    anta: {
      pivotX: box.min.x,
      pivotY: center.y,
      pivotZ: center.z,
      axis: 'y',
      angle: 90,
      speed: 45,          // 45°/s = rotazione naturale
      direction: 1
    },
    cassetto: {
      pivotX: center.x,
      pivotY: center.y,
      pivotZ: box.min.z,
      axis: 'z',
      angle: 45,
      speed: 60,
      direction: 1
    },
    finestra: {
      pivotX: box.min.x,
      pivotY: box.min.y,
      pivotZ: center.z,
      axis: 'y',
      angle: 75,
      speed: 75,
      direction: 1
    },
    sportello: {
      pivotX: box.min.x,
      pivotY: center.y,
      pivotZ: center.z,
      axis: 'y',
      angle: 105,
      speed: 105,
      direction: 1
    },
    generico: {
      pivotX: box.min.x,
      pivotY: center.y,
      pivotZ: center.z,
      axis: 'y',
      angle: 90,
      speed: 45,          // 45°/s = rotazione naturale
      direction: 1
    }
  }
  
  return presets[type] || presets.generico
}

// Componente per i controlli di rotazione
function RotationControls({ config, onChange, onSnapToEdge, uiMode }) {
  const isGuided = uiMode === 'guided'
  
  // Handler per incremento/decremento preciso
  const adjustValue = (axis, delta) => {
    const newConfig = { ...config }
    newConfig[axis] = parseFloat((config[axis] + delta).toFixed(3))
    onChange(newConfig)
  }
  
  return (
    <div className="animation-editor__section">
      <div className="animation-editor__section-title">Parametri Rotazione</div>
      
      {/* MODALITÀ GUIDATA: Preset cardine */}
      {isGuided && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <div className="animation-editor__section-title" style={{ fontSize: '13px', marginBottom: '8px' }}>
              Posizione Cardine
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                style={{ 
                  flex: '1', 
                  minWidth: '120px',
                  padding: '12px 16px', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  background: '#00aaff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: 'white', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#0099ee'}
                onMouseLeave={(e) => e.target.style.background = '#00aaff'}
                onClick={() => {
                  console.log('[RotationControls] Click Bordo Sinistro')
                  onSnapToEdge('left')
                }}
                title="Posiziona il cardine sul bordo sinistro (tipico per ante/porte)"
              >
                ◀ Bordo Sinistro
              </button>
              <button
                style={{ 
                  flex: '1', 
                  minWidth: '120px',
                  padding: '12px 16px', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  background: '#00aaff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: 'white', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#0099ee'}
                onMouseLeave={(e) => e.target.style.background = '#00aaff'}
                onClick={() => {
                  console.log('[RotationControls] Click Bordo Destro')
                  onSnapToEdge('right')
                }}
                title="Posiziona il cardine sul bordo destro"
              >
                Bordo Destro ▶
              </button>
              <button
                style={{ 
                  flex: '1', 
                  minWidth: '120px',
                  padding: '12px 16px', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  background: '#ffa500', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: 'white', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#ff9500'}
                onMouseLeave={(e) => e.target.style.background = '#ffa500'}
                onClick={() => {
                  console.log('[RotationControls] Click Centro')
                  onSnapToEdge('center')
                }}
                title="⚠️ Centro - Non consigliato per porte/ante"
              >
                ⊙ Centro ⚠️
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', fontStyle: 'italic' }}>
              💡 Il cardine determina il punto attorno cui ruota l'oggetto
            </div>
            
            {/* Mostra coordinate cardine corrente */}
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Coordinate Cardine:</div>
              <div style={{ fontSize: '12px', color: '#00aaff', fontFamily: 'monospace' }}>
                X: {config.pivotX.toFixed(3)}m | Y: {config.pivotY.toFixed(3)}m | Z: {config.pivotZ.toFixed(3)}m
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* MODALITÀ AVANZATA: Pulsanti +/- precisi */}
      {!isGuided && (
        <>
          {/* Cardine X con pulsanti +/- */}
          <div className="animation-editor__control">
            <div className="animation-editor__control-label">
              <span>Cardine X</span>
              <span className="animation-editor__control-value">{config.pivotX.toFixed(3)}m</span>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotX', -0.01)}
                title="Sposta cardine -0.01m"
              >
                −
              </button>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotX', -0.1)}
                title="Sposta cardine -0.1m"
              >
                − −
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', color: '#00aaff', fontWeight: 'bold' }}>
                {config.pivotX.toFixed(3)}
              </div>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotX', 0.1)}
                title="Sposta cardine +0.1m"
              >
                + +
              </button>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotX', 0.01)}
                title="Sposta cardine +0.01m"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Cardine Y con pulsanti +/- */}
          <div className="animation-editor__control">
            <div className="animation-editor__control-label">
              <span>Cardine Y</span>
              <span className="animation-editor__control-value">{config.pivotY.toFixed(3)}m</span>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotY', -0.01)}
              >
                −
              </button>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotY', -0.1)}
              >
                − −
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', color: '#00aaff', fontWeight: 'bold' }}>
                {config.pivotY.toFixed(3)}
              </div>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotY', 0.1)}
              >
                + +
              </button>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotY', 0.01)}
              >
                +
              </button>
            </div>
          </div>
          
          {/* Cardine Z con pulsanti +/- */}
          <div className="animation-editor__control">
            <div className="animation-editor__control-label">
              <span>Cardine Z</span>
              <span className="animation-editor__control-value">{config.pivotZ.toFixed(3)}m</span>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotZ', -0.01)}
              >
                −
              </button>
              <button
                style={{ padding: '8px 12px', background: '#ff4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotZ', -0.1)}
              >
                − −
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', color: '#00aaff', fontWeight: 'bold' }}>
                {config.pivotZ.toFixed(3)}
              </div>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotZ', 0.1)}
              >
                + +
              </button>
              <button
                style={{ padding: '8px 12px', background: '#00ff88', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => adjustValue('pivotZ', 0.01)}
              >
                +
              </button>
            </div>
          </div>
          
          {/* Quick snap buttons - SOLO IN ADVANCED */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '15px' }}>
            <button
              style={{ flex: '1', padding: '5px', fontSize: '11px', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
              onClick={() => onSnapToEdge('left')}
            >
              ◀ Sinistra
            </button>
            <button
              style={{ flex: '1', padding: '5px', fontSize: '11px', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
              onClick={() => onSnapToEdge('right')}
            >
              Destra ▶
            </button>
            <button
              style={{ flex: '1', padding: '5px', fontSize: '11px', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
              onClick={() => onSnapToEdge('center')}
            >
              ⊙ Centro
            </button>
          </div>
        </>
      )}
      
      {/* Asse rotazione - READONLY in modalità guidata */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Asse di Rotazione</span>
        </div>
        
        {isGuided ? (
          /* GUIDED: Asse readonly con tooltip educativo */
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              background: 'rgba(0, 170, 255, 0.1)',
              border: '1px solid rgba(0, 170, 255, 0.3)',
              borderRadius: '6px',
              marginTop: '5px'
            }}
            title="Determinato automaticamente dal tipo di oggetto"
          >
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#00aaff' }}>
              {config.axis.toUpperCase()}
            </span>
            <span style={{ fontSize: '18px', color: '#888' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                💡 Determinato automaticamente dal tipo di oggetto
              </div>
              <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                Usa modalità Avanzata ⚙️ per modificare
              </div>
            </div>
          </div>
        ) : (
          /* ADVANCED: Select normale */
          <select
            className="animation-editor__select"
            value={config.axis}
            onChange={(e) => onChange({ ...config, axis: e.target.value })}
          >
            <option value="x">Asse X (Roll)</option>
            <option value="y">Asse Y (Yaw)</option>
            <option value="z">Asse Z (Pitch)</option>
          </select>
        )}
      </div>
      
      {/* Direzione rotazione */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Direzione Rotazione</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              flex: 1,
              padding: '10px',
              background: (config.direction || 1) === 1 ? '#00aaff' : '#444',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
            onClick={() => onChange({ ...config, direction: 1 })}
          >
            ↻ Positiva (antioraria)
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px',
              background: (config.direction || 1) === -1 ? '#00aaff' : '#444',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
            onClick={() => onChange({ ...config, direction: -1 })}
          >
            ↺ Negativa (oraria)
          </button>
        </div>
      </div>
      
      {/* Angolo apertura - CON VINCOLI REALISTICI */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Angolo Apertura</span>
          <span className="animation-editor__control-value">{config.angle}°</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min="30"
          max="120"
          step="5"
          value={config.angle}
          onChange={(e) => onChange({ ...config, angle: parseInt(e.target.value) })}
        />
        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          Vincoli: 30°-120° (tipico per porte/ante)
        </div>
      </div>
      
      {/* Velocità - CON VINCOLI REALISTICI */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Velocità</span>
          <span className="animation-editor__control-value">{config.speed}°/s</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min="45"
          max="180"
          step="15"
          value={config.speed}
          onChange={(e) => onChange({ ...config, speed: parseInt(e.target.value) })}
        />
        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          Vincoli: 45°-180°/s (movimento realistico)
        </div>
      </div>
    </div>
  )
}

// Componente per i controlli di posizione
function PositionControls({ config, onChange, pickDestinationMode, onPickDestination, onCancelPick }) {
  return (
    <div className="animation-editor__section">
      <div className="animation-editor__section-title">Parametri Posizione</div>
      
      {/* Pulsante Pick Destination */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className={`animation-editor__button animation-editor__button--pick ${pickDestinationMode ? 'animation-editor__button--pick-active' : ''}`}
          onClick={pickDestinationMode ? onCancelPick : onPickDestination}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            fontWeight: '600',
            background: pickDestinationMode ? '#ff6b6b' : '#00aaff',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: pickDestinationMode ? '0 0 15px rgba(255,107,107,0.5)' : 'none'
          }}
        >
          {pickDestinationMode ? '❌ Annulla Selezione (ESC)' : '📍 Scegli Destinazione con Click'}
        </button>
        
        {pickDestinationMode && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(0,170,255,0.1)',
            border: '2px solid rgba(0,170,255,0.3)',
            borderRadius: '8px',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ fontSize: '13px', color: '#00aaff', fontWeight: '600', marginBottom: '6px' }}>
              🎯 Modalità Selezione Attiva
            </div>
            <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>
              💡 Clicca su un punto qualsiasi nella scena 3D per impostare la destinazione.<br/>
              ⌨️ Premi ESC per annullare.
            </div>
          </div>
        )}
      </div>
      
      <div className="animation-editor__divider" style={{ margin: '15px 0' }} />
      
      {/* Posizione Start (Read-only) */}
      <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,255,136,0.05)', borderRadius: '6px', border: '1px solid rgba(0,255,136,0.2)' }}>
        <div style={{ fontSize: '13px', color: '#00ff88', fontWeight: '600', marginBottom: '8px' }}>
          📍 Punto A (Origine)
        </div>
        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
          X: {config.startX.toFixed(3)}m | Y: {config.startY.toFixed(3)}m | Z: {config.startZ.toFixed(3)}m
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
          Rilevato automaticamente dalla posizione dell'oggetto
        </div>
      </div>
      
      {/* Posizione End (Destination) */}
      <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,170,255,0.05)', borderRadius: '6px', border: '1px solid rgba(0,170,255,0.2)' }}>
        <div style={{ fontSize: '13px', color: '#00aaff', fontWeight: '600', marginBottom: '8px' }}>
          🎯 Punto B (Destinazione)
        </div>
        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
          X: {config.endX.toFixed(3)}m | Y: {config.endY.toFixed(3)}m | Z: {config.endZ.toFixed(3)}m
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
          {pickDestinationMode ? 'In attesa del click...' : 'Usa il pulsante sopra per selezionare con click'}
        </div>
      </div>
      
      <div className="animation-editor__divider" style={{ margin: '15px 0' }} />
      
      {/* Controlli manuali opzionali */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          ⚙️ Regolazione Fine (Opzionale)
        </div>
      </div>
      
      {/* Posizione Target X */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Target X</span>
          <span className="animation-editor__control-value">{config.endX.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min={config.startX - 5}
          max={config.startX + 5}
          step="0.1"
          value={config.endX}
          onChange={(e) => onChange({ ...config, endX: parseFloat(e.target.value) })}
        />
      </div>
      
      {/* Posizione Target Y */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Target Y</span>
          <span className="animation-editor__control-value">{config.endY.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min={config.startY - 3}
          max={config.startY + 3}
          step="0.1"
          value={config.endY}
          onChange={(e) => onChange({ ...config, endY: parseFloat(e.target.value) })}
        />
      </div>
      
      {/* Posizione Target Z */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Target Z</span>
          <span className="animation-editor__control-value">{config.endZ.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min={config.startZ - 5}
          max={config.startZ + 5}
          step="0.1"
          value={config.endZ}
          onChange={(e) => onChange({ ...config, endZ: parseFloat(e.target.value) })}
        />
      </div>
      
      {/* Velocità */}
      <div className="animation-editor__control">
        <div className="animation-editor__control-label">
          <span>Velocità</span>
          <span className="animation-editor__control-value">{config.speed.toFixed(1)} u/s</span>
        </div>
        <input
          type="range"
          className="animation-editor__slider"
          min="0.5"
          max="30"
          step="0.5"
          value={config.speed}
          onChange={(e) => onChange({ ...config, speed: parseFloat(e.target.value) })}
        />
      </div>
      
      {/* Info distanza */}
      <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>Distanza:</div>
        <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>
          {Math.sqrt(
            Math.pow(config.endX - config.startX, 2) +
            Math.pow(config.endY - config.startY, 2) +
            Math.pow(config.endZ - config.startZ, 2)
          ).toFixed(2)} unità
        </div>
      </div>
    </div>
  )
}
