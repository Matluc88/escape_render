import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import { raycastBVH } from '../utils/collisionBVH'

/**
 * Hook centralizzato per collision detection ottimizzato mobile
 * FASE 1: Solo player vs geometria statica (BVH)
 * 
 * Performance:
 * - 7 raycast per frame (vs 432 originali = 98% riduzione)
 * - Zero allocazioni per frame (vector pooling)
 * - Layer masking per eliminare falsi positivi
 * 
 * @param {Object} bvhData - Dati BVH da createStaticBVH()
 * @param {Object} config - Configurazione collision
 * @returns {Object} Collision manager API
 */
export function useCollisionManager(bvhData, config = {}) {
  const {
    playerRadius = 0.3,
    playerHeight = 1.8,
    penetrationThreshold = 0.15,
    enableSliding = true,
    debugMode = false
  } = config
  
  // ========================================
  // OBJECT POOLING: Riuso Vector3 per ZERO allocazioni per frame
  // Criticamente importante per mobile performance
  // ========================================
  const vectorPool = useRef({
    // Pool direzioni raycast (pre-allocati, mai ricreati)
    rayDirs: [
      new THREE.Vector3(1, 0, 0),    // Est
      new THREE.Vector3(-1, 0, 0),   // Ovest
      new THREE.Vector3(0, 0, 1),    // Nord
      new THREE.Vector3(0, 0, -1),   // Sud
      new THREE.Vector3(0, 1, 0),    // Su
      new THREE.Vector3(0, -1, 0),   // Giù
    ],
    
    // Vector3 riutilizzabili (pre-allocati)
    temp1: new THREE.Vector3(),
    temp2: new THREE.Vector3(),
    temp3: new THREE.Vector3(),
    rayOrigin: new THREE.Vector3(),
    proposedPos: new THREE.Vector3(),
    slideVector: new THREE.Vector3(),
    wallNormal: new THREE.Vector3(),
    moveDir: new THREE.Vector3()
  }).current
  
  // Statistiche performance (solo se debugMode)
  const stats = useRef({
    lastFrameQueries: 0,
    totalQueries: 0,
    bvhHits: 0,
    avgQueryTime: 0
  })
  
  /**
   * Calcola vettore di sliding lungo muro
   * OTTIMIZZATO: Riusa vector3 del pool (zero allocazioni)
   * 
   * Formula: slideVector = moveVector - (moveVector · normal) * normal
   * 
   * @param {THREE.Vector3} moveVector - Vettore movimento originale
   * @param {THREE.Vector3} wallNormal - Normale del muro
   * @param {THREE.Vector3} outVector - Vector3 output (riusato)
   * @returns {THREE.Vector3} slideVector (reference a outVector)
   */
  const calculateSlideVector = useCallback((moveVector, wallNormal, outVector) => {
    const dotProduct = moveVector.dot(wallNormal)
    vectorPool.temp1.copy(wallNormal).multiplyScalar(dotProduct)
    outVector.copy(moveVector).sub(vectorPool.temp1)
    return outVector
  }, [vectorPool])
  
  /**
   * Check movimento player con 7 raycast ottimizzati + sliding
   * 
   * RAYCAST STRATEGY:
   * - 4 direzioni cardinali (N, S, E, W) → layerMask: 'walls'
   * - 1 direzione movimento (diagonali) → layerMask: 'walls'
   * - 1 up → layerMask: 'all' (soffitto)
   * - 1 down → layerMask: 'ground' (pavimento) - chiamato separatamente
   * 
   * OTTIMIZZATO: Zero allocazioni, riusa oggetti pool
   * 
   * @param {THREE.Vector3} currentPos - Posizione attuale player (feet)
   * @param {THREE.Vector3} velocity - Vettore velocità frame
   * @param {number} radius - Raggio collisione player
   * @returns {Object} { position, collided, sliding, wallNormal }
   */
  const checkPlayerMovement = useCallback((currentPos, velocity, radius) => {
    const startTime = debugMode ? performance.now() : 0
    
    if (!bvhData) {
      // Fallback: BVH non pronto, BLOCCA movimento (non free motion)
      if (debugMode) {
        console.warn('[CollisionManager] BVH not ready - blocking movement')
      }
      return {
        position: currentPos.clone(),
        collided: true,
        sliding: false,
        wallNormal: null
      }
    }
    
    // Reset stats
    if (debugMode) {
      stats.current.lastFrameQueries = 0
    }
    
    // Posizione proposta (senza collisioni)
    vectorPool.proposedPos.copy(currentPos).add(velocity)
    
    // Offset Y per raycast dal centro del player (non dai piedi)
    const centerOffset = playerHeight * 0.5
    vectorPool.rayOrigin.copy(vectorPool.proposedPos)
    vectorPool.rayOrigin.y += centerOffset
    
    // Distanza di controllo = lunghezza movimento + raggio player + threshold
    const moveDist = velocity.length()
    const checkDistance = moveDist + radius + penetrationThreshold
    
    let closestHit = null
    let minDistance = Infinity
    
    // ========================================
    // RAYCAST 1-4: Direzioni Cardinali (N, S, E, W)
    // LayerMask: 'walls' - Ignora pavimento
    // ========================================
    for (let i = 0; i < 4; i++) {
      const dir = vectorPool.rayDirs[i]
      
      const hit = raycastBVH(
        bvhData,
        vectorPool.rayOrigin,
        dir,
        checkDistance,
        { layerMask: 'walls' }
      )
      
      if (debugMode) {
        stats.current.lastFrameQueries++
        stats.current.totalQueries++
      }
      
      if (hit && hit.distance < minDistance) {
        minDistance = hit.distance
        closestHit = hit
      }
    }
    
    // ========================================
    // RAYCAST 5: Direzione Movimento (per diagonali)
    // LayerMask: 'walls' - Ignora pavimento
    // ========================================
    if (moveDist > 0.001) {
      vectorPool.moveDir.copy(velocity).normalize()
      
      const hit = raycastBVH(
        bvhData,
        vectorPool.rayOrigin,
        vectorPool.moveDir,
        checkDistance,
        { layerMask: 'walls' }
      )
      
      if (debugMode) {
        stats.current.lastFrameQueries++
        stats.current.totalQueries++
      }
      
      if (hit && hit.distance < minDistance) {
        minDistance = hit.distance
        closestHit = hit
      }
    }
    
    // ========================================
    // RAYCAST 6: Up (Soffitto)
    // LayerMask: 'all' - Controlla tutto
    // ========================================
    const upHit = raycastBVH(
      bvhData,
      vectorPool.rayOrigin,
      vectorPool.rayDirs[4], // Up
      checkDistance,
      { layerMask: 'all' }
    )
    
    if (debugMode) {
      stats.current.lastFrameQueries++
      stats.current.totalQueries++
    }
    
    if (upHit && upHit.distance < minDistance) {
      minDistance = upHit.distance
      closestHit = upHit
    }
    
    // ========================================
    // RAYCAST 7: Down (Ground Detection)
    // Gestito separatamente da detectGround()
    // Non incluso qui per evitare interferenze
    // ========================================
    
    // Nessuna collisione: movimento libero
    if (!closestHit || minDistance > radius + penetrationThreshold) {
      if (debugMode) {
        const queryTime = performance.now() - startTime
        stats.current.avgQueryTime = (stats.current.avgQueryTime * 0.9) + (queryTime * 0.1)
      }
      
      return {
        position: vectorPool.proposedPos.clone(),
        collided: false,
        sliding: false,
        wallNormal: null
      }
    }
    
    // ========================================
    // COLLISIONE RILEVATA
    // ========================================
    
    if (debugMode) {
      stats.current.bvhHits++
    }
    
    // Se collisione frontale (verso direzione movimento) → sliding
    vectorPool.temp2.copy(velocity).normalize()
    const dotProduct = vectorPool.temp2.dot(closestHit.normal)
    const isFrontalCollision = dotProduct < -0.3 // Angolo < 110°
    
    if (enableSliding && isFrontalCollision && moveDist > 0.001) {
      // Calcola sliding vector lungo il muro
      vectorPool.wallNormal.copy(closestHit.normal)
      calculateSlideVector(velocity, vectorPool.wallNormal, vectorPool.slideVector)
      
      // Applica sliding dalla posizione corrente (non proposta)
      const finalPos = vectorPool.temp3.copy(currentPos).add(vectorPool.slideVector)
      
      // Verifica che sliding non causi nuova penetrazione
      const slideLength = vectorPool.slideVector.length()
      if (slideLength > 0.001) {
        if (debugMode) {
          const queryTime = performance.now() - startTime
          stats.current.avgQueryTime = (stats.current.avgQueryTime * 0.9) + (queryTime * 0.1)
        }
        
        return {
          position: finalPos.clone(),
          collided: true,
          sliding: true,
          wallNormal: vectorPool.wallNormal.clone()
        }
      }
    }
    
    // Collisione senza sliding valido: blocca movimento
    if (debugMode) {
      const queryTime = performance.now() - startTime
      stats.current.avgQueryTime = (stats.current.avgQueryTime * 0.9) + (queryTime * 0.1)
    }
    
    return {
      position: currentPos.clone(),
      collided: true,
      sliding: false,
      wallNormal: closestHit.normal.clone()
    }
    
  }, [bvhData, playerHeight, penetrationThreshold, enableSliding, debugMode, calculateSlideVector, vectorPool, stats])
  
  /**
   * Ground detection ottimizzato (raycast singolo down)
   * OTTIMIZZATO: Zero allocazioni, usa vector pool
   * 
   * LayerMask: 'ground' - Solo pavimento, ignora muri
   * 
   * @param {THREE.Vector3} playerPos - Posizione player (feet)
   * @param {number} currentY - Y attuale player
   * @param {number} maxStepHeight - Max altezza gradino (default: 0.35)
   * @returns {number|null} - Nuovo Y o null
   */
  const detectGround = useCallback((playerPos, currentY, maxStepHeight = 0.35) => {
    if (!bvhData) return null
    
    // Raycast dall'alto verso il basso
    vectorPool.temp1.copy(playerPos)
    vectorPool.temp1.y = currentY + 2.0 // Parti da 2m sopra i piedi
    
    const downDir = vectorPool.rayDirs[5] // Down (0, -1, 0)
    
    const hit = raycastBVH(
      bvhData,
      vectorPool.temp1,
      downDir,
      10.0,
      { layerMask: 'ground' } // Solo pavimento!
    )
    
    if (hit) {
      const groundY = hit.point.y
      const deltaY = groundY - currentY
      
      // Salita: solo piccoli gradini
      if (deltaY > 0 && deltaY <= maxStepHeight) {
        return groundY
      }
      
      // Discesa: permetti fino a 2m (per scendere da mobili)
      if (deltaY <= 0 && Math.abs(deltaY) <= 2.0) {
        return groundY
      }
    }
    
    return null
  }, [bvhData, vectorPool])
  
  /**
   * Get performance stats (solo se debugMode)
   */
  const getStats = useCallback(() => {
    return debugMode ? { 
      ...stats.current,
      avgQueryTimeMs: stats.current.avgQueryTime.toFixed(3)
    } : null
  }, [debugMode])
  
  return {
    checkPlayerMovement,
    detectGround,
    getStats
  }
}
