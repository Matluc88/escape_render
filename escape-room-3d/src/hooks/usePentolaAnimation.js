// usePentolaAnimation.js
// Hook per animare la pentola - Basato su useAnimationPreview.js
// Replica ESATTAMENTE la logica dell'Animation Editor che funziona

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ✅ COORDINATE CORRETTE (Aggiornate 2026-01-12)
// Posizione iniziale: dentro il mobile
// Posizione finale: sui fornelli
const COORDINATE_ORIGINE = {
  x: -1.030,
  y: -0.555,
  z: -1.448
}

const COORDINATE_TARGET = {
  x: -0.998,
  y: -0.190,
  z: -0.748
}

// Velocità di movimento (unità al secondo) - DA JSON
const SPEED_UNITS_PER_SEC = 24

// ✅ UUID ESATTO della mesh pentola (NON i marker POSIZIONE_I/F!)
const PENTOLA_UUID = 'PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)'

/**
 * Hook per animare la pentola tra due posizioni
 * @param {THREE.Object3D} scene - La scena contenente la pentola
 * @param {boolean} suiFornelli - true = pentola sui fornelli, false = pentola nella posizione originale
 * @param {Object} options - Opzioni (non usate, per compatibilità)
 * @param {boolean} enabled - Abilita/disabilita l'hook
 */
