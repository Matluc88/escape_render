// useComodinoAnimation.js
// Hook DEDICATO per animazione del comodino usando pattern pivot+attach
// ✅ REFACTORED: Pattern PENTOLA (scene + traverse) per stabilità

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Genera ID stabile dall'array di oggetti (basato su UUID)
 * Questo previene loop infiniti quando l'array viene ricreato con gli stessi oggetti
 */
function getObjectsId(objects) {
  if (!objects || objects.length === 0) return 'empty'
  return objects.map(obj => obj.uuid).sort().join('|')
}

/**
 * Trova scene risalendo la gerarchia
 * Scene è il WORLD_ROOT reference per tutte le conversioni WORLD→LOCAL
 * 
 * @param {THREE.Object3D} node - Nodo da cui partire
 * @returns {THREE.Object3D} Scene root
 */
function findScene(node) {
  let current = node
  
  console.log('[findScene] 🔍 Risalgo gerarchia fino a Scene da:', node.name)
  
  while (current && current.parent) {
    if (current.parent.type === 'Scene') {
      console.log('[findScene] ✅ Scene trovata - WORLD_ROOT reference')
      return current.parent
    }
    current = current.parent
  }
  
  // Fallback: ritorna l'ultimo nodo
  console.warn('[findScene] ⚠️ Scene non trovata, uso ultimo nodo:', current.name || current.type)
  return current
}

/**
 * Hook dedicato per animazione comodino
 * ✅ Pattern IBRIDO: riceve array stabilizzato (useMemo parent)
 * @param {Array<THREE.Object3D>} objects - Array di oggetti da animare
 * @param {Object} config - Configurazione animazione
 * @param {boolean} isPlaying - Se l'animazione è attiva
 * @param {Function} onComplete - Callback completamento
 */
