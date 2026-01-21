// useAnimationPreview.js
// Hook per eseguire preview delle animazioni in real-time

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hasRootNode } from '../utils/movableNodeHelper'

/**
 * Hook per preview animazione su un oggetto
 * @param {THREE.Object3D} object - Oggetto da animare
 * @param {Object} config - Configurazione animazione
 * @param {boolean} isPlaying - Se l'animazione è in esecuzione
 * @param {Function} onComplete - Callback quando l'animazione finisce
 */
export function useAnimationPreview(object, config, isPlaying, onComplete) {
  const originalTransform = useRef(null)
  const animationProgress = useRef(0)
  const direction = useRef(1) // 1 = avanti, -1 = indietro
  const pivotGroup = useRef(null)
  const hasCompleted = useRef(false) // Flag per bloccare animazione dopo completamento
  const previousIsPlaying = useRef(false) // Track precedente stato isPlaying
  const completedSuccessfully = useRef(false) // ✅ Flag per tracciare se animazione è completata con successo
  
  // Setup: salva transform originale in WORLD space (più robusto e universale)
  useEffect(() => {
    if (!object || !config) return
    
    // Salva transform originale solo una volta (in WORLD coordinates)
    if (!originalTransform.current) {
      const worldPos = new THREE.Vector3()
      const worldQuat = new THREE.Quaternion()
      object.getWorldPosition(worldPos)
      object.getWorldQuaternion(worldQuat)
      
      originalTransform.current = {
        worldPosition: worldPos,
        worldQuaternion: worldQuat,
        localPosition: object.position.clone(),
        localRotation: object.rotation.clone(),
        parent: object.parent
      }
      
      console.log('[useAnimationPreview] ✅ Transform originale salvato (WORLD space):')
      console.log('   World Position:', worldPos)
      console.log('   Local Position:', object.position)
      console.log('   Parent:', object.parent ? object.parent.name : 'Scene')
    }
    
    // Setup pivot per rotazioni
    if (config.mode === 'rotation' && !pivotGroup.current) {
      const parent = object.parent
      if (!parent) {
        console.warn('[useAnimationPreview] Oggetto senza parent, skip pivot setup')
        return
      }
      
      // Salva la matrice world dell'oggetto PRIMA di qualsiasi modifica
      const originalWorldMatrix = object.matrixWorld.clone()
      const originalPosition = object.position.clone()
      const originalRotation = object.rotation.clone()
      const originalQuaternion = object.quaternion.clone()
      
      // Crea pivot group
      const pivot = new THREE.Group()
      pivot.name = 'ANIMATION_PREVIEW_PIVOT'
      
      // Le coordinate del cardine sono in WORLD SPACE
      // Dobbiamo convertirle in LOCAL SPACE del parent
      const pivotWorldPos = new THREE.Vector3(config.pivotX, config.pivotY, config.pivotZ)
      
      // Converti da world space a local space del parent
      const pivotLocalPos = parent.worldToLocal(pivotWorldPos.clone())
      
      // Posiziona il pivot in coordinate locali del parent
      pivot.position.copy(pivotLocalPos)
      
      // Inserisci pivot nella gerarchia (stesso parent dell'oggetto)
      parent.add(pivot)
      pivot.updateMatrixWorld(true)
      
      // Salva la posizione world dell'oggetto PRIMA del reparenting
      const objectWorldPos = new THREE.Vector3()
      const objectWorldQuat = new THREE.Quaternion()
      object.getWorldPosition(objectWorldPos)
      object.getWorldQuaternion(objectWorldQuat)
      
      // Rimuovi oggetto dal parent corrente
      parent.remove(object)
      
      // Aggiungi oggetto al pivot
      pivot.add(object)
      
      // Converti la world position dell'oggetto in local position rispetto al pivot
      const objectLocalPos = pivot.worldToLocal(objectWorldPos.clone())
      object.position.copy(objectLocalPos)
      
      // Mantieni la rotazione world originale
      // Calcola la rotazione locale necessaria per mantenere la world rotation
      const pivotWorldQuat = new THREE.Quaternion()
      pivot.getWorldQuaternion(pivotWorldQuat)
      const localQuat = pivotWorldQuat.clone().invert().multiply(objectWorldQuat)
      object.quaternion.copy(localQuat)
      
      // Aggiorna le matrici
      object.updateMatrix()
      pivot.updateMatrixWorld(true)
      object.updateMatrixWorld(true)
      
      pivotGroup.current = pivot
      
      // Verifica che la posizione world sia rimasta la stessa
      const checkWorldPos = new THREE.Vector3()
      object.getWorldPosition(checkWorldPos)
      const delta = checkWorldPos.distanceTo(objectWorldPos)
      
      console.log('[useAnimationPreview] Pivot creato:', {
        pivotWorldPos: pivotWorldPos,
        pivotLocalPos: pivotLocalPos,
        objectOriginalWorldPos: objectWorldPos,
        objectNewWorldPos: checkWorldPos,
        positionDelta: delta.toFixed(6)
      })
      
      if (delta > 0.001) {
        console.warn('[useAnimationPreview] ⚠️ Position drift detected:', delta.toFixed(6))
      }
    }
    
    return () => {
      // Cleanup: rimuovi pivot e ripristina oggetto
      if (pivotGroup.current && object && originalTransform.current) {
        const originalParent = originalTransform.current.parent
        if (originalParent) {
          originalParent.attach(object)
        }
        if (pivotGroup.current.parent) {
          pivotGroup.current.parent.remove(pivotGroup.current)
        }
        pivotGroup.current = null
      }
    }
  }, [object, config])
  
  // Reset quando l'animazione si ferma + GESTIONE RENDER ORDER
  useEffect(() => {
    // 🔄 Detect cambio stato: false → true significa NUOVA animazione
    const hasStarted = isPlaying && !previousIsPlaying.current
    
    if (isPlaying && object) {
      // RESET FLAG solo se sta INIZIANDO (transizione false → true)
      if (hasStarted) {
        hasCompleted.current = false
        completedSuccessfully.current = false  // ✅ Reset flag successo
        animationProgress.current = 0
        console.log('[useAnimationPreview] 🔄 NUOVA animazione - Reset flags')
      }
      
      // 🎨 ANIMAZIONE INIZIA: Rendi oggetto sempre visibile
      console.log('[useAnimationPreview] 🎨 Attivo renderOrder alto per visibilità')
      
      // Salva renderOrder originali e imposta alto valore
      object.traverse((child) => {
        if (child.isMesh) {
          if (!child.userData.originalRenderOrder) {
            child.userData.originalRenderOrder = child.renderOrder || 0
          }
          child.renderOrder = 9999 // Renderizza SEMPRE in primo piano
          child.material.depthTest = false // Ignora depth buffer (sempre visibile)
          child.material.depthWrite = false // Non scrive nel depth buffer
          child.material.transparent = true // Necessario per alcune configurazioni
          child.material.needsUpdate = true
        }
      })
    } else if (!isPlaying && originalTransform.current && object) {
      // 🎨 ANIMAZIONE FINISCE: Ripristina renderOrder originale
      console.log('[useAnimationPreview] 🎨 Ripristino renderOrder originale')
      
      object.traverse((child) => {
        if (child.isMesh && child.userData.originalRenderOrder !== undefined) {
          child.renderOrder = child.userData.originalRenderOrder
          child.material.depthTest = true // Ripristina depth test normale
          child.material.depthWrite = true // Ripristina depth write
          child.material.needsUpdate = true
          delete child.userData.originalRenderOrder
        }
      })
      
      // ✅ Ripristina transform originale SOLO se non completata con successo
      if (config.mode === 'position') {
        if (!completedSuccessfully.current) {
          // Animazione interrotta → ripristina posizione originale
          object.position.copy(originalTransform.current.localPosition)
          console.log('[useAnimationPreview] ⚠️ Animazione interrotta - posizione ripristinata a:', originalTransform.current.localPosition)
        } else {
          // Animazione completata → lascia dove è arrivata
          console.log('[useAnimationPreview] ✅ Animazione completata con successo - pentola rimane a destinazione')
          console.log('[useAnimationPreview] 📍 Posizione attuale:', object.position)
        }
      } else if (config.mode === 'rotation' && pivotGroup.current) {
        pivotGroup.current.rotation.set(0, 0, 0)
      }
      
      animationProgress.current = 0
      direction.current = 1
      
      console.log('[useAnimationPreview] Animazione fermata')
    }
    
    // 🔄 Aggiorna stato precedente per il prossimo ciclo
    previousIsPlaying.current = isPlaying
  }, [isPlaying, object, config])
  
  // Animazione loop
  useFrame((_, delta) => {
    // 🐛 DEBUG: Log SEMPRE per capire cosa succede
    if (!isPlaying) {
      // isPlaying è false - normale che non anim
      return
    }
    
    if (!object) {
      console.log('[useAnimationPreview] 🐛 useFrame: object è NULL')
      return
    }
    
    if (!config) {
      console.log('[useAnimationPreview] 🐛 useFrame: config è NULL')
      return
    }
    
    // 🛑 BLOCCA se animazione già completata (ONE-SHOT)
    if (hasCompleted.current) {
      // 🐛 DEBUG: Traccia posizione DOPO completamento per capire perché continua
      const currentPos = object.position.clone()
      const end = new THREE.Vector3(config.endX, config.endY, config.endZ)
      const drift = currentPos.distanceTo(end)
      console.log(`[useAnimationPreview] 🐛 DOPO completamento - Pos: [${currentPos.x.toFixed(3)}, ${currentPos.y.toFixed(3)}, ${currentPos.z.toFixed(3)}] | Drift da B: ${drift.toFixed(6)}m`)
      return
    }
    
    if (config.mode === 'rotation') {
      // ROTAZIONE
      if (!pivotGroup.current) return
      
      const targetAngle = (config.angle || 90) * (Math.PI / 180)
      const speed = (config.speed || 90) * (Math.PI / 180) * delta
      
      // Aggiorna progress
      animationProgress.current += speed * direction.current
      
      // Inverti direzione ai limiti
      if (animationProgress.current >= targetAngle) {
        animationProgress.current = targetAngle
        direction.current = -1
      } else if (animationProgress.current <= 0) {
        animationProgress.current = 0
        direction.current = 1
        
        // Completa un ciclo
        if (onComplete) {
          onComplete()
        }
      }
      
      // Applica rotazione al pivot (con direzione)
      const axis = config.axis || 'y'
      const rotationDirection = config.direction || 1
      const finalRotation = animationProgress.current * rotationDirection
      
      if (axis === 'x') {
        pivotGroup.current.rotation.x = finalRotation
      } else if (axis === 'y') {
        pivotGroup.current.rotation.y = finalRotation
      } else if (axis === 'z') {
        pivotGroup.current.rotation.z = finalRotation
      }
      
    } else if (config.mode === 'position') {
      // POSIZIONE - Config contiene coordinate WORLD space
      const worldStart = new THREE.Vector3(config.startX, config.startY, config.startZ)
      const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
      
      // ✅ CONVERSIONE: WORLD → LOCAL rispetto al parent dell'oggetto
      let localStart, localEnd
      
      if (object.parent) {
        // Forza aggiornamento matrice del parent (determinismo)
        object.parent.updateWorldMatrix(true, false)
        
        // Converti da world space a local space del parent
        localStart = object.parent.worldToLocal(worldStart.clone())
        localEnd = object.parent.worldToLocal(worldEnd.clone())
      } else {
        // Oggetto senza parent → LOCAL = WORLD
        localStart = worldStart.clone()
        localEnd = worldEnd.clone()
      }
      
      const speed = (config.speed || 2.0) * delta
      const distance = localStart.distanceTo(localEnd)
      
      if (distance === 0) return
      
      // 📊 LOG INIZIALE: Mostra configurazione traiettoria con conversione
      if (animationProgress.current === 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📊 [TRAIETTORIA] Configurazione animazione:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📍 WORLD Start: [${worldStart.x.toFixed(3)}, ${worldStart.y.toFixed(3)}, ${worldStart.z.toFixed(3)}]`)
        console.log(`🔄 LOCAL Start: [${localStart.x.toFixed(3)}, ${localStart.y.toFixed(3)}, ${localStart.z.toFixed(3)}]`)
        console.log(`🎯 WORLD End:   [${worldEnd.x.toFixed(3)}, ${worldEnd.y.toFixed(3)}, ${worldEnd.z.toFixed(3)}]`)
        console.log(`🔄 LOCAL End:   [${localEnd.x.toFixed(3)}, ${localEnd.y.toFixed(3)}, ${localEnd.z.toFixed(3)}]`)
        console.log(`📏 Distanza totale: ${distance.toFixed(3)}m`)
        console.log(`⚡ Velocità: ${speed.toFixed(3)} u/s`)
        console.log(`👨‍👦 Parent: ${object.parent ? object.parent.name : 'Scene'}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      // Aggiorna progress (0 = start, 1 = end)
      const progressSpeed = speed / distance
      animationProgress.current += progressSpeed * direction.current
      
      // ONE-SHOT: fermati quando arrivi alla destinazione
      if (animationProgress.current >= 1) {
        animationProgress.current = 1
        // Posiziona oggetto esattamente alla destinazione (LOCAL coordinates)
        object.position.copy(localEnd)
        
        // 🛑 SETTA FLAG per bloccare ulteriori frame
        hasCompleted.current = true
        completedSuccessfully.current = true  // ✅ Marca come completata con successo
        
        // 📊 LOG FINALE: Confronto Punto B vs Posizione Effettiva (in LOCAL)
        const actualLocalPos = object.position.clone()
        const deltaX = Math.abs(actualLocalPos.x - localEnd.x)
        const deltaY = Math.abs(actualLocalPos.y - localEnd.y)
        const deltaZ = Math.abs(actualLocalPos.z - localEnd.z)
        const totalDelta = actualLocalPos.distanceTo(localEnd)
        
        // Verifica anche WORLD position per debugging
        const actualWorldPos = new THREE.Vector3()
        object.getWorldPosition(actualWorldPos)
        const worldDelta = actualWorldPos.distanceTo(worldEnd)
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎯 [ARRIVO] Confronto Punto B vs Posizione Finale:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`🎯 Punto B LOCAL:  [${localEnd.x.toFixed(3)}, ${localEnd.y.toFixed(3)}, ${localEnd.z.toFixed(3)}]`)
        console.log(`📍 Pos effettiva LOCAL: [${actualLocalPos.x.toFixed(3)}, ${actualLocalPos.y.toFixed(3)}, ${actualLocalPos.z.toFixed(3)}]`)
        console.log(`📏 Delta X: ${deltaX.toFixed(6)}m (${deltaX < 0.001 ? '✅ OK' : '⚠️ DRIFT'})`)
        console.log(`📏 Delta Y: ${deltaY.toFixed(6)}m (${deltaY < 0.001 ? '✅ OK' : '⚠️ DRIFT'})`)
        console.log(`📏 Delta Z: ${deltaZ.toFixed(6)}m (${deltaZ < 0.001 ? '✅ OK' : '⚠️ DRIFT'})`)
        console.log(`📏 Distanza totale LOCAL: ${totalDelta.toFixed(6)}m (${totalDelta < 0.001 ? '✅ PRECISO' : '⚠️ IMPRECISO'})`)
        console.log(`🌍 Punto B WORLD: [${worldEnd.x.toFixed(3)}, ${worldEnd.y.toFixed(3)}, ${worldEnd.z.toFixed(3)}]`)
        console.log(`🌍 Pos effettiva WORLD: [${actualWorldPos.x.toFixed(3)}, ${actualWorldPos.y.toFixed(3)}, ${actualWorldPos.z.toFixed(3)}]`)
        console.log(`🌍 Distanza WORLD: ${worldDelta.toFixed(6)}m (${worldDelta < 0.001 ? '✅ PRECISO' : '⚠️ IMPRECISO'})`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        console.log('[useAnimationPreview] ✅ Animazione ONE-SHOT completata - oggetto fermo su destinazione')
        console.log('[useAnimationPreview] 🛑 Flag hasCompleted settato a TRUE - animazione BLOCCATA')
        console.log('[useAnimationPreview] 🚫 STOP LOOP - Non elaborare più frame')
        
        // Chiama onComplete per notificare che l'animazione è finita
        if (onComplete) {
          onComplete()
        }
        
        // FERMA animazione - non tornare indietro!
        // NON fare altri calcoli dopo questo punto
        return
      }
      
      // Clamp progress per sicurezza (previene estrapolazione)
      const clampedProgress = Math.max(0, Math.min(1, animationProgress.current))
      
      // Interpola posizione usando coordinate LOCAL
      object.position.lerpVectors(localStart, localEnd, clampedProgress)
      
      // 📊 LOG CONTINUO: Ogni 25% di progresso
      const progressPercent = Math.floor(animationProgress.current * 100)
      if (progressPercent % 25 === 0 && progressPercent > 0) {
        const currentPos = object.position.clone()
        console.log(`🚀 [${progressPercent}%] Posizione: [${currentPos.x.toFixed(3)}, ${currentPos.y.toFixed(3)}, ${currentPos.z.toFixed(3)}]`)
      }
    }
  })
  
  return {
    progress: animationProgress.current,
    isAnimating: isPlaying
  }
}

export default useAnimationPreview
