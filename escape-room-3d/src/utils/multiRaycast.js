import * as THREE from 'three'

/**
 * Multi-Ray Raycasting con pattern a croce o griglia
 * Lancia 5-25 raggi in pattern per facilitare il targeting di oggetti piccoli o incassati
 * 
 * @param {THREE.Camera} camera - Camera Three.js
 * @param {THREE.Object3D[]} objects - Oggetti da testare
 * @param {Object} options - Opzioni di configurazione
 * @param {number} options.rayCount - Numero di raggi: 5 (croce), 9 (croce + diagonali), 25 (griglia 5x5). Default: 5
 * @param {number} options.spreadAngle - Angolo di dispersione in gradi. Default: 2.0°
 * @param {number} options.maxDistance - Distanza massima del raycast. Default: 10
 * @param {boolean} options.recursive - Se testare ricorsivamente i children. Default: true
 * @param {string[]} options.excludeNames - Array di nomi oggetti da IGNORARE (i raggi li attraversano). Default: []
 * @param {boolean} options.debug - Mostra log di debug. Default: false
 * @returns {THREE.Intersection|null} Il primo intersect trovato (più vicino) o null
 */
export function multiRaycast(camera, objects, options = {}) {
  const {
    rayCount = 5,           // 5 = croce, 9 = croce + diagonali, 25 = griglia 5x5
    spreadAngle = 2.0,      // Gradi di dispersione (2° è un buon compromesso)
    maxDistance = 10,       // Distanza massima
    recursive = true,       // Testa ricorsivamente i children
    excludeNames = [],      // Array di nomi da escludere (es. ["MURO_CON_SERVO_LETTO"])
    debug = false           // Log di debug
  } = options

  if (!camera || !objects || objects.length === 0) {
    return null
  }

  // Converti angolo in radianti
  const spreadRad = THREE.MathUtils.degToRad(spreadAngle)

  // Pattern di offset per i raggi
  // Ogni pattern è [offsetX, offsetY] in radianti
  const rayPatterns = {
    5: [
      [0, 0],              // Centro
      [0, spreadRad],      // Su
      [0, -spreadRad],     // Giù
      [spreadRad, 0],      // Destra
      [-spreadRad, 0]      // Sinistra
    ],
    9: [
      [0, 0],                    // Centro
      [0, spreadRad],            // Su
      [0, -spreadRad],           // Giù
      [spreadRad, 0],            // Destra
      [-spreadRad, 0],           // Sinistra
      [spreadRad, spreadRad],    // Su-Destra
      [spreadRad, -spreadRad],   // Giù-Destra
      [-spreadRad, spreadRad],   // Su-Sinistra
      [-spreadRad, -spreadRad]   // Giù-Sinistra
    ],
    25: [
      // Griglia 5x5 per coverage massima (oggetti incassati come la ventola)
      // Riga 1 (top)
      [-2*spreadRad, 2*spreadRad], [-spreadRad, 2*spreadRad], [0, 2*spreadRad], [spreadRad, 2*spreadRad], [2*spreadRad, 2*spreadRad],
      // Riga 2
      [-2*spreadRad, spreadRad], [-spreadRad, spreadRad], [0, spreadRad], [spreadRad, spreadRad], [2*spreadRad, spreadRad],
      // Riga 3 (centro)
      [-2*spreadRad, 0], [-spreadRad, 0], [0, 0], [spreadRad, 0], [2*spreadRad, 0],
      // Riga 4
      [-2*spreadRad, -spreadRad], [-spreadRad, -spreadRad], [0, -spreadRad], [spreadRad, -spreadRad], [2*spreadRad, -spreadRad],
      // Riga 5 (bottom)
      [-2*spreadRad, -2*spreadRad], [-spreadRad, -2*spreadRad], [0, -2*spreadRad], [spreadRad, -2*spreadRad], [2*spreadRad, -2*spreadRad]
    ]
  }

  // Usa il pattern corretto
  const patterns = rayPatterns[rayCount] || rayPatterns[5]

  // Crea un raycaster temporaneo
  const raycaster = new THREE.Raycaster()
  raycaster.far = maxDistance

  // Direzione centrale della camera
  const centerDirection = new THREE.Vector3()
  camera.getWorldDirection(centerDirection)

  // Array per raccogliere TUTTI gli intersects da tutti i raggi
  const allIntersects = []

  if (debug) {
    console.log(`[MultiRaycast] Lancio ${patterns.length} raggi (spread: ${spreadAngle}°)`)
  }

  // Lancia ogni raggio con il suo offset
  patterns.forEach((pattern, index) => {
    const [offsetX, offsetY] = pattern

    // Crea direzione con offset
    // Ruotiamo la direzione centrale usando quaternioni per precisione
    const direction = centerDirection.clone()

    // Applica rotazione verticale (pitch - asse X locale camera)
    if (offsetY !== 0) {
      const cameraRight = new THREE.Vector3()
      cameraRight.crossVectors(camera.up, direction).normalize()
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(cameraRight, offsetY)
      direction.applyQuaternion(pitchQuat)
    }

    // Applica rotazione orizzontale (yaw - asse Y world)
    if (offsetX !== 0) {
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(camera.up, offsetX)
      direction.applyQuaternion(yawQuat)
    }

    direction.normalize()

    // Configura raycaster con questa direzione
    raycaster.set(camera.position, direction)

    // Lancia il raggio
    const intersects = raycaster.intersectObjects(objects, recursive)

    // 🔧 FILTRA oggetti esclusi (per far passare i raggi attraverso muri, ecc.)
    const filteredIntersects = intersects.filter(hit => {
      if (excludeNames.length === 0) return true
      
      const objName = hit.object.name || ''
      // Escludi se il nome CONTIENE una delle stringhe da escludere (case-insensitive)
      const shouldExclude = excludeNames.some(excludeName => 
        objName.toLowerCase().includes(excludeName.toLowerCase())
      )
      
      if (shouldExclude && debug) {
        console.log(`[MultiRaycast] 🚫 ESCLUSO: "${objName}" (attraversato)`)
      }
      
      return !shouldExclude
    })

    if (filteredIntersects.length > 0 && debug) {
      console.log(`[MultiRaycast] Raggio ${index} (${offsetX.toFixed(3)}, ${offsetY.toFixed(3)}): ${filteredIntersects.length} hits (dopo filtro)`)
    }

    // Aggiungi tutti gli intersects FILTRATI
    allIntersects.push(...filteredIntersects)
  })

  if (allIntersects.length === 0) {
    return null
  }

  // Ordina per distanza (più vicino prima)
  allIntersects.sort((a, b) => a.distance - b.distance)

  const closest = allIntersects[0]

  if (debug) {
    console.log(`[MultiRaycast] ✅ Oggetto più vicino: "${closest.object.name}" a ${closest.distance.toFixed(2)}m`)
  }

  return closest
}

