// useBathroomAnimation.js
// Hook per animazione sincronizzata ANTA_DOCCIA + MANIGLIA nel bagno
// Tasto L: Toggle apertura/chiusura (90°)
// Pattern: React Three Fiber con useFrame

import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getMovableNode } from '../utils/movableNodeHelper'

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
 * Trova oggetti nel modello tramite UUID o nome (tripla strategia)
 */
function findObjectsByConfig(modelRef, config) {
  if (!modelRef?.current || !config) return null
  
  const objects = []
  
  // Supporto NUOVO formato (sequence) e VECCHIO formato (objects)
  const sequence = config.sequence || config.objects
  
  if (!sequence) {
    console.error('[useBathroomAnimation] ❌ Nessuna sequenza trovata nel config!')
    return null
  }
  
  sequence.forEach(objConfig => {
    let found = null
    
    // Estrai nome oggetto (nuovo: objectName, vecchio: name)
    const objectName = objConfig.objectName || objConfig.name
    
    // Estrai UUID (nel nuovo formato è dentro objectName tra parentesi)
    let uuid = objConfig.uuid
    if (!uuid && objectName) {
      const match = objectName.match(/\(([A-F0-9-]+)\)/)
      if (match) uuid = match[1]
    }
    
    // STRATEGIA 1: Cerca per UUID esatto
    if (uuid) {
      modelRef.current.traverse((child) => {
        if (child.uuid && child.uuid.toLowerCase() === uuid.toLowerCase()) {
          found = child
          return
        }
      })
    }
    
    // STRATEGIA 2: Cerca UUID nel nome
    if (!found && uuid) {
      modelRef.current.traverse((child) => {
        if (child.name && child.name.includes(uuid)) {
          found = child
          return
        }
      })
    }
    
    // STRATEGIA 3: Fallback - cerca per nome oggetto
    if (!found && objectName) {
      const searchName = objectName.split('(')[0].toUpperCase() // Rimuovi UUID
      modelRef.current.traverse((child) => {
        if (child.name && child.name.toUpperCase().includes(searchName)) {
          found = child
          console.log(`[useBathroomAnimation] 🔍 Trovato con fallback nome: ${child.name}`)
          return
        }
      })
    }
    
    if (found) {
      // Risolvi al nodo movibile (ROOT se esiste)
      const movable = getMovableNode(found)
      console.log(`[useBathroomAnimation] ✅ Trovato ${objectName}:`, movable.name)
      objects.push({
        node: movable,
        config: objConfig
      })
    } else {
      console.warn(`[useBathroomAnimation] ⚠️ Oggetto non trovato: ${objectName}`)
    }
  })
  
  return objects.length > 0 ? objects : null
}

/**
 * Hook per animazione bagno (ANTA_DOCCIA + MANIGLIA)
 * @param {Object} modelRef - Ref al modello 3D
 * @param {string} configFile - Path al file JSON di configurazione
 * @param {boolean} worldReady - Flag che indica quando CasaModel ha completato le trasformazioni
 */
