// useMaterassoAnimation.js
// Hook DEDICATO per animazione materasso - usa coordinate ESATTE da Animation Editor
// ✅ NO conversioni Y→Z
// ✅ NO forzatura pivotY a 0
// ✅ Dati DIRETTI dall'editor

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook dedicato per animazione materasso (o qualsiasi hinged door)
 * Usa coordinate ESATTE dall'Animation Editor senza modifiche
 * 
 * @param {Array<THREE.Object3D>} objects - Array di oggetti da animare
 * @param {Object} config - Configurazione DIRETTA dall'editor
 * @param {boolean} isPlaying - Se l'animazione è attiva
 * @param {Function} onComplete - Callback completamento
 */
export function useMaterassoAnimation(objects, config, isPlaying, onComplete) {
  const pivotGroupRef = useRef(null)
  const animationProgress = useRef(0)
  const hasCompleted = useRef(false)
  const setupDoneRef = useRef(false)
  
  // Setup pivot e attach oggetti
  useEffect(() => {
    if (!objects || objects.length === 0 || !config) {
      console.log('[useMaterassoAnimation] ⚠️ Mancano objects o config')
      return
    }
    
    if (setupDoneRef.current && pivotGroupRef.current) {
      console.log('[useMaterassoAnimation] ✅ Setup già attivo, skip')
      return
    }
    
    console.log('[useMaterassoAnimation] 🎬 Setup animazione materasso')
    console.log('[useMaterassoAnimation] Oggetti:', objects.length)
    console.log('[useMaterassoAnimation] Config:', config)
    
    if (config.mode !== 'rotation') {
      console.error('[useMaterassoAnimation] ❌ Supporta solo mode=rotation')
      return
    }
    
    const parent = objects[0].parent
    if (!parent) {
      console.error('[useMaterassoAnimation] ❌ Oggetti senza parent!')
      return
    }
    
    // ✅ USA COORDINATE ESATTE dall'editor (NO conversioni!)
    const pivotWorldPos = new THREE.Vector3(
      config.pivotX,  // ← Esattamente come dall'editor
      config.pivotY,  // ← Esattamente come dall'editor (NO forza a 0!)
      config.pivotZ   // ← Esattamente come dall'editor
    )
    
    console.log('[useMaterassoAnimation] 🎯 Pivot da config (ESATTO):', [
      pivotWorldPos.x.toFixed(3),
      pivotWorldPos.y.toFixed(3),
      pivotWorldPos.z.toFixed(3)
    ])
    
    // Crea pivot group
    const pivotGroup = new THREE.Group()
    pivotGroup.name = 'PIVOT_Materasso'
    
    // Trova scene root
    let sceneRoot = parent
    while (sceneRoot && sceneRoot.parent && sceneRoot.parent.type !== 'Scene') {
      sceneRoot = sceneRoot.parent
    }
    if (sceneRoot && sceneRoot.parent && sceneRoot.parent.type === 'Scene') {
      sceneRoot = sceneRoot.parent
    }
    
    // Add pivot alla scene root (world space)
    sceneRoot.add(pivotGroup)
    pivotGroup.position.copy(pivotWorldPos)
    
    console.log('[useMaterassoAnimation] ✅ Pivot creato in scene root')
    console.log('[useMaterassoAnimation] Asse rotazione:', config.axis)
    console.log('[useMaterassoAnimation] Angolo:', config.angle, '°')
    console.log('[useMaterassoAnimation] Direzione:', config.direction)
    
    // Attach oggetti al pivot
    objects.forEach((obj, i) => {
      console.log(`[useMaterassoAnimation] 🔗 Attach parte ${i + 1}:`, obj.name)
      pivotGroup.attach(obj)
    })
    
    pivotGroupRef.current = pivotGroup
    setupDoneRef.current = true
    
    console.log('[useMaterassoAnimation] ✅ Setup completato!')
    
    // Cleanup
    return () => {
      if (hasCompleted.current || animationProgress.current > 0) {
        console.log('[useMaterassoAnimation] 🔒 Cleanup skippato - animazione in corso')
        return
      }
      
      if (pivotGroupRef.current && pivotGroupRef.current.parent) {
        console.log('[useMaterassoAnimation] 🧹 Cleanup: rimuovo pivot')
        const pivotParent = pivotGroupRef.current.parent
        const parts = [...pivotGroupRef.current.children]
        parts.forEach(obj => parent.attach(obj))
        pivotParent.remove(pivotGroupRef.current)
        pivotGroupRef.current = null
      }
      
      setupDoneRef.current = false
    }
  }, [objects, config])
  
  // Gestione start animazione
  useEffect(() => {
    if (isPlaying && !hasCompleted.current) {
      animationProgress.current = 0
      console.log('[useMaterassoAnimation] 🎬 Animazione AVVIATA')
    }
  }, [isPlaying])
  
  // Animation loop
  useFrame((_, delta) => {
    if (!isPlaying || !config || hasCompleted.current || !pivotGroupRef.current) {
      return
    }
    
    // Calcola progress
    const targetAngle = (config.angle || 90) * (Math.PI / 180)
    const speed = (config.speed || 90) * (Math.PI / 180) * delta
    const direction = config.direction || 1
    
    animationProgress.current += speed
    
    if (animationProgress.current >= targetAngle) {
      animationProgress.current = targetAngle
      hasCompleted.current = true
      
      console.log('[useMaterassoAnimation] ✅ Animazione COMPLETATA!')
      console.log('[useMaterassoAnimation] Angolo finale:', (targetAngle * 180 / Math.PI).toFixed(1), '°')
      
      if (onComplete) {
        console.log('[useMaterassoAnimation] 🔔 Chiamata onComplete')
        onComplete()
      }
    }
    
    // ✅ Applica rotazione DIRETTAMENTE sull'asse dall'editor
    const axis = config.axis || 'y'
    const currentAngle = animationProgress.current * direction
    
    if (axis === 'y') {
      pivotGroupRef.current.rotation.y = currentAngle
    } else if (axis === 'x') {
      pivotGroupRef.current.rotation.x = currentAngle
    } else if (axis === 'z') {
      pivotGroupRef.current.rotation.z = currentAngle
    }
  })
  
  return {
    isReady: setupDoneRef.current && pivotGroupRef.current !== null,
    pivotGroup: pivotGroupRef.current
  }
}

export default useMaterassoAnimation