export function usePentolaAnimation(scene, suiFornelli, options = {}, enabled = true) {
  // ✅ REACT-SAFE: Hook SEMPRE chiamati (ordine fisso)
  const pentolaMesh = useRef(null)
  const animationProgress = useRef(0)
  const hasCompleted = useRef(false)
  const previousIsPlaying = useRef(false)
  const inizializzato = useRef(false)

  // Setup: trova la mesh SPECIFICA della pentola
  useEffect(() => {
    if (!enabled) {
      console.log('[usePentolaAnimation] ⏸️ Hook DISABILITATO (enabled=false)')
      return
    }
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[usePentolaAnimation] 🔍 SETUP - Inizializzazione hook`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[usePentolaAnimation] Scene presente:`, !!scene)
    console.log(`[usePentolaAnimation] Già inizializzato:`, inizializzato.current)
    console.log(`[usePentolaAnimation] Cercando mesh: "${PENTOLA_UUID}"`)
    
    if (!scene || inizializzato.current) {
      console.log(`[usePentolaAnimation] ⚠️ SKIP setup - scene:${!!scene} inizializzato:${inizializzato.current}`)
      return
    }

    let pentola = null
    let oggetti_trovati = 0

    console.log(`[usePentolaAnimation] 🔎 Inizio scansione scena...`)

    // ✅ Cerca la mesh SPECIFICA con UUID (ignora marker vecchi POSIZIONE_I/F!)
    scene.traverse((child) => {
      oggetti_trovati++
      
      // LOG: Mostra tutti gli oggetti PENTOLA per debug
      if (child.name && child.name.toUpperCase().includes('PENT')) {
        console.log(`[usePentolaAnimation]   📦 Trovato: "${child.name}" (type: ${child.type}, isMesh: ${child.isMesh})`)
      }
      
      // ✅ CERCA SOLO LA MESH CON UUID ESATTO (case sensitive!)
      if (child.name === PENTOLA_UUID && child.isMesh) {
        pentola = child
        console.log(`[usePentolaAnimation]   ✅ PENTOLA MESH MATCH: "${child.name}"`)
      }
    })

    console.log(`[usePentolaAnimation] 📊 Scansione completata: ${oggetti_trovati} oggetti totali`)

    if (!pentola) {
      console.error(`[usePentolaAnimation] ❌ MESH PENTOLA NON TROVATA: "${PENTOLA_UUID}"`)
      console.log(`[usePentolaAnimation] 💡 Verifica che l'UUID sia corretto nel modello`)
      return
    }

    console.log(`[usePentolaAnimation] ✅ Setup OK!`)
    console.log(`[usePentolaAnimation]    Mesh pentola: "${pentola.name}"`)
    console.log(`[usePentolaAnimation]    Parent: ${pentola.parent?.name || 'Scene'}`)
    console.log(`[usePentolaAnimation]    Position local: [${pentola.position.x.toFixed(3)}, ${pentola.position.y.toFixed(3)}, ${pentola.position.z.toFixed(3)}]`)
    
    // Salva riferimento diretto alla mesh (NO ROOT group! Animation Editor non lo usa)
    pentolaMesh.current = pentola

    inizializzato.current = true
    console.log(`[usePentolaAnimation] 🎯 Hook pronto per animazioni!`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }, [scene, enabled])

  // Reset quando cambia stato suiFornelli
  useEffect(() => {
    // Detect cambio stato: false → true significa NUOVA animazione
    const hasStarted = suiFornelli !== previousIsPlaying.current
    
    if (hasStarted) {
      // Reset flag per nuova animazione
      hasCompleted.current = false
      animationProgress.current = 0
      console.log(`[usePentolaAnimation] 🔄 NUOVA animazione - suiFornelli: ${suiFornelli}`)
    }
    
    previousIsPlaying.current = suiFornelli
  }, [suiFornelli])

  // ✅ Animazione loop - REPLICA ESATTA di useAnimationPreview
  useFrame((_, delta) => {
    if (!enabled || !pentolaMesh.current) return
    
    // Blocca se animazione già completata (ONE-SHOT)
    if (hasCompleted.current) return
    
    const pentola = pentolaMesh.current
    
    // ✅ COORDINATE IN WORLD SPACE (dal JSON)
    const worldStart = new THREE.Vector3(
      COORDINATE_ORIGINE.x,
      COORDINATE_ORIGINE.y,
      COORDINATE_ORIGINE.z
    )
    const worldEnd = new THREE.Vector3(
      COORDINATE_TARGET.x,
      COORDINATE_TARGET.y,
      COORDINATE_TARGET.z
    )
    
    // ✅ CONVERSIONE WORLD→LOCAL (come useAnimationPreview!)
    let localStart, localEnd
    
    if (pentola.parent) {
      // Forza aggiornamento matrice del parent (determinismo)
      pentola.parent.updateWorldMatrix(true, false)
      
      // Converti da world space a local space del parent
      localStart = pentola.parent.worldToLocal(worldStart.clone())
      localEnd = pentola.parent.worldToLocal(worldEnd.clone())
    } else {
      // Oggetto senza parent → LOCAL = WORLD
      localStart = worldStart.clone()
      localEnd = worldEnd.clone()
    }
    
    // Determina target basato su stato
    const target = suiFornelli ? localEnd : localStart
    
    const speed = SPEED_UNITS_PER_SEC * delta
    const distance = pentola.position.distanceTo(target)
    
    if (distance === 0) return
    
    // 📊 LOG INIZIALE: Mostra configurazione traiettoria
    if (animationProgress.current === 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 [TRAIETTORIA] Configurazione animazione:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📍 WORLD Start: [${worldStart.x.toFixed(3)}, ${worldStart.y.toFixed(3)}, ${worldStart.z.toFixed(3)}]`)
      console.log(`🔄 LOCAL Start: [${localStart.x.toFixed(3)}, ${localStart.y.toFixed(3)}, ${localStart.z.toFixed(3)}]`)
      console.log(`🎯 WORLD End:   [${worldEnd.x.toFixed(3)}, ${worldEnd.y.toFixed(3)}, ${worldEnd.z.toFixed(3)}]`)
      console.log(`🔄 LOCAL End:   [${localEnd.x.toFixed(3)}, ${localEnd.y.toFixed(3)}, ${localEnd.z.toFixed(3)}]`)
      console.log(`🎯 Target: ${suiFornelli ? 'FORNELLI (End)' : 'ORIGINE (Start)'}`)
      console.log(`📏 Distanza: ${distance.toFixed(3)}m`)
      console.log(`⚡ Velocità: ${SPEED_UNITS_PER_SEC} u/s`)
      console.log(`👨‍👦 Parent: ${pentola.parent ? pentola.parent.name : 'Scene'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
    
    // Calcola progresso (0 = posizione corrente, 1 = target)
    const progressSpeed = speed / distance
    animationProgress.current += progressSpeed
    
    // ONE-SHOT: fermati quando arrivi alla destinazione
    if (animationProgress.current >= 1) {
      animationProgress.current = 1
      
      // ✅ Posiziona oggetto esattamente alla destinazione (LOCAL coordinates)
      pentola.position.copy(target)
      
      // Setta flag per bloccare ulteriori frame
      hasCompleted.current = true
      
      // 📊 LOG FINALE: Confronto target vs posizione effettiva
      const actualLocalPos = pentola.position.clone()
      const totalDelta = actualLocalPos.distanceTo(target)
      
      // Verifica anche WORLD position per debugging
      const actualWorldPos = new THREE.Vector3()
      pentola.getWorldPosition(actualWorldPos)
      const targetWorld = suiFornelli ? worldEnd : worldStart
      const worldDelta = actualWorldPos.distanceTo(targetWorld)
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎯 [ARRIVO] Pentola a destinazione:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`🎯 Target LOCAL:  [${target.x.toFixed(3)}, ${target.y.toFixed(3)}, ${target.z.toFixed(3)}]`)
      console.log(`📍 Posizione LOCAL: [${actualLocalPos.x.toFixed(3)}, ${actualLocalPos.y.toFixed(3)}, ${actualLocalPos.z.toFixed(3)}]`)
      console.log(`📏 Delta LOCAL: ${totalDelta.toFixed(6)}m (${totalDelta < 0.001 ? '✅ PRECISO' : '⚠️ IMPRECISO'})`)
      console.log(`🌍 Target WORLD: [${targetWorld.x.toFixed(3)}, ${targetWorld.y.toFixed(3)}, ${targetWorld.z.toFixed(3)}]`)
      console.log(`🌍 Posizione WORLD: [${actualWorldPos.x.toFixed(3)}, ${actualWorldPos.y.toFixed(3)}, ${actualWorldPos.z.toFixed(3)}]`)
      console.log(`🌍 Delta WORLD: ${worldDelta.toFixed(6)}m (${worldDelta < 0.001 ? '✅ PRECISO' : '⚠️ IMPRECISO'})`)
      console.log(`✅ Pentola ${suiFornelli ? 'SUI FORNELLI' : 'ALLA POSIZIONE ORIGINALE'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      return
    }
    
    // Clamp progress per sicurezza
    const clampedProgress = Math.max(0, Math.min(1, animationProgress.current))
    
    // ✅ Interpola posizione da posizione CORRENTE verso TARGET usando coordinate LOCAL
    const currentPos = pentola.position.clone()
    pentola.position.lerpVectors(currentPos, target, clampedProgress)
    
    // 📊 LOG CONTINUO: Ogni 25% di progresso
    const progressPercent = Math.floor(animationProgress.current * 100)
    if (progressPercent % 25 === 0 && progressPercent > 0 && progressPercent < 100) {
      const pos = pentola.position.clone()
      console.log(`🚀 [${progressPercent}%] Posizione: [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}]`)
    }
  })

  return { pentolaMesh, animationProgress, hasCompleted }
}

export default usePentolaAnimation
