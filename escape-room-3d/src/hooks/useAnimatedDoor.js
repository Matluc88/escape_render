// useAnimatedDoor.js
// Hook per animare porte/sportelli con configurazione da JSON

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook per animare una porta/sportello con rotazione
 * Usa i parametri esportati dall'Animation Editor
 * @param {boolean} enabled - Abilita/disabilita l'hook (default: true)
 */
export function useAnimatedDoor(doorObject, isOpen, config, enabled = true) {
  // ✅ REACT-SAFE: Hook SEMPRE chiamati (ordine fisso)
  const pivotGroupRef = useRef(null)
  const targetRotation = useRef(0)
  const currentRotation = useRef(0)
  const isInitialized = useRef(false)
  
  // 🔒 ANTI-360: Base rotation (salvata una volta sola)
  const baseRotation = useRef(0)
  const hasBase = useRef(false)
  
  // Setup pivot group quando la porta viene caricata
  useEffect(() => {
    // ✅ Skip logica se disabilitato, ma hook è sempre chiamato
    if (!enabled) {
      return
    }
    
    // Guard check completo
    if (!doorObject) {
      console.warn('[useAnimatedDoor] doorObject è null/undefined')
      return
    }
    
    if (!config) {
      console.warn('[useAnimatedDoor] config è null/undefined')
      return
    }
    
    if (isInitialized.current) {
      console.log('[useAnimatedDoor] Già inizializzato, skip')
      return
    }
    
    console.log('[useAnimatedDoor] Inizializzazione per oggetto:', doorObject.name)
    console.log('[useAnimatedDoor] Config:', config)
    
    const parent = doorObject.parent
    if (!parent) {
      console.warn('[useAnimatedDoor] Oggetto senza parent')
      return
    }
    
    try {
      // 🔑 STEP 0: Attacca le maniglie alla porta (se presenti nella config)
      const attachedHandles = []
      if (config.handleUUIDs && config.handleUUIDs.length > 0) {
        console.log('[useAnimatedDoor] 🔍 Cercando maniglie da attaccare:', config.handleUUIDs)
        
        // Trova la scena root per fare il traverse
        let sceneRoot = doorObject
        while (sceneRoot.parent) {
          sceneRoot = sceneRoot.parent
        }
        
        // 🔧 FIX: Prima RACCOGLI tutte le maniglie, POI fai il reparenting
        // (non modificare l'albero durante il traverse!)
        const foundHandles = []
        
        config.handleUUIDs.forEach((uuid) => {
          sceneRoot.traverse((child) => {
            if (child.name && child.name.includes(uuid)) {
              console.log('[useAnimatedDoor] ✅ Maniglia trovata:', child.name)
              foundHandles.push(child)
            }
          })
        })
        
        // Ora fai il reparenting DOPO il traverse
        foundHandles.forEach((child) => {
          // Salva posizione world della maniglia
          const handleWorldPos = new THREE.Vector3()
          const handleWorldQuat = new THREE.Quaternion()
          child.getWorldPosition(handleWorldPos)
          child.getWorldQuaternion(handleWorldQuat)
          
          // Rimuovi dal parent originale
          const originalParent = child.parent
          if (originalParent) {
            originalParent.remove(child)
          }
          
          // Attacca alla porta
          doorObject.add(child)
          
          // Calcola posizione locale rispetto alla porta
          const doorWorldPos = new THREE.Vector3()
          const doorWorldQuat = new THREE.Quaternion()
          doorObject.getWorldPosition(doorWorldPos)
          doorObject.getWorldQuaternion(doorWorldQuat)
          
          const handleLocalPos = doorObject.worldToLocal(handleWorldPos.clone())
          child.position.copy(handleLocalPos)
          
          // Mantieni rotazione world
          const localQuat = doorWorldQuat.clone().invert().multiply(handleWorldQuat)
          child.quaternion.copy(localQuat)
          
          child.updateMatrix()
          
          // Salva per cleanup
          attachedHandles.push({ handle: child, originalParent })
          
          console.log('[useAnimatedDoor] 🔗 Maniglia attaccata alla porta:', child.name)
        })
        
        console.log('[useAnimatedDoor] ✅ Maniglie attaccate:', attachedHandles.length)
      }
      
      // Crea pivot group
      const pivot = new THREE.Group()
      pivot.name = 'ANIMATED_DOOR_PIVOT'
      
      // 🔧 AUTO-PIVOT: Calcola pivot dalla bounding box se specificato
      let pivotLocalPos
      
      if (config.autoPivot) {
        console.log('[useAnimatedDoor] 🎯 Auto-pivot mode:', config.autoPivot)
        
        // Calcola bounding box della porta nella posizione corrente
        const bbox = new THREE.Box3().setFromObject(doorObject)
        const axis = config.axis || 'y'
        
        // Determina coordinate pivot in base al lato specificato
        let pivotWorldX, pivotWorldY, pivotWorldZ
        
        if (config.autoPivot === 'left') {
          pivotWorldX = bbox.min.x
          pivotWorldY = (bbox.min.y + bbox.max.y) / 2
          pivotWorldZ = (bbox.min.z + bbox.max.z) / 2
        } else if (config.autoPivot === 'right') {
          pivotWorldX = bbox.max.x
          pivotWorldY = (bbox.min.y + bbox.max.y) / 2
          pivotWorldZ = (bbox.min.z + bbox.max.z) / 2
        } else if (config.autoPivot === 'top') {
          pivotWorldX = (bbox.min.x + bbox.max.x) / 2
          pivotWorldY = bbox.max.y
          pivotWorldZ = (bbox.min.z + bbox.max.z) / 2
        } else if (config.autoPivot === 'bottom') {
          pivotWorldX = (bbox.min.x + bbox.max.x) / 2
          pivotWorldY = bbox.min.y
          pivotWorldZ = (bbox.min.z + bbox.max.z) / 2
        } else {
          console.warn('[useAnimatedDoor] ⚠️ autoPivot non riconosciuto:', config.autoPivot)
          // Fallback al centro
          pivotWorldX = (bbox.min.x + bbox.max.x) / 2
          pivotWorldY = (bbox.min.y + bbox.max.y) / 2
          pivotWorldZ = (bbox.min.z + bbox.max.z) / 2
        }
        
        // Converti da world a local del parent
        const pivotWorldPos = new THREE.Vector3(pivotWorldX, pivotWorldY, pivotWorldZ)
        pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
        
        console.log('[useAnimatedDoor] ✅ Pivot calcolato da bbox:', {
          world: { x: pivotWorldX.toFixed(3), y: pivotWorldY.toFixed(3), z: pivotWorldZ.toFixed(3) },
          local: { x: pivotLocalPos.x.toFixed(3), y: pivotLocalPos.y.toFixed(3), z: pivotLocalPos.z.toFixed(3) },
          side: config.autoPivot
        })
      } else {
        // 🔒 BACKWARD COMPATIBILITY: Usa coordinate esplicite
        console.log('[useAnimatedDoor] 📍 Using explicit pivot coordinates')
        const pivotWorldPos = new THREE.Vector3(config.pivotX, config.pivotY, config.pivotZ)
        pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
      }
      
      pivot.position.copy(pivotLocalPos)
      
      // Aggiungi pivot al parent
      parent.add(pivot)
      pivot.updateMatrixWorld(true)
      
      // ✅ CRUCIALE: Salva ROTAZIONE INIZIALE prima del reparenting
      const axis = config.axis || 'y'
      const initialRotation = doorObject.rotation[axis]
      console.log('[useAnimatedDoor] 🎯 Rotazione iniziale mesh:', {
        axis,
        radians: initialRotation,
        degrees: (initialRotation * 180 / Math.PI).toFixed(1) + '°'
      })
      
      // Salva posizione world della porta
      const doorWorldPos = new THREE.Vector3()
      const doorWorldQuat = new THREE.Quaternion()
      doorObject.getWorldPosition(doorWorldPos)
      doorObject.getWorldQuaternion(doorWorldQuat)
      
      // Reparenting
      parent.remove(doorObject)
      pivot.add(doorObject)
      
      // Calcola posizione locale rispetto al pivot
      const doorLocalPos = pivot.worldToLocal(doorWorldPos.clone())
      doorObject.position.copy(doorLocalPos)
      
      // Mantieni rotazione world
      const pivotWorldQuat = new THREE.Quaternion()
      pivot.getWorldQuaternion(pivotWorldQuat)
      const localQuat = pivotWorldQuat.clone().invert().multiply(doorWorldQuat)
      doorObject.quaternion.copy(localQuat)
      
      // ✅ INIZIALIZZA currentRotation con la rotazione iniziale della mesh
      // Così l'anta resta dov'è (non salta a 0)
      currentRotation.current = initialRotation
      
      // ✅ Applica questa rotazione anche al pivot
      if (axis === 'x') {
        pivot.rotation.x = initialRotation
      } else if (axis === 'y') {
        pivot.rotation.y = initialRotation
      } else if (axis === 'z') {
        pivot.rotation.z = initialRotation
      }
      
      // Aggiorna matrici
      doorObject.updateMatrix()
      pivot.updateMatrixWorld(true)
      doorObject.updateMatrixWorld(true)
      
      pivotGroupRef.current = pivot
      isInitialized.current = true
      
      // 🔒 SALVA BASE ROTATION (una volta sola)
      if (!hasBase.current) {
        baseRotation.current = pivot.rotation[axis]
        currentRotation.current = baseRotation.current
        targetRotation.current = baseRotation.current
        hasBase.current = true
        console.log('[useAnimatedDoor] 🔒 Base rotation salvata:', {
          axis,
          baseRad: baseRotation.current,
          baseDeg: (baseRotation.current * 180 / Math.PI).toFixed(1) + '°'
        })
      }
      
      console.log('[useAnimatedDoor] 🎯 Stato iniziale impostato:', {
        currentRotation: currentRotation.current,
        targetRotation: targetRotation.current,
        pivotRotation: pivot.rotation[axis],
        hasBase: hasBase.current
      })
      
      // Verifica posizione
      const checkWorldPos = new THREE.Vector3()
      doorObject.getWorldPosition(checkWorldPos)
      const delta = checkWorldPos.distanceTo(doorWorldPos)
      
      console.log('[useAnimatedDoor] ✅ Pivot creato. Position delta:', delta.toFixed(6))
      
      if (delta > 0.001) {
        console.warn('[useAnimatedDoor] ⚠️ Position drift detected:', delta)
      }
    } catch (error) {
      console.error('[useAnimatedDoor] Errore durante setup:', error)
    }
    
    // Cleanup
    return () => {
      if (pivotGroupRef.current && doorObject) {
        try {
          const originalParent = pivotGroupRef.current.parent
          if (originalParent) {
            originalParent.attach(doorObject)
          }
          if (pivotGroupRef.current.parent) {
            pivotGroupRef.current.parent.remove(pivotGroupRef.current)
          }
          pivotGroupRef.current = null
          isInitialized.current = false
          hasBase.current = false  // Reset anche hasBase
        } catch (error) {
          console.error('[useAnimatedDoor] Errore durante cleanup:', error)
        }
      }
    }
  }, [doorObject, config?.pivotX, config?.pivotY, config?.pivotZ, config?.axis, enabled])  // ✅ coordinate pivot + axis (NON angle!)
  
  // Aggiorna target quando cambia lo stato
  useEffect(() => {
    // ✅ Skip logica se disabilitato, ma hook è sempre chiamato
    if (!enabled || !config || !hasBase.current) return
    
    // 🔒 CLAMP dell'angolo (0-90°) + calcolo offset
    const clampedDeg = THREE.MathUtils.clamp(config.angle ?? 0, 0, 90)
    const offsetRad = THREE.MathUtils.degToRad(clampedDeg) * (config.direction ?? 1)
    
    if (isOpen) {
      // Target = base + offset (NON assoluto!)
      targetRotation.current = baseRotation.current + offsetRad
      console.log('[useAnimatedDoor] 🎯 Target: APERTO', {
        base: (baseRotation.current * 180 / Math.PI).toFixed(1) + '°',
        offset: clampedDeg + '°',
        total: (targetRotation.current * 180 / Math.PI).toFixed(1) + '°'
      })
    } else {
      // Chiuso = torna alla base
      targetRotation.current = baseRotation.current
      console.log('[useAnimatedDoor] 🎯 Target: CHIUSO (base)')
    }
  }, [isOpen, config, enabled])
  
  // 🚪 GESTIONE COLLISIONE DINAMICA - Porta aperta = attraversabile
  useEffect(() => {
    // ✅ Skip logica se disabilitato, ma hook è sempre chiamato
    if (!enabled || !doorObject) return
    
    // Porta CHIUSA → collidable = true (blocca il passaggio)
    // Porta APERTA → collidable = false (permetti di passare)
    doorObject.userData.collidable = !isOpen
    
    console.log(`[useAnimatedDoor] 🚪 ${doorObject.name}: collidable = ${!isOpen} (porta ${isOpen ? 'APERTA ✅ passa' : 'CHIUSA ✋ blocca'})`)
  }, [isOpen, doorObject, enabled])
  
  // ✅ ANIMAZIONE CON DAMPING + CLAMP FINALE (ANTI-360 DEFINITIVO)
  useFrame((_, delta) => {
    // ✅ Skip logica se disabilitato, ma hook è sempre chiamato
    if (!enabled || !pivotGroupRef.current || !config || !hasBase.current) {
      return
    }
    
    // Damping per convergenza smooth
    const dampingFactor = 8 // Più alto = più veloce (tipico: 5-10)
    
    currentRotation.current = THREE.MathUtils.damp(
      currentRotation.current,    // Valore attuale
      targetRotation.current,      // Valore target
      dampingFactor,               // Velocità di convergenza
      delta                        // Delta time
    )
    
    // 🔒 CLAMP FINALE - Range fisico porta (0-90° dall'angolo base)
    const direction = config.direction ?? 1
    const min = baseRotation.current + THREE.MathUtils.degToRad(0) * direction
    const max = baseRotation.current + THREE.MathUtils.degToRad(90) * direction
    
    const lo = Math.min(min, max)
    const hi = Math.max(min, max)
    
    currentRotation.current = THREE.MathUtils.clamp(currentRotation.current, lo, hi)
    
    // Log decisivo (ogni secondo circa)
    if (Math.floor(Date.now() / 1000) % 2 === 0 && Math.abs(currentRotation.current - targetRotation.current) > 0.01) {
      console.log('[useAnimatedDoor] 🔍 DEBUG:', {
        currentAngle: (currentRotation.current * 180 / Math.PI).toFixed(1) + '°',
        targetAngle: (targetRotation.current * 180 / Math.PI).toFixed(1) + '°',
        baseAngle: (baseRotation.current * 180 / Math.PI).toFixed(1) + '°',
        diff: ((targetRotation.current - currentRotation.current) * 180 / Math.PI).toFixed(2) + '°',
        clampRange: `${(lo * 180 / Math.PI).toFixed(1)}° - ${(hi * 180 / Math.PI).toFixed(1)}°`
      })
    }
    
    // Applica la rotazione al pivot (ASSEGNAZIONE, non incremento!)
    const axis = config.axis || 'y'
    
    if (axis === 'x') {
      pivotGroupRef.current.rotation.x = currentRotation.current
    } else if (axis === 'y') {
      pivotGroupRef.current.rotation.y = currentRotation.current
    } else if (axis === 'z') {
      pivotGroupRef.current.rotation.z = currentRotation.current
    }
  })
  
  return {
    isAnimating: Math.abs(targetRotation.current - currentRotation.current) > 0.001,
    progress: currentRotation.current
  }
}

export default useAnimatedDoor