export function useBathroomAnimation(modelRef, configFile = '/anta_doccia_sequence.json', worldReady = false) {
  const [config, setConfig] = useState(null)
  const [isOpen, setIsOpen] = useState(true) // ✅ Parte aperta all'avvio (45° = aperta)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const pivotGroupRef = useRef(null)
  const animationProgress = useRef(0) // Inizializzato a 0, sarà impostato dal config
  const hasCompleted = useRef(false)
  const previousIsAnimating = useRef(false)
  const setupDoneRef = useRef(false)
  const objectsRef = useRef(null)
  
  // Carica configurazione JSON
  useEffect(() => {
    fetch(configFile)
      .then(res => res.json())
      .then(data => {
        console.log('[useBathroomAnimation] Configurazione caricata:', data)
        setConfig(data)
      })
      .catch(err => {
        console.error('[useBathroomAnimation] Errore caricamento config:', err)
      })
  }, [configFile])
  
  // Setup pivot e attach oggetti (UNA SOLA VOLTA)
  useEffect(() => {
    // ✅ FIX RACE CONDITION: Aspetta worldReady prima di fare setup
    if (!worldReady) {
      console.log('[useBathroomAnimation] ⏳ Aspettando worldReady per setup...')
      return
    }
    
    if (!modelRef?.current || !config) {
      console.log('[useBathroomAnimation] ⚠️ Model o config mancanti')
      return
    }
    
    if (setupDoneRef.current && pivotGroupRef.current) {
      console.log('[useBathroomAnimation] ✅ Setup già attivo, skip re-setup')
      return
    }
    
    console.log('[useBathroomAnimation] 🔍 Setup animazione bagno...')
    
    // Trova oggetti
    const objects = findObjectsByConfig(modelRef, config)
    if (!objects) {
      console.error('[useBathroomAnimation] ❌ Nessun oggetto trovato!')
      return
    }
    
    objectsRef.current = objects
    
    // Leggi primo oggetto config (supporta vecchio e nuovo formato)
    const sequence = config.sequence || config.objects
    const firstConfig = sequence[0]
    
    // Verifica che tutti abbiano lo stesso pivot
    const firstPivotX = firstConfig.pivotX ?? firstConfig.pivot?.x ?? 0
    const firstPivotY = firstConfig.pivotY ?? firstConfig.pivot?.y ?? 0
    const firstPivotZ = firstConfig.pivotZ ?? firstConfig.pivot?.z ?? 0
    
    const allSamePivot = objects.every(obj => {
      const px = obj.config.pivotX ?? obj.config.pivot?.x ?? 0
      const py = obj.config.pivotY ?? obj.config.pivot?.y ?? 0
      const pz = obj.config.pivotZ ?? obj.config.pivot?.z ?? 0
      return px === firstPivotX && py === firstPivotY && pz === firstPivotZ
    })
    
    if (!allSamePivot) {
      console.warn('[useBathroomAnimation] ⚠️ Oggetti hanno pivot diversi!')
    }
    
    const parent = objects[0].node.parent
    
    // Crea pivot in coordinate WORLD
    const pivotWorldPos = new THREE.Vector3(
      firstPivotX,
      firstPivotY,
      firstPivotZ
    )
    
    const pivotGroup = new THREE.Group()
    pivotGroup.name = 'PIVOT_Bathroom'
    
    // Add pivot alla scene root (world space)
    const sceneRoot = findScene(parent)
    sceneRoot.add(pivotGroup)
    
    // Posiziona pivot in world coordinates
    pivotGroup.position.copy(pivotWorldPos)
    
    console.log('[useBathroomAnimation] 🎯 Pivot WORLD:', [
      pivotGroup.position.x.toFixed(3),
      pivotGroup.position.y.toFixed(3),
      pivotGroup.position.z.toFixed(3)
    ])
    
    // Attach tutti gli oggetti al pivot
    objects.forEach(({ node, config: objConfig }) => {
      const objName = objConfig.objectName || objConfig.name
      console.log(`[useBathroomAnimation] 🔗 Attach ${objName} al pivot`)
      pivotGroup.attach(node)
    })
    
    // ✅ Applica rotazione iniziale (legge dal config JSON)
    const axis = firstConfig.axis || 'z'
    const initialAngleDegrees = firstConfig.angle || 90
    const initialAngle = initialAngleDegrees * (Math.PI / 180) // Converti gradi → radianti
    
    // Imposta progress iniziale
    animationProgress.current = initialAngle
    
    if (axis === 'z') {
      pivotGroup.rotation.z = initialAngle
    } else if (axis === 'y') {
      pivotGroup.rotation.y = initialAngle
    } else if (axis === 'x') {
      pivotGroup.rotation.x = initialAngle
    }
    
    console.log(`[useBathroomAnimation] 🔓 Anta impostata APERTA (${initialAngleDegrees}° = ${initialAngle.toFixed(3)} rad su asse ${axis.toUpperCase()})`)
    
    pivotGroupRef.current = pivotGroup
    setupDoneRef.current = true
    
    console.log('[useBathroomAnimation] ✅ Setup completato! Oggetti attaccati al pivot.')
    
    return () => {
      // Cleanup solo se NON c'è animazione in corso
      if (hasCompleted.current || animationProgress.current > 0) {
        console.log('[useBathroomAnimation] 🔒 Cleanup SKIPPATO - animazione in corso')
        return
      }
      
      if (pivotGroupRef.current && pivotGroupRef.current.parent && objectsRef.current) {
        console.log('[useBathroomAnimation] 🧹 Cleanup: rimuovo pivot')
        
        const pivotParent = pivotGroupRef.current.parent
        
        // Reparenta oggetti al parent originale
        objectsRef.current.forEach(({ node }) => {
          if (node) parent.attach(node)
        })
        
        // Rimuovi pivot
        pivotParent.remove(pivotGroupRef.current)
        pivotGroupRef.current = null
      }
      
    setupDoneRef.current = false
    objectsRef.current = null
  }
  }, [worldReady, modelRef, config])
  
  // Gestione start/stop animazione
  useEffect(() => {
    const hasStarted = isAnimating && !previousIsAnimating.current
    const hasStopped = !isAnimating && previousIsAnimating.current
    
    if (hasStarted) {
      hasCompleted.current = false
      console.log('[useBathroomAnimation] 🎬 Animazione AVVIATA')
      console.log('[useBathroomAnimation] 📍 Progress corrente:', animationProgress.current, 'radianti')
      console.log('[useBathroomAnimation] 🎯 Target:', isOpen ? 'CHIUDI' : 'APRI')
    }
    
    if (hasStopped) {
      console.log('[useBathroomAnimation] ⏹️ Animazione FERMATA')
      console.log('[useBathroomAnimation] 🔒 Posizione BLOCCATA a:', animationProgress.current, 'radianti')
      console.log('[useBathroomAnimation] 📐 Angolo corrente:', (animationProgress.current * 180 / Math.PI).toFixed(1), '°')
    }
    
    previousIsAnimating.current = isAnimating
  }, [isAnimating, isOpen])
  
  // Animation loop con useFrame
  useFrame((_, delta) => {
    if (!isAnimating || !config || hasCompleted.current || !pivotGroupRef.current) {
      return
    }
    
    // Supporto nuovo e vecchio formato
    const sequence = config.sequence || config.objects
    const firstItem = sequence[0]
    
    // Calcola progress
    const targetAngle = (firstItem.angle || 90) * (Math.PI / 180)
    const speed = (firstItem.speed || 45) * (Math.PI / 180) * delta
    const direction = isOpen ? -1 : 1 // Se isOpen=true, stiamo chiudendo (direzione negativa)
    
    // Incrementa/decrementa progress
    animationProgress.current += speed * direction
    
    // Clamp tra 0 e targetAngle
    if (direction > 0 && animationProgress.current >= targetAngle) {
      animationProgress.current = targetAngle
      hasCompleted.current = true
      setIsAnimating(false)
      setIsOpen(true)
      console.log('[useBathroomAnimation] ✅ Animazione APERTA completata!')
    } else if (direction < 0 && animationProgress.current <= 0) {
      animationProgress.current = 0
      hasCompleted.current = true
      setIsAnimating(false)
      setIsOpen(false)
      console.log('[useBathroomAnimation] ✅ Animazione CHIUSA completata!')
    }
    
    // Applica rotazione al pivot
    const axis = firstItem.axis || 'z'
    const currentAngle = animationProgress.current
    
    if (axis === 'z') {
      pivotGroupRef.current.rotation.z = currentAngle
    } else if (axis === 'y') {
      pivotGroupRef.current.rotation.y = currentAngle
    } else if (axis === 'x') {
      pivotGroupRef.current.rotation.x = currentAngle
    }
  })
  
  // API pubblica
  const toggle = useCallback(() => {
    if (isAnimating) {
      console.log('[useBathroomAnimation] ⚠️ Animazione in corso, skip')
      return
    }
    
    hasCompleted.current = false
    setIsAnimating(true)
    console.log('[useBathroomAnimation] 🚿 Toggle:', isOpen ? 'CHIUDI' : 'APRI')
  }, [isAnimating, isOpen])
  
  const open = useCallback(() => {
    if (!isOpen && !isAnimating) {
      hasCompleted.current = false
      setIsAnimating(true)
    }
  }, [isOpen, isAnimating])
  
  const close = useCallback(() => {
    if (isOpen && !isAnimating) {
      hasCompleted.current = false
      setIsAnimating(true)
    }
  }, [isOpen, isAnimating])
  
  return {
    isOpen,
    isAnimating,
    config,
    toggle,
    open,
    close
  }
}

export default useBathroomAnimation