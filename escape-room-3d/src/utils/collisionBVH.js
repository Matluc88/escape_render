import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// ========================================
// EXTEND THREE.JS PROTOTYPES (una volta sola)
// Abilita BVH acceleration su tutte le geometrie
// ========================================
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

/**
 * Crea BVH per geometria statica della casa
 * Build avviene UNA VOLTA al load, poi query velocissime
 * 
 * @param {THREE.Group} sceneGroup - Gruppo contenente il modello casa
 * @param {Object} options - Configurazione BVH
 * @param {boolean} options.verbose - Log debug (default: false)
 * @param {number} options.maxLeafTris - Triangoli per foglia BVH (default: 10)
 * @param {number} options.maxDepth - Max profondità albero (default: 40)
 * @returns {Object} BVHCollisionData
 */
export function createStaticBVH(sceneGroup, options = {}) {
  const {
    verbose = false,
    maxLeafTris = 10,
    maxDepth = 40
  } = options
  
  const startTime = performance.now()
  
  // 1. Raccogli mesh statiche collidabili
  const staticMeshes = []
  let totalTriangles = 0
  let groundCount = 0
  let wallCount = 0
  
  sceneGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      // Filtro: solo oggetti collidabili non dinamici
      const isCollidable = obj.userData.collidable === true || 
                          (obj.userData.collidable !== false && 
                           !obj.userData.trigger && 
                           !obj.userData.decorative &&
                           !obj.userData.dynamic)
      
      const isGround = obj.userData.ground === true
      
      if (isCollidable || isGround) {
        // Update world matrix prima di creare BVH
        obj.updateMatrixWorld(true)
        
        // Verifica scale non uniforme (può causare problemi con normali)
        if (obj.scale.x !== obj.scale.y || obj.scale.y !== obj.scale.z) {
          console.warn(`[BVH] Non-uniform scale on "${obj.name}" - normals may need adjustment`)
        }
        
        staticMeshes.push(obj)
        
        // Crea BVH per questa mesh (in-place, modifica geometry)
        if (!obj.geometry.boundsTree) {
          obj.geometry.computeBoundsTree({
            maxLeafTris,
            maxDepth,
            strategy: 0, // SAH (Surface Area Heuristic) - best quality
            verbose: false
          })
        }
        
        // Conta triangoli e categorizza
        const indexCount = obj.geometry.index ? obj.geometry.index.count : 0
        const posCount = obj.geometry.attributes.position ? obj.geometry.attributes.position.count : 0
        const tris = indexCount > 0 ? indexCount / 3 : posCount / 3
        totalTriangles += tris
        
        if (isGround) {
          groundCount++
        } else {
          wallCount++
        }
      }
    }
  })
  
  // 2. Calcola bounding box globale
  const globalBounds = new THREE.Box3()
  for (const mesh of staticMeshes) {
    const meshBox = new THREE.Box3().setFromObject(mesh)
    globalBounds.union(meshBox)
  }
  
  const buildTime = performance.now() - startTime
  
  if (verbose) {
    console.log('=== BVH BUILD COMPLETE ===')
    console.log(`Total Meshes: ${staticMeshes.length} (${wallCount} walls, ${groundCount} ground)`)
    console.log(`Total Triangles: ${totalTriangles.toFixed(0)}`)
    console.log(`Build Time: ${buildTime.toFixed(2)}ms`)
    console.log(`Global Bounds:`, {
      min: globalBounds.min.toArray().map(v => v.toFixed(2)),
      max: globalBounds.max.toArray().map(v => v.toFixed(2))
    })
    console.log('==========================')
  }
  
  return {
    staticMeshes,
    bounds: globalBounds,
    triangleCount: totalTriangles,
    buildTime,
    stats: {
      totalMeshes: staticMeshes.length,
      wallMeshes: wallCount,
      groundMeshes: groundCount
    }
  }
}

/**
 * Raycast ottimizzato su BVH statico con Layer Masking ibrido
 * ~0.05-0.2ms per query (vs 1-3ms Raycaster nativo)
 * 
 * MACRO FILTERING: Filtra mesh per layer prima del raycast
 * MICRO FILTERING: Analizza normali dopo hit per eliminare falsi positivi
 * 
 * @param {Object} bvhData - Dati BVH da createStaticBVH()
 * @param {THREE.Vector3} origin - Punto di partenza raggio
 * @param {THREE.Vector3} direction - Direzione normalizzata
 * @param {number} maxDistance - Distanza massima
 * @param {Object} options - Opzioni raycast
 * @param {string} options.layerMask - 'all', 'walls', 'ground' (default: 'all')
 * @returns {Object|null} Hit result o null
 */