/**
 * Versione semplificata che restituisce solo il nome dell'oggetto o null
 * @param {THREE.Camera} camera - Camera Three.js
 * @param {THREE.Object3D[]} objects - Oggetti da testare
 * @param {Object} options - Opzioni (vedi multiRaycast)
 * @returns {string|null} Nome dell'oggetto colpito o null
 */
export function multiRaycastName(camera, objects, options = {}) {
  const hit = multiRaycast(camera, objects, options)
  return hit ? hit.object.name : null
}

/**
 * Hook React per multi-raycast continuo (da usare in useFrame)
 * Restituisce un oggetto con utility per il raycast
 * 
 * @example
 * const raycast = useMultiRaycast()
 * 
 * useFrame(() => {
 *   const target = raycast.check(camera, interactiveObjects)
 *   if (target !== lastTarget) {
 *     onTargetChange(target)
 *   }
 * })
 */
export function createMultiRaycastHelper(options = {}) {
  return {
    /**
     * Controlla se la camera sta puntando un oggetto
     * @param {THREE.Camera} camera - Camera
     * @param {THREE.Object3D[]} objects - Oggetti interattivi
     * @returns {string|null} Nome oggetto o null
     */
    check: (camera, objects) => {
      return multiRaycastName(camera, objects, options)
    },
    
    /**
     * Versione completa che restituisce l'intersect
     * @param {THREE.Camera} camera - Camera
     * @param {THREE.Object3D[]} objects - Oggetti interattivi
     * @returns {THREE.Intersection|null} Intersect o null
     */
    checkFull: (camera, objects) => {
      return multiRaycast(camera, objects, options)
    }
  }
}