export function useComodinoAnimation(objects, config, isPlaying, onComplete) {
  const pivotGroupRef = useRef(null)
  const comodinoPartsRef = useRef([])
  const animationProgress = useRef(0)
  const hasCompleted = useRef(false)
  const previousIsPlaying = useRef(false)
  const previousConfigRef = useRef(null) // 🆕 Tracker config precedente
  const initialRotationRef = useRef(0)
  const setupDoneRef = useRef(false)
  const initialPositionRef = useRef(null) // 🆕 Posizione iniziale per modalità position
  const totalDistanceRef = useRef(0) // 🆕 Distanza totale fissa (non ricalcolata)
  const loggedMilestonesRef = useRef(new Set()) // 🆕 Tracker milestone loggate
  const originalPositionsRef = useRef([]) // 🔄 Posizioni ORIGINALI al caricamento (per reset)
  const originalRotationsRef = useRef([]) // 🔄 Rotazioni ORIGINALI al caricamento (per reset)
  const targetLocalPositionsRef = useRef([]) // 🆕 Target LOCAL per ogni oggetto (calcolato UNA volta)
  
  // ✅ FIX LOOP INFINITO: Genera ID stabile dall'array (basato su UUID)
  // Questo previene re-setup quando l'array viene ricreato con gli STESSI oggetti
  const objectsId = useMemo(() => getObjectsId(objects), [objects])
  
  // ✅ Setup: usa objectsId invece di objects come dependency
  useEffect(() => {
    if (!objects || objects.length === 0) {
      console.log('[useComodinoAnimation] ⚠️ Nessun oggetto passato o array vuoto')
      return
    }
    
    // ✅ GUARD FORTE: Se già fatto setup, NON rifare MAI (anche se dependencies cambiano)
    if (setupDoneRef.current && pivotGroupRef.current) {
      console.log('[useComodinoAnimation] ✅ Setup già attivo, skip re-setup')
      return
    }
    
    console.log('[useComodinoAnimation] 🔍 Setup comodino con array stabilizzato...')
    console.log('[useComodinoAnimation] Ricevuti', objects.length, 'oggetti')
    
    // Log oggetti ricevuti con dettagli
    objects.forEach((obj, i) => {
      console.log(`  ${i + 1}. "${obj.name}"`)
      console.log(`     Type: ${obj.type}`)
      console.log(`     isMesh: ${obj.isMesh}`)
      console.log(`     Children: ${obj.children ? obj.children.length : 0}`)
    })
    
    // ✅ USA DIRETTAMENTE gli oggetti passati (già selezionati correttamente!)
    // Non filtrare per isMesh - potrebbero essere Groups con mesh dentro
    console.log(`[useComodinoAnimation] ✅ Usando tutti i ${objects.length} oggetti ricevuti`)
    
    // Salva parti
    comodinoPartsRef.current = objects
    
    // 🔄 SALVA POSIZIONI E ROTAZIONI ORIGINALI (per reset)
    if (originalPositionsRef.current.length === 0) {
      originalPositionsRef.current = objects.map(obj => obj.position.clone())
      originalRotationsRef.current = objects.map(obj => obj.rotation.clone())
      console.log('[useComodinoAnimation] 💾 Posizioni ORIGINALI salvate:', originalPositionsRef.current.length)
    }
    
    // ✅ Verifica config in base alla modalità
    if (!config) {
      console.error('[useComodinoAnimation] ❌ Config mancante!')
      console.error('[useComodinoAnimation]   Ricevuto:', config)
      return
    }
    
    if (!config.mode) {
      console.error('[useComodinoAnimation] ❌ Config.mode mancante!')
      console.error('[useComodinoAnimation]   Config ricevuto:', JSON.stringify(config, null, 2))
      return
    }
    
    console.log('[useComodinoAnimation] ✅ Config mode:', config.mode)
    
    // Verifica campi SPECIFICI per modalità
    if (config.mode === 'rotation') {
      if (config.pivotX === undefined || config.pivotY === undefined || config.pivotZ === undefined) {
        console.error('[useComodinoAnimation] ❌ Config rotation: pivot mancante!')
        console.error('[useComodinoAnimation]   pivotX:', config.pivotX)
        console.error('[useComodinoAnimation]   pivotY:', config.pivotY)
        console.error('[useComodinoAnimation]   pivotZ:', config.pivotZ)
        console.error('[useComodinoAnimation]   Config completo:', JSON.stringify(config, null, 2))
        return
      }
      console.log('[useComodinoAnimation] ✅ Config rotation valido - pivot OK')
    } else if (config.mode === 'position') {
      if (config.startX === undefined || config.startY === undefined || config.startZ === undefined ||
          config.endX === undefined || config.endY === undefined || config.endZ === undefined) {
        console.error('[useComodinoAnimation] ❌ Config position: coordinate mancanti!')
        console.error('[useComodinoAnimation]   Config:', JSON.stringify(config, null, 2))
        return
      }
      console.log('[useComodinoAnimation] ✅ Config position valido')
    } else {
      console.error('[useComodinoAnimation] ❌ Mode non supportato:', config.mode)
      return
    }
    
    // 1. Prendi il parent comune (assumiamo sia lo stesso per tutte le parti)
    const firstObject = objects[0]
    const parent = firstObject.parent
    
    if (!parent) {
      console.error('[useComodinoAnimation] ❌ Oggetti senza parent!')
      return
    }
    
    console.log('[useComodinoAnimation] 📍 Parent comune:', parent.name || parent.type)
    
    // ✅ SPLIT: Pivot SOLO per rotazioni, NO pivot per posizioni!
    if (config.mode === 'rotation') {
      // ========== MODALITÀ ROTATION: USA PIVOT ==========
      console.log('[useComodinoAnimation] 🔄 Modalità ROTATION - Creo pivot')
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[useComodinoAnimation] 🔍 PIVOT ROTATION - DEBUG GERARCHIA')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[useComodinoAnimation] Input pivotWorldPos:', [
        config.pivotX.toFixed(3), 
        config.pivotY.toFixed(3), 
        config.pivotZ.toFixed(3)
      ])
      console.log('[useComodinoAnimation] firstObject.name:', firstObject.name)
      console.log('[useComodinoAnimation] parent.name:', parent.name)
      console.log('[useComodinoAnimation] parent.scale:', [
        parent.scale.x.toFixed(3),
        parent.scale.y.toFixed(3),
        parent.scale.z.toFixed(3)
      ])
      console.log('[useComodinoAnimation] parent.position:', [
        parent.position.x.toFixed(3),
        parent.position.y.toFixed(3),
        parent.position.z.toFixed(3)
      ])
      console.log('[useComodinoAnimation] parent.parent?.name:', parent.parent?.name || 'null')
      
      // ✅ USA COORDINATE ESATTE DAL JSON (incluso pivotY)
      const pivotWorldPos = new THREE.Vector3(
        config.pivotX,            // ← Dal JSON
        config.pivotY || 0,       // ← USA pivotY dal JSON (fallback a 0 per backward compatibility)
        config.pivotZ             // ← Dal JSON
      )
      
      console.log('[useComodinoAnimation] 🎯 Pivot da JSON (coordinate esatte):')
      console.log('  pivotX (JSON):', config.pivotX.toFixed(3))
      console.log('  pivotY (JSON):', (config.pivotY || 0).toFixed(3), '← Usa valore dal JSON')
      console.log('  pivotZ (JSON):', config.pivotZ.toFixed(3))
      console.log('[useComodinoAnimation] 🎯 Pivot WORLD finale:', [
        pivotWorldPos.x.toFixed(3),
        pivotWorldPos.y.toFixed(3),
        pivotWorldPos.z.toFixed(3)
      ])
      
      // 1. Crea pivot group
      const pivotGroup = new THREE.Group()
      pivotGroup.name = 'PIVOT_Comodino'
      
      // ✅ FIX: Add pivot alla SCENE ROOT (world space) invece che al parent locale!
      // Questo evita conversioni worldToLocal su parent con scale/transform complessi
      const sceneRoot = findScene(parent)
      sceneRoot.add(pivotGroup)
      
      // ✅ Posiziona pivot direttamente in coordinate WORLD (nessuna conversione!)
      pivotGroup.position.copy(pivotWorldPos)
      
      console.log('[useComodinoAnimation] 🎯 Pivot WORLD (scene root):', [
        pivotGroup.position.x.toFixed(3),
        pivotGroup.position.y.toFixed(3),
        pivotGroup.position.z.toFixed(3)
      ])
      console.log('[useComodinoAnimation] ✅ Pivot creato in SCENE ROOT - no conversioni local!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // Attach tutte le parti al pivot (le reparenta)
      objects.forEach((obj, i) => {
        console.log(`[useComodinoAnimation] 🔗 Attach parte ${i + 1}`)
        pivotGroup.attach(obj)
      })
      
      pivotGroupRef.current = pivotGroup
      initialRotationRef.current = 0
      setupDoneRef.current = true
      
      console.log('[useComodinoAnimation] ✅ Setup ROTATION completato! Parti attaccate al pivot.')
      
      return () => {
        // ✅ CLEANUP INTELLIGENTE: NON rimuovere pivot se animazione in corso!
        // React StrictMode chiama cleanup anche se il componente viene ri-montato subito
        
        // Se animazione in corso o completata di recente, MANTIENI pivot
        if (hasCompleted.current || animationProgress.current > 0) {
          console.log('[useComodinoAnimation] 🔒 Cleanup SKIPPATO - animazione in corso o completata')
          console.log('[useComodinoAnimation]   Progress:', animationProgress.current)
          console.log('[useComodinoAnimation]   Completed:', hasCompleted.current)
          return
        }
        
        // Cleanup SOLO se NON c'è animazione
        if (pivotGroupRef.current && pivotGroupRef.current.parent) {
          console.log('[useComodinoAnimation] 🧹 Cleanup ROTATION: rimuovo pivot')
          
          const pivotParent = pivotGroupRef.current.parent
          
          // Reparenta oggetti al parent originale
          const parts = [...pivotGroupRef.current.children]
          parts.forEach(obj => {
            parent.attach(obj)
          })
          
          // Rimuovi pivot dal suo parent (referenceNode)
          pivotParent.remove(pivotGroupRef.current)
          pivotGroupRef.current = null
        }
        
        setupDoneRef.current = false
        comodinoPartsRef.current = []
      }
      
    } else if (config.mode === 'position') {
      // ========== MODALITÀ POSITION ==========
      // ✅ SE esiste già un pivot (da rotation precedente), usalo!
      // ✅ ALTRIMENTI crea setup per animazione diretta
      
      if (pivotGroupRef.current) {
        console.log('[useComodinoAnimation] 📍 Modalità POSITION - RIUSO pivot esistente!')
        console.log('[useComodinoAnimation] 🎯 Animerò il PIVOT invece degli oggetti')
        setupDoneRef.current = true
        
        // NO cleanup - manteniamo il pivot!
        return () => {
          console.log('[useComodinoAnimation] 🧹 Cleanup POSITION: pivot mantenuto (sequenza in corso)')
          setupDoneRef.current = false
          // NON pulire comodinoPartsRef - ancora necessario!
        }
      } else {
        console.log('[useComodinoAnimation] 📍 Modalità POSITION - NO pivot (animazione diretta)')
        console.log('[useComodinoAnimation] 🎯 Start: [', config.startX.toFixed(3), ',', config.startY.toFixed(3), ',', config.startZ.toFixed(3), ']')
        console.log('[useComodinoAnimation] 🎯 End:   [', config.endX.toFixed(3), ',', config.endY.toFixed(3), ',', config.endZ.toFixed(3), ']')
        
        // Salva solo riferimenti diretti (NO reparenting!)
        pivotGroupRef.current = null
        setupDoneRef.current = true
        
        console.log('[useComodinoAnimation] ✅ Setup POSITION completato! Animazione diretta senza pivot.')
        
        // ✅ NESSUN CLEANUP necessario (no pivot = no reparenting = no loop!)
        return () => {
          console.log('[useComodinoAnimation] 🧹 Cleanup POSITION: nulla da fare (no pivot)')
          setupDoneRef.current = false
          comodinoPartsRef.current = []
        }
      }
    }
  }, [objectsId, config?.mode]) // ✅ FIX LOOP: usa objectsId (stabile) + solo mode (non tutto config)
  
  // Gestione start/stop animazione
  useEffect(() => {
    const hasStarted = isPlaying && !previousIsPlaying.current
    const hasStopped = !isPlaying && previousIsPlaying.current
    
    // 🆕 DETECT config change (per sequenze multi-fase)
    const configChanged = isPlaying && previousIsPlaying.current && config && 
                          previousConfigRef.current && 
                          config.mode !== previousConfigRef.current.mode
    
    if (hasStarted || configChanged) {
      hasCompleted.current = false
      animationProgress.current = 0  // ✅ Reset progress per nuova animazione
      loggedMilestonesRef.current.clear() // 🆕 Reset milestone loggate
      
      if (configChanged) {
        console.log('[useComodinoAnimation] 🔄 Config CAMBIATO durante isPlaying - nuova animazione!')
      }
      
      // 🆕 Salva posizioni iniziali per modalità position (CON o SENZA pivot)
      if (config?.mode === 'position') {
        if (pivotGroupRef.current) {
          // ✅ PIVOT in WORLD space - salva posizione world direttamente!
          initialPositionRef.current = pivotGroupRef.current.position.clone()
          
          // ✅ Target WORLD (pivot è già in scene root = world space!)
          const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
          
          // ✅ Distanza WORLD → WORLD (entrambi in scene root)
          totalDistanceRef.current = initialPositionRef.current.distanceTo(worldEnd)
          
          console.log('[useComodinoAnimation] 📍 Posizione iniziale pivot (WORLD):', [
            initialPositionRef.current.x.toFixed(3),
            initialPositionRef.current.y.toFixed(3),
            initialPositionRef.current.z.toFixed(3)
          ])
          console.log('[useComodinoAnimation] 🎯 Target pivot (WORLD):', [
            worldEnd.x.toFixed(3),
            worldEnd.y.toFixed(3),
            worldEnd.z.toFixed(3)
          ])
          console.log('[useComodinoAnimation] 📏 Distanza TOTALE salvata:', totalDistanceRef.current.toFixed(3), 'm')
        } else {
          // NO PIVOT - Salva posizioni WORLD di OGNI oggetto (poi le convertiamo in LOCAL per il lerp)
          const objects = comodinoPartsRef.current
          if (objects && objects.length > 0) {
            // ✅ SALVA POSIZIONI WORLD per TUTTI gli oggetti
            // Questo è necessario perché dopo il pivot cleanup, le posizioni LOCAL sono sballate dalla scala del parent
            initialPositionRef.current = objects.map(obj => {
              const worldPos = new THREE.Vector3()
              obj.getWorldPosition(worldPos)
              return worldPos
            })
            
            const worldStart = initialPositionRef.current[0].clone()
            
            console.log('[useComodinoAnimation] 📍 Posizione WORLD primo oggetto:', [
              worldStart.x.toFixed(3),
              worldStart.y.toFixed(3), 
              worldStart.z.toFixed(3)
            ])
            
            // Calcola distanza dal primo oggetto usando posizione WORLD
            const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
            
            // ✅ Distanza WORLD → WORLD
            totalDistanceRef.current = worldStart.distanceTo(worldEnd)
            
            console.log('[useComodinoAnimation] 🎯 Target WORLD:', [
              worldEnd.x.toFixed(3),
              worldEnd.y.toFixed(3),
              worldEnd.z.toFixed(3)
            ])
            console.log('[useComodinoAnimation] 📏 Distanza TOTALE salvata:', totalDistanceRef.current.toFixed(3), 'm')
          }
        }
      }
      
      console.log('[useComodinoAnimation] 🎬 Animazione AVVIATA')
      console.log('[useComodinoAnimation] 📍 Progress corrente:', animationProgress.current, 'radianti')
    }
    
    if (hasStopped) {
      // ✅ NON RESETTIAMO PIÙ! Manteniamo la posizione attuale
      console.log('[useComodinoAnimation] ⏹️ Animazione FERMATA')
      console.log('[useComodinoAnimation] 🔒 Posizione BLOCCATA a:', animationProgress.current, 'radianti')
      console.log('[useComodinoAnimation] 📐 Angolo corrente:', (animationProgress.current * 180 / Math.PI).toFixed(1), '°')
      
      // Il pivot MANTIENE la sua rotazione corrente - non torna a 0!
    }
    
    previousIsPlaying.current = isPlaying
    previousConfigRef.current = config  // 🆕 Salva config corrente per prossimo confronto
  }, [isPlaying, config])
  
  // Ascolto evento reset
  useEffect(() => {
    const handleReset = () => {
      console.log('[useComodinoAnimation] 🔄 RESET richiesto!')
      
      // Reset progress
      animationProgress.current = 0
      hasCompleted.current = false
      
      // Reset rotazione pivot a 0
      if (pivotGroupRef.current && config) {
        const axis = config.axis || 'y'
        if (axis === 'y') {
          pivotGroupRef.current.rotation.y = 0
        } else if (axis === 'x') {
          pivotGroupRef.current.rotation.x = 0
        } else if (axis === 'z') {
          pivotGroupRef.current.rotation.z = 0
        }
        console.log('[useComodinoAnimation] ✅ Pivot resettato a 0° sull\'asse', axis.toUpperCase())
      }
    }
    
    window.addEventListener('resetComodinoAnimation', handleReset)
    
    return () => {
      window.removeEventListener('resetComodinoAnimation', handleReset)
    }
  }, [config])
  
  // ✅ Animation loop - Supporta ROTAZIONE e POSIZIONE
  useFrame((_, delta) => {
    // ✅ Guard: Per POSITION mode senza pivot, controlla objects invece di pivot
    if (!isPlaying || !config || hasCompleted.current) {
      return
    }
    
    // Per ROTATION mode, serve pivot
    if (config.mode === 'rotation' && !pivotGroupRef.current) {
      return
    }
    
    // Per POSITION mode senza pivot, servono objects
    if (config.mode === 'position' && !pivotGroupRef.current && (!comodinoPartsRef.current || comodinoPartsRef.current.length === 0)) {
      return
    }
    
    // ========================================
    // MODALITÀ ROTAZIONE (codice esistente invariato)
    // ========================================
    if (config.mode === 'rotation') {
      // Calcola progress
      const targetAngle = (config.angle || 90) * (Math.PI / 180)
      const speed = (config.speed || 90) * (Math.PI / 180) * delta
      const direction = config.direction || 1
      
      animationProgress.current += speed
      
      if (animationProgress.current >= targetAngle) {
        animationProgress.current = targetAngle
        hasCompleted.current = true
        console.log('[useComodinoAnimation] ✅ Animazione rotazione COMPLETATA!')
        console.log('[useComodinoAnimation] 🔔 Chiamata onComplete callback...')
        
        if (onComplete) {
          console.log('[useComodinoAnimation] ✅ onComplete esiste, lo chiamo!')
          onComplete()
        } else {
          console.warn('[useComodinoAnimation] ⚠️ onComplete NON DEFINITO!')
        }
      }
      
      // ✅ Applica rotazione SOLO al pivot - le parti seguono automaticamente!
      const axis = config.axis || 'y'
      const currentAngle = animationProgress.current * direction
      
      if (axis === 'y') {
        pivotGroupRef.current.rotation.y = currentAngle
      } else if (axis === 'x') {
        pivotGroupRef.current.rotation.x = currentAngle
      } else if (axis === 'z') {
        pivotGroupRef.current.rotation.z = currentAngle
      }
    }
    
    // ========================================
    // 🆕 MODALITÀ POSIZIONE
    // ========================================
    else if (config.mode === 'position') {
      // ✅ SE esiste pivot, anima IL PIVOT (più semplice e preciso!)
      // ✅ ALTRIMENTI anima oggetti direttamente
      
      if (pivotGroupRef.current) {
        // ========== ANIMA PIVOT (da sequenza rotation→position) ==========
        console.log('[useComodinoAnimation] 🎯 Animazione PIVOT in modalità position')
        
        const speed = (config.speed || 2.0) * delta
        const totalDistance = totalDistanceRef.current
        
        if (totalDistance < 0.001) {
          hasCompleted.current = true
          if (onComplete) onComplete()
          return
        }
        
        // Calcola progress
        const progressSpeed = speed / totalDistance
        animationProgress.current += progressSpeed
        
        if (animationProgress.current > 1.0) {
          animationProgress.current = 1.0
        }
        
        // Target in world space (pivot è già in world!)
        const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
        
        // ✅ FIX ROBUSTEZZA: initialPositionRef viene salvato all'avvio dell'animazione
        // dalla posizione REALE del pivot (non dal JSON), quindi è sempre corretto
        pivotGroupRef.current.position.lerpVectors(
          initialPositionRef.current,
          worldEnd,
          animationProgress.current
        )
        
        // Completamento
        if (animationProgress.current >= 1.0) {
          pivotGroupRef.current.position.copy(worldEnd)
          hasCompleted.current = true
          
          console.log('[useComodinoAnimation] ✅ Pivot arrivato a destinazione!')
          console.log('[useComodinoAnimation]   Pos finale:', [
            pivotGroupRef.current.position.x.toFixed(3),
            pivotGroupRef.current.position.y.toFixed(3),
            pivotGroupRef.current.position.z.toFixed(3)
          ])
          
          if (onComplete) onComplete()
          return
        }
        
        return // Exit - animazione pivot gestita
      }
      
      // ========== ANIMA OGGETTI DIRETTAMENTE (no pivot) ==========
      const objects = comodinoPartsRef.current
      
      // ✅ Trova Scene come WORLD_ROOT reference
      const parent = objects[0].parent
      const sceneRoot = findScene(parent)
      
      // ✅ LOCAL start (già salvato come obj.position)
      const localStart = initialPositionRef.current[0].clone()
      
      // ✅ Converti target WORLD → LOCAL usando Scene (WORLD_ROOT)
      const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
      sceneRoot.updateWorldMatrix(true, false)
      const localEnd = sceneRoot.worldToLocal(worldEnd.clone())
      
      const speed = (config.speed || 2.0) * delta
      const totalDistance = totalDistanceRef.current
      
      // Log iniziale
      if (animationProgress.current === 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[useComodinoAnimation] 📊 POSIZIONE - Animazione LOCALE')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📍 LOCAL Start: [${localStart.x.toFixed(3)}, ${localStart.y.toFixed(3)}, ${localStart.z.toFixed(3)}]`)
        console.log(`🎯 LOCAL End:   [${localEnd.x.toFixed(3)}, ${localEnd.y.toFixed(3)}, ${localEnd.z.toFixed(3)}]`)
        console.log(`🎯 WORLD End:   [${worldEnd.x.toFixed(3)}, ${worldEnd.y.toFixed(3)}, ${worldEnd.z.toFixed(3)}]`)
        console.log(`📏 Distanza TOTALE: ${totalDistance.toFixed(3)}m`)
        console.log(`⚡ Velocità: ${config.speed} u/s`)
        console.log(`🪑 Oggetti comodino: ${objects.length}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      if (totalDistance < 0.001) {
        hasCompleted.current = true
        if (onComplete) onComplete()
        return
      }
      
      // ✅ Calcola progress
      const progressSpeed = speed / totalDistance
      animationProgress.current += progressSpeed
      
      if (animationProgress.current > 1.0) {
        animationProgress.current = 1.0
      }
      
      // Completamento
      if (animationProgress.current >= 1.0) {
        animationProgress.current = 1.0
        
        // Posiziona TUTTI gli oggetti alla destinazione
        objects.forEach((obj, index) => {
          let localEnd
          if (obj.parent) {
            obj.parent.updateWorldMatrix(true, false)
            localEnd = obj.parent.worldToLocal(worldEnd.clone())
          } else {
            localEnd = worldEnd.clone()
          }
          
          obj.position.copy(localEnd)
          console.log(`[useComodinoAnimation] ✅ ${index + 1}. ${obj.name} → destinazione`)
        })
        
        hasCompleted.current = true
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[useComodinoAnimation] 🎯 ARRIVO - Animazione COMPLETATA!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        if (onComplete) {
          onComplete()
        }
        return
      }
      
      const clampedProgress = Math.max(0, Math.min(1, animationProgress.current))
      
      // 🎯 GRUPPO RIGIDO: Calcola offset relativi PRIMA del loop
      const referenceStart = initialPositionRef.current[0] // Prima parte = riferimento
      const referenceEnd = worldEnd // Target del primo oggetto
      
      // 🔍 Log offset iniziale (UNA VOLTA)
      if (animationProgress.current < 0.05 && !loggedMilestonesRef.current.has('offsets')) {
        loggedMilestonesRef.current.add('offsets')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[useComodinoAnimation] 📐 OFFSET RELATIVI (da parte 1):')
        objects.forEach((obj, i) => {
          const offset = initialPositionRef.current[i].clone().sub(referenceStart)
          console.log(`  Parte ${i + 1} (${obj.name}):`)
          console.log(`    X: ${offset.x >= 0 ? '+' : ''}${offset.x.toFixed(3)}m`)
          console.log(`    Y: ${offset.y >= 0 ? '+' : ''}${offset.y.toFixed(3)}m`)
          console.log(`    Z: ${offset.z >= 0 ? '+' : ''}${offset.z.toFixed(3)}m`)
          console.log(`    Distanza: ${offset.length().toFixed(3)}m`)
        })
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      // ✅ Interpola posizione di OGNI oggetto MANTENENDO OFFSET
      objects.forEach((obj, index) => {
        // ✅ START WORLD → LOCAL usando Scene (WORLD_ROOT)
        const worldStart = initialPositionRef.current[index].clone()
        sceneRoot.updateWorldMatrix(true, false)
        const localStart = sceneRoot.worldToLocal(worldStart.clone())
        
        // ✅ END: Calcola offset WORLD e applicalo al target usando Scene
        const offsetWorld = initialPositionRef.current[index].clone().sub(initialPositionRef.current[0])
        const worldEndThis = worldEnd.clone().add(offsetWorld)
        const localEndThis = sceneRoot.worldToLocal(worldEndThis.clone())
        
        // ✅ Interpola tra coordinate LOCAL (entrambe convertite da WORLD)
        obj.position.lerpVectors(localStart, localEndThis, clampedProgress)
        
        // 🔍 TRACKING DETTAGLIATO: Log ogni oggetto ogni 10%
        const progressPercent = Math.floor(clampedProgress * 100)
        if (progressPercent % 10 === 0 && !loggedMilestonesRef.current.has(`${progressPercent}-${index}`)) {
          loggedMilestonesRef.current.add(`${progressPercent}-${index}`)
          
          const currentWorldPos = new THREE.Vector3()
          obj.getWorldPosition(currentWorldPos)
          
          const currentLocalPos = obj.position.clone()
          
          console.log(`[${progressPercent}%] Parte ${index + 1} (${obj.name}):`)
          console.log(`  Pos LOCAL:  [${currentLocalPos.x.toFixed(3)}, ${currentLocalPos.y.toFixed(3)}, ${currentLocalPos.z.toFixed(3)}]`)
          console.log(`  Pos WORLD:  [${currentWorldPos.x.toFixed(3)}, ${currentWorldPos.y.toFixed(3)}, ${currentWorldPos.z.toFixed(3)}]`)
          console.log(`  Target LOCAL: [${localEndThis.x.toFixed(3)}, ${localEndThis.y.toFixed(3)}, ${localEndThis.z.toFixed(3)}]`)
        }
      })
      
      // Log progresso ogni 25%
      const progressPercent = Math.floor(animationProgress.current * 100)
      if (progressPercent % 25 === 0 && progressPercent > 0 && progressPercent < 100) {
        if (!loggedMilestonesRef.current.has(progressPercent)) {
          loggedMilestonesRef.current.add(progressPercent)
          const pos = objects[0].position.clone()
          console.log(`🚀 [${progressPercent}%] Posizione primo oggetto: [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}]`)
        }
      }
    }
    
    // ========================================
    // Modalità sconosciuta
    // ========================================
    else {
      console.warn('[useComodinoAnimation] ⚠️ Modalità non supportata:', config.mode)
    }
  })
  
  return {
    isReady: setupDoneRef.current && (pivotGroupRef.current !== null || comodinoPartsRef.current.length > 0),
    partsCount: pivotGroupRef.current ? pivotGroupRef.current.children.length : comodinoPartsRef.current.length,
    pivotGroup: pivotGroupRef.current,
    objects: comodinoPartsRef.current
  }
}

export default useComodinoAnimation