export function raycastBVH(bvhData, origin, direction, maxDistance, options = {}) {
  if (!bvhData || !bvhData.staticMeshes || bvhData.staticMeshes.length === 0) {
    return null
  }
  
  const { layerMask = 'all' } = options
  
  let closestHit = null
  let minDistance = maxDistance
  
  // Pre-calcola info sul raggio per smart analysis
  const isHorizontalRay = Math.abs(direction.y) < 0.3  // Raggio quasi orizzontale
  const isVerticalDownRay = direction.y < -0.9          // Raggio verso il basso
  
  // Raycast su tutte le mesh BVH-accelerate
  for (const mesh of bvhData.staticMeshes) {
    if (!mesh.geometry.boundsTree) continue
    
    // ========================================
    // MACRO FILTERING (Pre-Raycast)
    // Filtra intere mesh per layer - O(1) per mesh
    // ========================================
    const isGround = mesh.userData.ground === true
    
    if (layerMask === 'walls' && isGround) {
      continue // Ignora pavimento se cerco solo muri
    }
    
    if (layerMask === 'ground' && !isGround) {
      continue // Ignora muri se cerco solo pavimento
    }
    
    // Query BVH (MOLTO più veloce di Raycaster nativo)
    const hit = mesh.geometry.boundsTree.raycastFirst(
      origin,
      direction,
      0,           // Near plane
      minDistance  // Far plane (aggiornato con hit più vicino)
    )
    
    if (hit && hit.distance < minDistance) {
      // ========================================
      // WHITELISTING: Oggetti Strutturali Critici
      // Questi oggetti devono SEMPRE collidere bi-direzionalmente
      // (da esterno→interno E da interno→esterno)
      // ========================================
      const meshName = mesh.name.toLowerCase()
      const isCriticalStructure = 
        meshName.includes('torri') ||
        meshName.includes('muro') ||
        meshName.includes('ringhiera') ||
        meshName.includes('cancell') // Copre "cancello" e "cancelletto"
      
      // ========================================
      // MICRO FILTERING (Post-Raycast Safety Net)
      // Analizza normale del hit per eliminare falsi positivi
      // BYPASSATO per strutture critiche!
      // ========================================
      
      if (!isCriticalStructure) {
        // Trasforma normale da local space a world space
        const worldNormal = new THREE.Vector3()
        worldNormal.copy(hit.face.normal)
          .transformDirection(mesh.matrixWorld)
          .normalize()
        
        // Check 1: Raggio orizzontale hita superficie orizzontale (pavimento)
        // → Falso positivo, ignora
        if (isHorizontalRay && worldNormal.y > 0.7) {
          continue // Ignora hit pavimento su raggio orizzontale
        }
        
        // Check 2: Raggio verticale down hita superficie verticale (muro)
        // → Falso positivo, ignora
        if (isVerticalDownRay && worldNormal.y < 0.5) {
          continue // Ignora hit muro su raggio down
        }
      }
      
      // ========================================
      // HIT VALIDO - Aggiorna closest hit
      // ========================================
      minDistance = hit.distance
      
      // Trasforma normale e point in world space
      const worldNormal = new THREE.Vector3()
      worldNormal.copy(hit.face.normal)
        .transformDirection(mesh.matrixWorld)
        .normalize()
      
      const worldPoint = new THREE.Vector3()
      worldPoint.copy(hit.point).applyMatrix4(mesh.matrixWorld)
      
      closestHit = {
        distance: hit.distance,
        point: worldPoint,
        normal: worldNormal,
        faceIndex: hit.faceIndex,
        object: mesh,
        isCriticalStructure: isCriticalStructure || false // Flag per debug
      }
    }
  }
  
  return closestHit
}

/**
 * Dispose BVH per cleanup (chiamare su scene unmount)
 * Libera memoria allocata per BVH tree
 * 
 * @param {Object} bvhData - Dati BVH da createStaticBVH()
 */
export function disposeBVH(bvhData) {
  if (!bvhData || !bvhData.staticMeshes) return
  
  for (const mesh of bvhData.staticMeshes) {
    if (mesh.geometry && mesh.geometry.boundsTree) {
      mesh.geometry.disposeBoundsTree()
    }
  }
  
  bvhData.staticMeshes = []
  console.log('[BVH] Disposed BVH tree')
}
