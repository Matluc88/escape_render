// movableNodeHelper.js
// Utility per gestire ownership unificata di oggetti con nodo ROOT
// Risolve il problema di animazioni che operano su ROOT mentre altri script operano sulla mesh

import * as THREE from 'three'

/**
 * Trova il nodo che può essere mosso fisicamente.
 * 
 * REGOLA:
 * - Se l'oggetto ha un parent che finisce con "_ROOT", quello è il nodo fisico
 * - Altrimenti l'oggetto stesso è movibile
 * 
 * PATTERN "ANCORA MATEMATICA":
 * Quando si crea un nodo neutro ROOT per stabilizzare animazioni,
 * il ROOT diventa l'oggetto fisico e la mesh interna è solo grafica.
 * 
 * @param {THREE.Object3D} obj - L'oggetto da cui partire
 * @returns {THREE.Object3D|null} - Il nodo movibile (ROOT o oggetto stesso)
 * 
 * @example
 * // Oggetto con ROOT
 * const pentola = scene.getObjectByName('PENTOLA')
 * const movable = getMovableNode(pentola)  // → PENTOLA_ROOT
 * 
 * // Oggetto senza ROOT
 * const porta = scene.getObjectByName('Porta')
 * const movable = getMovableNode(porta)  // → Porta (stesso oggetto)
 */
export function getMovableNode(obj) {
  if (!obj) {
    console.warn('[getMovableNode] Oggetto null o undefined')
    return null
  }
  
  // Se il parent si chiama *_ROOT, usa quello (pattern ancora matematica)
  if (obj.parent && obj.parent.name && obj.parent.name.endsWith('_ROOT')) {
    console.log(`[getMovableNode] ${obj.name} → usa parent ${obj.parent.name} (pattern ROOT)`)
    return obj.parent
  }
  
  // Altrimenti l'oggetto è già movibile direttamente
  console.log(`[getMovableNode] ${obj.name} → nessun ROOT, usa diretto`)
  return obj
}

/**
 * Ottieni la posizione del nodo movibile.
 * 
 * IMPORTANTE:
 * Se l'oggetto ha un ROOT, questa funzione restituisce root.position,
 * NON obj.position (che dovrebbe essere sempre 0,0,0 per la mesh interna).
 * 
 * @param {THREE.Object3D} obj - L'oggetto
 * @returns {THREE.Vector3|null} - La posizione del nodo movibile (clone)
 * 
 * @example
 * const pos = getMovablePosition(pentola)
 * console.log('Posizione fisica:', pos)  // → posizione del ROOT
 */
export function getMovablePosition(obj) {
  const movable = getMovableNode(obj)
  
  if (!movable) {
    console.error('[getMovablePosition] Nodo movibile non trovato!')
    return null
  }
  
  return movable.position.clone()
}

/**
 * Ottieni la posizione WORLD del nodo movibile.
 * 
 * @param {THREE.Object3D} obj - L'oggetto
 * @returns {THREE.Vector3|null} - La posizione world del nodo movibile
 * 
 * @example
 * const worldPos = getMovableWorldPosition(pentola)
 * console.log('Posizione world:', worldPos)
 */
export function getMovableWorldPosition(obj) {
  const movable = getMovableNode(obj)
  
  if (!movable) {
    console.error('[getMovableWorldPosition] Nodo movibile non trovato!')
    return null
  }
  
  const worldPos = new THREE.Vector3()
  movable.getWorldPosition(worldPos)
  return worldPos
}

/**
 * Setta la posizione del nodo movibile.
 * 
 * IMPORTANTE:
 * Questa funzione opera sul ROOT se presente, garantendo che:
 * - root.position = nuova posizione
 * - mesh.position = (0,0,0) sempre
 * 
 * @param {THREE.Object3D} obj - L'oggetto
 * @param {number} x - Coordinata X
 * @param {number} y - Coordinata Y
 * @param {number} z - Coordinata Z
 * @returns {boolean} - true se successo, false altrimenti
 * 
 * @example
 * // ✅ CORRETTO
 * setMovablePosition(pentola, -1.015, -0.109, 0.857)
 * // → Muove PENTOLA_ROOT, non PENTOLA
 * 
 * // ❌ SBAGLIATO (NON fare mai!)
 * pentola.position.set(-1.015, -0.109, 0.857)
 * // → Rompe la gerarchia ROOT!
 */
export function setMovablePosition(obj, x, y, z) {
  const movable = getMovableNode(obj)
  
  if (!movable) {
    console.error('[setMovablePosition] Nodo movibile non trovato!')
    return false
  }
  
  console.log(`[setMovablePosition] ${movable.name} → [${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]`)
  
  movable.position.set(x, y, z)
  movable.updateMatrix()
  movable.updateMatrixWorld(true)
  
  // ✅ VERIFICA: Se c'è un ROOT, la mesh interna DEVE essere a (0,0,0)
  if (movable !== obj && obj.position.length() > 0.001) {
    console.warn(`⚠️  [setMovablePosition] ATTENZIONE: ${obj.name}.position non è (0,0,0)!`)
    console.warn(`   Attuale: [${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}]`)
    console.warn(`   Questo potrebbe causare comportamenti imprevisti!`)
  }
  
  return true
}

/**
 * Copia la posizione da un Vector3 al nodo movibile.
 * 
 * @param {THREE.Object3D} obj - L'oggetto
 * @param {THREE.Vector3} position - La nuova posizione
 * @returns {boolean} - true se successo
 * 
 * @example
 * const newPos = new THREE.Vector3(-2.6, 0.95, 3.2)
 * setMovablePositionFromVector(pentola, newPos)
 */
export function setMovablePositionFromVector(obj, position) {
  if (!(position instanceof THREE.Vector3)) {
    console.error('[setMovablePositionFromVector] Position non è un Vector3!')
    return false
  }
  
  return setMovablePosition(obj, position.x, position.y, position.z)
}

/**
 * Verifica se un oggetto usa il pattern ROOT.
 * 
 * @param {THREE.Object3D} obj - L'oggetto da verificare
 * @returns {boolean} - true se ha un parent ROOT
 * 
 * @example
 * if (hasRootNode(pentola)) {
 *   console.log('Usa pattern ancora matematica')
 * }
 */
export function hasRootNode(obj) {
  return obj && obj.parent && obj.parent.name && obj.parent.name.endsWith('_ROOT')
}

/**
 * Ottieni info debug sul sistema di ownership.
 * 
 * @param {THREE.Object3D} obj - L'oggetto
 * @returns {Object} - Oggetto con info debug
 * 
 * @example
 * const info = getOwnershipInfo(pentola)
 * console.log('Info ownership:', info)
 */
export function getOwnershipInfo(obj) {
  if (!obj) return null
  
  const movable = getMovableNode(obj)
  const hasRoot = hasRootNode(obj)
  
  return {
    objectName: obj.name,
    objectUUID: obj.uuid,
    movableName: movable?.name || 'null',
    movableUUID: movable?.uuid || 'null',
    hasRoot: hasRoot,
    objectPosition: obj.position.clone(),
    movablePosition: movable ? movable.position.clone() : null,
    isValid: hasRoot ? obj.position.length() < 0.001 : true,  // Se ha ROOT, mesh DEVE essere a (0,0,0)
    warning: hasRoot && obj.position.length() > 0.001 
      ? `⚠️ MESH POSITION NON È (0,0,0)! Ownership corrotta!`
      : null
  }
}

export default {
  getMovableNode,
  getMovablePosition,
  getMovableWorldPosition,
  setMovablePosition,
  setMovablePositionFromVector,
  hasRootNode,
  getOwnershipInfo
}
