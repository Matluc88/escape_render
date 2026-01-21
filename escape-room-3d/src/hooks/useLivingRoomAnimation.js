// useLivingRoomAnimation.js
// Hook per animazione sincronizzata Humano + CouchSet nel soggiorno
// Tasto M: Toggle tra 0° e 30°

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Trova scene risalendo la gerarchia
 */
function findScene(node) {
  let current = node
  while (current && current.parent) {
    if (current.parent.type === 'Scene') {
      return current.parent
    }
    current = current.parent
  }
  return current
}

/**
 * Hook per animazione soggiorno (Humano + CouchSet)
 * @param {THREE.Object3D} humanObject - Oggetto Humano
 * @param {THREE.Object3D} couchObject - Oggetto CouchSet
 * @param {Object} config - Configurazione animazione
 * @param {boolean} isPlaying - Se l'animazione è attiva
 * @param {Function} onComplete - Callback completamento
 */
export function useLivingRoomAnimation(humanObject, couchObject, config, isPlaying, onComplete) {
  const pivotGroupRef = useRef(null)
  const animationProgress = useRef(0)
  const hasCompleted = useRef(false)
  const previousIsPlaying = useRef(false)
  const setupDoneRef = useRef(false)
  
  // Setup pivot e attach oggetti
  useEffect(() => {
    // ✅ Controlla solo oggetti (config può essere null inizialmente)
    if (!humanObject || !couchObject) {
      console.log('[useLivingRoomAnimation] ⚠️ Oggetti non ancora pronti')
      return
    }
    
    if (setupDoneRef.current && pivotGroupRef.current) {
      console.log('[useLivingRoomAnimation] ✅ Setup già attivo, skip re-setup')
      return
    }
    
    console.log('[useLivingRoomAnimation] 🔍 Setup animazione soggiorno...')
    console.log('[useLivingRoomAnimation] Humano:', humanObject.name)
    console.log('[useLivingRoomAnimation] Couch:', couchObject.name)
    
    // ✅ Config può essere null durante setup - verrà usato dopo nel useFrame
    if (config && config.mode !== 'rotation') {
      console.error('[useLivingRoomAnimation] ❌ Solo modalità rotation supportata')
      return
    }
    
    // Verifica che abbiano lo stesso parent
    if (humanObject.parent !== couchObject.parent) {
      console.warn('[useLivingRoomAnimation] ⚠️ Oggetti hanno parent diversi!')
    }
    
    const parent = humanObject.parent
    
    // ✅ Usa coordinate di default se config non ancora caricato
    const pivotWorldPos = new THREE.Vector3(
      config?.pivotX || 0,
      0, // Pavimento
      config?.pivotZ || 0
    )
    
    const pivotGroup = new THREE.Group()
    pivotGroup.name = 'PIVOT_LivingRoom'
    
    // Add pivot alla scene root (world space)
    const sceneRoot = findScene(parent)
    sceneRoot.add(pivotGroup)
    
    // Posiziona pivot in world coordinates
    pivotGroup.position.copy(pivotWorldPos)
    
    console.log('[useLivingRoomAnimation] 🎯 Pivot WORLD:', [
      pivotGroup.position.x.toFixed(3),
      pivotGroup.position.y.toFixed(3),
      pivotGroup.position.z.toFixed(3)
    ])
    
    // Attach entrambi gli oggetti al pivot
    console.log('[useLivingRoomAnimation] 🔗 Attach Humano al pivot')
    pivotGroup.attach(humanObject)
    
    console.log('[useLivingRoomAnimation] 🔗 Attach CouchSet al pivot')
    pivotGroup.attach(couchObject)
    
    pivotGroupRef.current = pivotGroup
    setupDoneRef.current = true
    
    console.log('[useLivingRoomAnimation] ✅ Setup completato! Oggetti attaccati al pivot.')
    
    return () => {
      // Cleanup solo se NON c'è animazione in corso
      if (hasCompleted.current || animationProgress.current > 0) {
        console.log('[useLivingRoomAnimation] 🔒 Cleanup SKIPPATO - animazione in corso')
        return
      }
      
      if (pivotGroupRef.current && pivotGroupRef.current.parent) {
        console.log('[useLivingRoomAnimation] 🧹 Cleanup: rimuovo pivot')
        
        const pivotParent = pivotGroupRef.current.parent
        
        // Reparenta oggetti al parent originale
        if (humanObject) parent.attach(humanObject)
        if (couchObject) parent.attach(couchObject)
        
        // Rimuovi pivot
        pivotParent.remove(pivotGroupRef.current)
        pivotGroupRef.current = null
      }
      
      setupDoneRef.current = false
    }
  }, [humanObject?.uuid, couchObject?.uuid]) // ← Rimosso config dalle dipendenze
  
  // Gestione start/stop animazione
  useEffect(() => {
    const hasStarted = isPlaying && !previousIsPlaying.current
    const hasStopped = !isPlaying && previousIsPlaying.current
    
    if (hasStarted) {
      hasCompleted.current = false
      console.log('[useLivingRoomAnimation] 🎬 Animazione AVVIATA')
      console.log('[useLivingRoomAnimation] 📍 Progress corrente:', animationProgress.current, 'radianti')
    }
    
    if (hasStopped) {
      console.log('[useLivingRoomAnimation] ⏹️ Animazione FERMATA')
      console.log('[useLivingRoomAnimation] 🔒 Posizione BLOCCATA a:', animationProgress.current, 'radianti')
      console.log('[useLivingRoomAnimation] 📐 Angolo corrente:', (animationProgress.current * 180 / Math.PI).toFixed(1), '°')
    }
    
    previousIsPlaying.current = isPlaying
  }, [isPlaying])
  
  // Animation loop
  useFrame((_, delta) => {
    if (!isPlaying || !config || hasCompleted.current || !pivotGroupRef.current) {
      return
    }
    
    // Calcola progress
    const targetAngle = (config.angle || 30) * (Math.PI / 180)
    const speed = (config.speed || 45) * (Math.PI / 180) * delta
    const direction = config.direction || 1
    
    animationProgress.current += speed
    
    if (animationProgress.current >= targetAngle) {
      animationProgress.current = targetAngle
      hasCompleted.current = true
      console.log('[useLivingRoomAnimation] ✅ Animazione COMPLETATA!')
      
      if (onComplete) {
        onComplete()
      }
    }
    
    // Applica rotazione al pivot
    const axis = config.axis || 'z'
    const currentAngle = animationProgress.current * direction
    
    if (axis === 'z') {
      pivotGroupRef.current.rotation.z = currentAngle
    } else if (axis === 'y') {
      pivotGroupRef.current.rotation.y = currentAngle
    } else if (axis === 'x') {
      pivotGroupRef.current.rotation.x = currentAngle
    }
  })
  
  return {
    isReady: setupDoneRef.current && pivotGroupRef.current !== null,
    pivotGroup: pivotGroupRef.current
  }
}

export default useLivingRoomAnimation
