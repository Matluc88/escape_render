// useMultiObjectAnimationPreview.js
// Hook per eseguire preview delle animazioni su MULTIPLI oggetti contemporaneamente

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook per preview animazione su array di oggetti (sincronizzati)
 * @param {Array<THREE.Object3D>} objects - Array di oggetti da animare
 * @param {Object} config - Configurazione animazione (uguale per tutti)
 * @param {boolean} isPlaying - Se l'animazione è in esecuzione
 * @param {Function} onComplete - Callback quando l'animazione finisce
 */
export function useMultiObjectAnimationPreview(objects, config, isPlaying, onComplete) {
  const objectsData = useRef([]) // Array di { object, originalTransform, pivotGroup }
  const animationProgress = useRef(0)
  const direction = useRef(1)
  const hasCompleted = useRef(false)
  const previousIsPlaying = useRef(false)
  const completedSuccessfully = useRef(false)
  
  // Setup: salva transform originali per TUTTI gli oggetti
  useEffect(() => {
    if (!objects || objects.length === 0 || !config) return
    
    console.log('[useMultiObjectAnimationPreview] 🔄 Setup per', objects.length, 'oggetti')
    
    // Inizializza dati per ogni oggetto (solo se non già fatto)
    if (objectsData.current.length === 0) {
      objectsData.current = objects.map(obj => {
        const worldPos = new THREE.Vector3()
        const worldQuat = new THREE.Quaternion()
        obj.getWorldPosition(worldPos)
        obj.getWorldQuaternion(worldQuat)
        
        console.log(`[useMultiObjectAnimationPreview] 📦 Setup oggetto: ${obj.name}`)
        console.log(`   World Pos: [${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)}]`)
        
        return {
          object: obj,
          originalTransform: {
            worldPosition: worldPos,
            worldQuaternion: worldQuat,
            localPosition: obj.position.clone(),
            localRotation: obj.rotation.clone(),
            parent: obj.parent
          },
          pivotGroup: null // Creato dopo se necessario
        }
      })
    }
    
    // Setup pivot per rotazioni (se necessario)
    if (config.mode === 'rotation') {
      // 🎯 CALCOLA BOUNDING BOX COMBINATO di tutti gli oggetti
      const combinedBox = new THREE.Box3()
      objects.forEach(obj => {
        const objBox = new THREE.Box3().setFromObject(obj)
        combinedBox.union(objBox)
      })
      
      const combinedCenter = new THREE.Vector3()
      combinedBox.getCenter(combinedCenter)
      
      // Pivot combinato: centro X/Z, base Y
      const combinedPivotWorld = new THREE.Vector3(
        combinedCenter.x,
        combinedBox.min.y,  // Base comune
        combinedCenter.z
      )
      
      console.log('[useMultiObjectAnimationPreview] 📦 Bounding Box Combinato:', {
        min: combinedBox.min,
        max: combinedBox.max,
        center: combinedCenter,
        pivotWorld: combinedPivotWorld
      })
      
      objectsData.current.forEach((data, index) => {
        if (data.pivotGroup) return // Già creato
        
        const obj = data.object
        const parent = obj.parent
        
        if (!parent) {
          console.warn(`[useMultiObjectAnimationPreview] Oggetto ${obj.name} senza parent, skip pivot`)
          return
        }
        
        // Crea pivot group
        const pivot = new THREE.Group()
        pivot.name = `MULTI_ANIMATION_PIVOT_${index}`
        
        // ✅ USA PIVOT COMBINATO (non quello configurato)
        // Converti pivot combinato in LOCAL SPACE del parent
        const pivotLocalPos = parent.worldToLocal(combinedPivotWorld.clone())
        
        pivot.position.copy(pivotLocalPos)
        parent.add(pivot)
        pivot.updateMatrixWorld(true)
        
        // Salva world position dell'oggetto PRIMA del reparenting
        const objectWorldPos = new THREE.Vector3()
        const objectWorldQuat = new THREE.Quaternion()
        obj.getWorldPosition(objectWorldPos)
        obj.getWorldQuaternion(objectWorldQuat)
        
        // Reparenting
        parent.remove(obj)
        pivot.add(obj)
        
        // Converti world → local rispetto al pivot
        const objectLocalPos = pivot.worldToLocal(objectWorldPos.clone())
        obj.position.copy(objectLocalPos)
        
        // Mantieni rotazione world
        const pivotWorldQuat = new THREE.Quaternion()
        pivot.getWorldQuaternion(pivotWorldQuat)
        const localQuat = pivotWorldQuat.clone().invert().multiply(objectWorldQuat)
        obj.quaternion.copy(localQuat)
        
        obj.updateMatrix()
        pivot.updateMatrixWorld(true)
        obj.updateMatrixWorld(true)
        
        data.pivotGroup = pivot
        
        console.log(`[useMultiObjectAnimationPreview] ✅ Pivot creato per: ${obj.name}`)
      })
    }
    
    return () => {
      // Cleanup: rimuovi pivot e ripristina oggetti
      objectsData.current.forEach(data => {
        if (data.pivotGroup && data.object && data.originalTransform) {
          const originalParent = data.originalTransform.parent
          if (originalParent) {
            originalParent.attach(data.object)
          }
          if (data.pivotGroup.parent) {
            data.pivotGroup.parent.remove(data.pivotGroup)
          }
          data.pivotGroup = null
        }
      })
      objectsData.current = []
    }
  }, [objects, config])
  
  // Reset quando l'animazione si ferma
  useEffect(() => {
    const hasStarted = isPlaying && !previousIsPlaying.current
    
    if (isPlaying) {
      if (hasStarted) {
        // ✅ FIX: Non resettare se già completato con successo
        if (!completedSuccessfully.current) {
          hasCompleted.current = false
          animationProgress.current = 0
          console.log('[useMultiObjectAnimationPreview] 🎬 Animazione multi-object AVVIATA')
        } else {
          console.log('[useMultiObjectAnimationPreview] ⚠️ Animazione già completata - skip reset')
        }
        completedSuccessfully.current = false
      }
      
      // Rendi tutti gli oggetti sempre visibili
      objectsData.current.forEach(data => {
        data.object.traverse((child) => {
          if (child.isMesh) {
            if (!child.userData.originalRenderOrder) {
              child.userData.originalRenderOrder = child.renderOrder || 0
            }
            child.renderOrder = 9999
            child.material.depthTest = false
            child.material.depthWrite = false
            child.material.transparent = true
            child.material.needsUpdate = true
          }
        })
      })
      
    } else if (!isPlaying && objectsData.current.length > 0) {
      console.log('[useMultiObjectAnimationPreview] ⏹️ Animazione multi-object FERMATA')
      
      // Ripristina renderOrder
      objectsData.current.forEach(data => {
        data.object.traverse((child) => {
          if (child.isMesh && child.userData.originalRenderOrder !== undefined) {
            child.renderOrder = child.userData.originalRenderOrder
            child.material.depthTest = true
            child.material.depthWrite = true
            child.material.needsUpdate = true
            delete child.userData.originalRenderOrder
          }
        })
      })
      
      // Ripristina posizioni (solo se non completato con successo)
      if (config.mode === 'position') {
        if (!completedSuccessfully.current) {
          objectsData.current.forEach(data => {
            data.object.position.copy(data.originalTransform.localPosition)
          })
          console.log('[useMultiObjectAnimationPreview] ⚠️ Animazione interrotta - posizioni ripristinate')
        } else {
          console.log('[useMultiObjectAnimationPreview] ✅ Animazione completata - oggetti rimangono a destinazione')
        }
      } else if (config.mode === 'rotation') {
        objectsData.current.forEach(data => {
          if (data.pivotGroup) {
            data.pivotGroup.rotation.set(0, 0, 0)
          }
        })
      }
      
      animationProgress.current = 0
      direction.current = 1
    }
    
    previousIsPlaying.current = isPlaying
  }, [isPlaying, config])
  
  // Animazione loop - TUTTI gli oggetti si muovono insieme
  useFrame((_, delta) => {
    // 🛑 FIX #1: STRONG GUARD - Se completato, NON fare NULLA
    if (hasCompleted.current) {
      // console.log('🛑 [MULTI-OBJECT] hasCompleted=true - BLOCCO loop')
      return
    }
    
    if (!isPlaying || objectsData.current.length === 0 || !config) {
      return
    }
    
    if (config.mode === 'rotation') {
      // ROTAZIONE ONE-SHOT - Applica a tutti i pivot e FERMA quando completa
      const targetAngle = (config.angle || 90) * (Math.PI / 180)
      const speed = (config.speed || 90) * (Math.PI / 180) * delta
      
      animationProgress.current += speed * direction.current
      
      // 🛑 FIX #2: CLAMP progress PRIMA del check (previene overflow)
      animationProgress.current = Math.min(animationProgress.current, targetAngle)
      
      // ONE-SHOT: fermati quando raggiungi l'angolo target
      if (animationProgress.current >= targetAngle) {
        animationProgress.current = targetAngle
        hasCompleted.current = true
        completedSuccessfully.current = true
        
        // Posiziona TUTTI i pivot esattamente all'angolo target
        const axis = config.axis || 'y'
        const rotationDirection = config.direction || 1
        const finalRotation = targetAngle * rotationDirection
        
        objectsData.current.forEach((data, index) => {
          if (data.pivotGroup) {
            if (axis === 'x') {
              data.pivotGroup.rotation.x = finalRotation
            } else if (axis === 'y') {
              data.pivotGroup.rotation.y = finalRotation
            } else if (axis === 'z') {
              data.pivotGroup.rotation.z = finalRotation
            }
            console.log(`[useMultiObjectAnimationPreview] ✅ ${index + 1}. ${data.object.name} → rotazione completata`)
          }
        })
        
        console.log('[useMultiObjectAnimationPreview] 🎉 Rotazione multi-object COMPLETATA (ONE-SHOT)!')
        console.log('[useMultiObjectAnimationPreview] 🛑 Flag hasCompleted settato - animazione BLOCCATA')
        
        if (onComplete) {
          onComplete()
        }
        
        return // Esci dal loop - non continuare
      }
      
      const axis = config.axis || 'y'
      const rotationDirection = config.direction || 1
      const finalRotation = animationProgress.current * rotationDirection
      
      // Applica rotazione a TUTTI i pivot
      objectsData.current.forEach(data => {
        if (data.pivotGroup) {
          if (axis === 'x') {
            data.pivotGroup.rotation.x = finalRotation
          } else if (axis === 'y') {
            data.pivotGroup.rotation.y = finalRotation
          } else if (axis === 'z') {
            data.pivotGroup.rotation.z = finalRotation
          }
        }
      })
      
    } else if (config.mode === 'position') {
      // POSIZIONE - Muovi TUTTI gli oggetti insieme
      const worldStart = new THREE.Vector3(config.startX, config.startY, config.startZ)
      const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
      
      const speed = (config.speed || 2.0) * delta
      
      // Log iniziale
      if (animationProgress.current === 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📊 [MULTI-OBJECT] Animazione ${objectsData.current.length} oggetti:`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        objectsData.current.forEach((data, i) => {
          console.log(`${i + 1}. ${data.object.name}`)
        })
        console.log(`📍 WORLD Start: [${worldStart.x.toFixed(3)}, ${worldStart.y.toFixed(3)}, ${worldStart.z.toFixed(3)}]`)
        console.log(`🎯 WORLD End:   [${worldEnd.x.toFixed(3)}, ${worldEnd.y.toFixed(3)}, ${worldEnd.z.toFixed(3)}]`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      // Calcola progress per TUTTI (usando primo oggetto come riferimento)
      const firstObj = objectsData.current[0].object
      let localStart, localEnd
      
      if (firstObj.parent) {
        firstObj.parent.updateWorldMatrix(true, false)
        localStart = firstObj.parent.worldToLocal(worldStart.clone())
        localEnd = firstObj.parent.worldToLocal(worldEnd.clone())
      } else {
        localStart = worldStart.clone()
        localEnd = worldEnd.clone()
      }
      
      const distance = localStart.distanceTo(localEnd)
      if (distance === 0) return
      
      const progressSpeed = speed / distance
      animationProgress.current += progressSpeed * direction.current
      
      // ONE-SHOT: fermati quando arrivi
      if (animationProgress.current >= 1) {
        animationProgress.current = 1
        hasCompleted.current = true
        completedSuccessfully.current = true
        
        // Posiziona TUTTI gli oggetti alla destinazione
        objectsData.current.forEach((data, index) => {
          const obj = data.object
          let objLocalEnd
          
          if (obj.parent) {
            obj.parent.updateWorldMatrix(true, false)
            objLocalEnd = obj.parent.worldToLocal(worldEnd.clone())
          } else {
            objLocalEnd = worldEnd.clone()
          }
          
          obj.position.copy(objLocalEnd)
          
          console.log(`[useMultiObjectAnimationPreview] ✅ ${index + 1}. ${obj.name} → destinazione`)
        })
        
        console.log('[useMultiObjectAnimationPreview] 🎉 Animazione multi-object COMPLETATA!')
        
        if (onComplete) {
          onComplete()
        }
        
        return
      }
      
      const clampedProgress = Math.max(0, Math.min(1, animationProgress.current))
      
      // Interpola posizione per TUTTI gli oggetti
      objectsData.current.forEach(data => {
        const obj = data.object
        let objLocalStart, objLocalEnd
        
        if (obj.parent) {
          obj.parent.updateWorldMatrix(true, false)
          objLocalStart = obj.parent.worldToLocal(worldStart.clone())
          objLocalEnd = obj.parent.worldToLocal(worldEnd.clone())
        } else {
          objLocalStart = worldStart.clone()
          objLocalEnd = worldEnd.clone()
        }
        
        obj.position.lerpVectors(objLocalStart, objLocalEnd, clampedProgress)
      })
    }
  })
  
  return {
    progress: animationProgress.current,
    isAnimating: isPlaying
  }
}

export default useMultiObjectAnimationPreview
