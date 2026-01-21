// usePentolaTracker.js
// Sistema di tracking ferreo per PENTOLA - monitora ogni singolo movimento

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook di tracking dedicato per PENTOLA
 * Cattura OGNI movimento frame-by-frame con precisione millimetrica
 * @param {THREE.Object3D} pentolaRef - Riferimento alla pentola
 * @param {boolean} enabled - Se il tracking è attivo
 */
export function usePentolaTracker(pentolaRef, enabled = false) {
  const previousPosition = useRef(null)
  const previousTime = useRef(null)
  const frameCount = useRef(0)
  const startTime = useRef(null)
  const isMoving = useRef(false)
  const lastLoggedPosition = useRef(null)
  const consecutiveStops = useRef(0)
  
  // ✅ NUOVO: Salva posizione iniziale e finale REALE
  const realStartPosition = useRef(null)
  const realEndPosition = useRef(null)

  // Reset al mount
  useEffect(() => {
    if (enabled && pentolaRef.current) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 [PENTOLA TRACKER] ATTIVATO')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📦 Oggetto:', pentolaRef.current.name)
      console.log('🆔 UUID:', pentolaRef.current.uuid)
      console.log('👪 Parent:', pentolaRef.current.parent?.name || 'Scene')
      
      const pos = pentolaRef.current.position
      console.log(`📍 Posizione iniziale: [${pos.x.toFixed(6)}, ${pos.y.toFixed(6)}, ${pos.z.toFixed(6)}]`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      previousPosition.current = pos.clone()
      lastLoggedPosition.current = pos.clone()
      previousTime.current = performance.now()
      startTime.current = performance.now()
      frameCount.current = 0
      consecutiveStops.current = 0
      isMoving.current = false
    }

    return () => {
      if (enabled) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🛑 [PENTOLA TRACKER] DISATTIVATO')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        previousPosition.current = null
        previousTime.current = null
        frameCount.current = 0
        startTime.current = null
        lastLoggedPosition.current = null
      }
    }
  }, [enabled, pentolaRef])

  // Tracking frame-by-frame
  useFrame(() => {
    if (!enabled || !pentolaRef.current || !previousPosition.current) {
      return
    }

    frameCount.current++
    const currentTime = performance.now()
    const deltaTime = (currentTime - previousTime.current) / 1000 // in secondi
    const elapsedTime = ((currentTime - startTime.current) / 1000).toFixed(3)

    const pentola = pentolaRef.current
    const currentPos = pentola.position.clone()
    
    // Calcola delta movimento
    const delta = currentPos.distanceTo(previousPosition.current)
    const velocity = deltaTime > 0 ? delta / deltaTime : 0
    
    // Threshold per considerare movimento significativo (0.0001m = 0.1mm)
    const MOVEMENT_THRESHOLD = 0.0001
    const isCurrentlyMoving = delta > MOVEMENT_THRESHOLD
    
    // Detect stato movimento
    const wasMoving = isMoving.current
    const justStarted = isCurrentlyMoving && !wasMoving
    const justStopped = !isCurrentlyMoving && wasMoving
    
    // LOG COMPLETO per ogni cambiamento significativo o eventi speciali
    if (justStarted) {
      // INIZIO MOVIMENTO
      // ✅ Salva posizione iniziale REALE
      realStartPosition.current = currentPos.clone()
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`🚀 [T:${elapsedTime}s] PENTOLA - MOVIMENTO INIZIATO`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📍 Posizione REALE START: [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
      console.log(`⚡ Velocità: ${velocity.toFixed(6)} m/s`)
      console.log(`👪 Parent: ${pentola.parent?.name || 'Scene'}`)
      
      // Esponi in window per facile accesso
      if (typeof window !== 'undefined') {
        window.__PENTOLA_REAL_START = {
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
          timestamp: new Date().toISOString()
        }
      }
      
      isMoving.current = true
      consecutiveStops.current = 0
      lastLoggedPosition.current = currentPos.clone()
      
    } else if (isCurrentlyMoving) {
      // MOVIMENTO IN CORSO - Log ogni 10 frame O se posizione cambia significativamente
      const distanceFromLastLog = currentPos.distanceTo(lastLoggedPosition.current)
      
      if (frameCount.current % 10 === 0 || distanceFromLastLog > 0.05) {
        console.log(`🎬 [T:${elapsedTime}s | Frame:${frameCount.current}] PENTOLA IN MOVIMENTO`)
        console.log(`   📍 Pos: [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
        console.log(`   📏 Δ: ${delta.toFixed(6)}m | ⚡ Vel: ${velocity.toFixed(3)} m/s`)
        console.log(`   👪 Parent: ${pentola.parent?.name || 'Scene'}`)
        
        lastLoggedPosition.current = currentPos.clone()
      }
      
    } else if (justStopped) {
      // MOVIMENTO FERMATO
      // ✅ Salva posizione finale REALE
      realEndPosition.current = currentPos.clone()
      consecutiveStops.current++
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`🛑 [T:${elapsedTime}s] PENTOLA - MOVIMENTO FERMATO`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📍 Posizione REALE END: [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
      console.log(`👪 Parent: ${pentola.parent?.name || 'Scene'}`)
      console.log(`🔢 Frame totali movimento: ${frameCount.current}`)
      
      // Esponi in window per facile accesso
      if (typeof window !== 'undefined') {
        window.__PENTOLA_REAL_END = {
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
          timestamp: new Date().toISOString()
        }
        
        // Calcola e mostra discrepanza se abbiamo anche START
        if (window.__PENTOLA_REAL_START && realStartPosition.current) {
          const distance = currentPos.distanceTo(realStartPosition.current)
          
          window.__PENTOLA_REAL_MOVEMENT = {
            start: window.__PENTOLA_REAL_START,
            end: window.__PENTOLA_REAL_END,
            delta: {
              x: currentPos.x - realStartPosition.current.x,
              y: currentPos.y - realStartPosition.current.y,
              z: currentPos.z - realStartPosition.current.z,
              distance: distance
            }
          }
          
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          console.log(`📊 MOVIMENTO REALE COMPLETATO:`)
          console.log(`   📍 START: [${realStartPosition.current.x.toFixed(6)}, ${realStartPosition.current.y.toFixed(6)}, ${realStartPosition.current.z.toFixed(6)}]`)
          console.log(`   🎯 END:   [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
          console.log(`   📏 Distanza percorsa: ${distance.toFixed(6)}m`)
          console.log(`   💾 Dati salvati in: window.__PENTOLA_REAL_MOVEMENT`)
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        }
      }
      
      // Se si ferma e poi riparte, è sospetto
      if (consecutiveStops.current > 1) {
        console.warn(`⚠️  [T:${elapsedTime}s] MOVIMENTO ANOMALO RILEVATO!`)
        console.warn(`⚠️  Pentola si è fermata e ripartita ${consecutiveStops.current} volte`)
      }
      
      isMoving.current = false
      lastLoggedPosition.current = currentPos.clone()
      
    } else {
      // FERMO - Log ridotto ogni 60 frame per confermare
      if (frameCount.current % 60 === 0) {
        console.log(`💤 [T:${elapsedTime}s | Frame:${frameCount.current}] PENTOLA FERMA`)
        console.log(`   📍 Pos: [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
      }
    }
    
    // Detect TELEPORT (salto improvviso > 0.5m)
    if (delta > 0.5 && deltaTime < 0.1) {
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.error(`🚨 [T:${elapsedTime}s] TELEPORT RILEVATO!`)
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.error(`📍 Da: [${previousPosition.current.x.toFixed(6)}, ${previousPosition.current.y.toFixed(6)}, ${previousPosition.current.z.toFixed(6)}]`)
      console.error(`📍 A:  [${currentPos.x.toFixed(6)}, ${currentPos.y.toFixed(6)}, ${currentPos.z.toFixed(6)}]`)
      console.error(`📏 Salto: ${delta.toFixed(3)}m in ${(deltaTime * 1000).toFixed(1)}ms`)
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
    
    // Detect cambio PARENT
    const currentParent = pentola.parent?.name || 'Scene'
    if (previousPosition.current.parent !== currentParent) {
      console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.warn(`⚠️  [T:${elapsedTime}s] CAMBIO PARENT RILEVATO!`)
      console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.warn(`   Da: ${previousPosition.current.parent || 'unknown'}`)
      console.warn(`   A:  ${currentParent}`)
      console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      
      previousPosition.current.parent = currentParent
    }
    
    // Aggiorna riferimenti
    previousPosition.current = currentPos.clone()
    previousPosition.current.parent = currentParent
    previousTime.current = currentTime
  })

  return {
    frameCount: frameCount.current,
    isMoving: isMoving.current
  }
}

export default usePentolaTracker
