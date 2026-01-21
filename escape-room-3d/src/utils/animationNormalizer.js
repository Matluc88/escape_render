// animationNormalizer.js
// Normalizza configurazioni JSON dell'Animation Editor in config sicure per l'engine

import * as THREE from 'three'

/**
 * Normalizza una configurazione da JSON del pannello a configurazione engine
 * @param {Object} panelJson - JSON grezzo dal pannello
 * @param {THREE.Object3D} mesh - Mesh dell'oggetto da animare
 * @returns {Object} Configurazione normalizzata per l'engine
 */
export function normalizeDoorConfig(panelJson, mesh) {
  const warnings = []
  
  // ✅ 1. VALIDAZIONE CAMPI OBBLIGATORI
  if (!panelJson.objectName) {
    throw new Error('❌ JSON invalido: manca objectName')
  }
  
  if (!panelJson.type) {
    warnings.push('⚠️ Campo "type" mancante - assunto "hinged_door"')
  }
  
  if (!panelJson.state && !panelJson.initialState) {
    warnings.push('⚠️ Campo "state" mancante - assunto "closed"')
  }
  
  if (!panelJson.openAngleDeg && !panelJson.angle) {
    throw new Error('❌ JSON invalido: manca openAngleDeg o angle')
  }
  
  // ✅ 2. RILEVAMENTO CAMPI SBAGLIATI
  if (panelJson.direction !== undefined) {
    warnings.push('⚠️ Campo "direction" ignorato (dettaglio implementativo)')
  }
  
  if (panelJson.speed !== undefined) {
    warnings.push('⚠️ Campo "speed" ignorato (usata velocità di default)')
  }
  
  if (panelJson.axis !== undefined) {
    warnings.push('⚠️ Campo "axis" ignorato (dedotto dalla geometria)')
  }
  
  // ✅ 3. NORMALIZZAZIONE ANGOLO
  let openAngleRad
  if (panelJson.openAngleDeg !== undefined) {
    // Esplicito in gradi
    openAngleRad = panelJson.openAngleDeg * (Math.PI / 180)
  } else if (panelJson.angleUnit === 'deg') {
    openAngleRad = panelJson.angle * (Math.PI / 180)
  } else if (panelJson.angleUnit === 'rad') {
    openAngleRad = panelJson.angle
  } else {
    // Ambiguo - assume gradi
    warnings.push('⚠️ Unità angolo non specificata - assunti gradi')
    openAngleRad = (panelJson.angle || 90) * (Math.PI / 180)
  }
  
  // ✅ 4. DEDUZIONE ASSE DALLA GEOMETRIA
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)
  
  // Logica: se altezza > larghezza → porta verticale (asse Y)
  //         se larghezza > altezza → cassetto orizzontale (asse Z)
  let axis = 'y' // Default: verticale
  if (size.x > size.y && size.z > size.y) {
    axis = 'z' // Orizzontale
  }
  
  // ✅ 5. CALCOLO PIVOT DALLA BOUNDING BOX
  const center = new THREE.Vector3()
  box.getCenter(center)
  
  let pivotX, pivotY, pivotZ
  
  if (panelJson.pivotLocation === 'left') {
    pivotX = box.min.x
    pivotY = center.y
    pivotZ = center.z
  } else if (panelJson.pivotLocation === 'right') {
    pivotX = box.max.x
    pivotY = center.y
    pivotZ = center.z
  } else if (panelJson.pivotLocation === 'center') {
    pivotX = center.x
    pivotY = center.y
    pivotZ = center.z
  } else if (panelJson.pivotX !== undefined) {
    // Fallback: usa coordinate grezze se presenti
    pivotX = panelJson.pivotX
    pivotY = panelJson.pivotY
    pivotZ = panelJson.pivotZ
    warnings.push('⚠️ Usando coordinate pivot grezze - preferire pivotLocation')
  } else {
    // Default: bordo sinistro
    pivotX = box.min.x
    pivotY = center.y
    pivotZ = center.z
    warnings.push('⚠️ pivotLocation mancante - assunto "left"')
  }
  
  // ✅ 6. DEDUZIONE DIREZIONE DALLA GEOMETRIA
  // Se pivot è a sinistra → rotazione positiva apre verso destra (naturale)
  // Se pivot è a destra → rotazione negativa apre verso sinistra
  const isLeftPivot = Math.abs(pivotX - box.min.x) < 0.1
  const direction = isLeftPivot ? 1 : -1
  
  // ✅ 7. LETTURA STATO INIZIALE DALLA MESH
  const initialAngle = mesh.rotation[axis] || 0
  
  // ✅ 8. STATO SEMANTICO
  const state = panelJson.state || panelJson.initialState || 'closed'
  
  // ✅ 9. VELOCITÀ DI DEFAULT (radianti/secondo)
  const defaultSpeed = Math.PI / 2 // 90°/s
  
  // ✅ 10. CONFIG NORMALIZZATA
  const normalized = {
    // Semantico
    objectName: panelJson.objectName,
    type: panelJson.type || 'hinged_door',
    state,
    
    // Geometrico (calcolato)
    axis,
    closedAngle: 0,
    openAngle: openAngleRad * direction,
    currentAngle: initialAngle,
    
    // Pivot (calcolato)
    pivotX,
    pivotY,
    pivotZ,
    
    // Performance
    speed: defaultSpeed,
    
    // Metadata
    _warnings: warnings,
    _sourceJson: panelJson
  }
  
  // Log normalizzazione
  console.log('[animationNormalizer] ✅ Config normalizzata:', {
    input: panelJson,
    output: normalized,
    warnings
  })
  
  return normalized
}

/**
 * Valida un JSON grezzo prima della normalizzazione
 * @param {Object} json - JSON da validare
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validatePanelJson(json) {
  const errors = []
  const warnings = []
  
  // ❌ ERRORI CRITICI
  if (!json.objectName) {
    errors.push('Campo obbligatorio "objectName" mancante')
  }
  
  if (!json.openAngleDeg && !json.angle) {
    errors.push('Campo obbligatorio "openAngleDeg" o "angle" mancante')
  }
  
  // ⚠️ WARNING
  if (!json.type) {
    warnings.push('Campo "type" raccomandato (es: "hinged_door")')
  }
  
  if (!json.state && !json.initialState) {
    warnings.push('Campo "state" raccomandato ("open" o "closed")')
  }
  
  if (json.angle && !json.angleUnit) {
    warnings.push('Campo "angleUnit" raccomandato quando si usa "angle"')
  }
  
  // 🚩 RED FLAGS (campi che non dovrebbero esserci)
  if (json.direction !== undefined) {
    warnings.push('🚩 Campo "direction" è un dettaglio implementativo - verrà ignorato')
  }
  
  if (json.speed !== undefined) {
    warnings.push('🚩 Campo "speed" è un dettaglio implementativo - verrà ignorato')
  }
  
  if (json.axis !== undefined) {
    warnings.push('🚩 Campo "axis" dovrebbe essere dedotto dalla geometria - verrà ignorato')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export default normalizeDoorConfig
