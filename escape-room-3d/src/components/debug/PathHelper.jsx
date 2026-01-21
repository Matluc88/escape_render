// PathHelper.jsx
// Componente per visualizzare il percorso di movimento tra due posizioni

import * as THREE from 'three'

/**
 * Componente per mostrare il percorso di movimento
 * @param {THREE.Vector3} startPosition - Posizione di partenza
 * @param {THREE.Vector3} endPosition - Posizione di arrivo
 * @param {string} color - Colore della linea
 * @param {boolean} showMarkers - Mostra marker alle estremità
 */
export default function PathHelper({ 
  startPosition, 
  endPosition, 
  color = '#ffaa00',
  showMarkers = true 
}) {
  if (!startPosition || !endPosition) return null

  // Crea la geometria della linea
  const points = [
    new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z),
    new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z)
  ]
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)

  // Calcola la distanza
  const distance = startPosition.distanceTo(endPosition)

  return (
    <group>
      {/* Linea principale del percorso */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          linewidth={3}
          transparent={true}
          opacity={0.8}
          depthTest={false}
        />
      </line>

      {/* Linea tratteggiata più sottile sopra */}
      <line geometry={lineGeometry}>
        <lineDashedMaterial
          color="#ffffff"
          linewidth={1}
          dashSize={0.1}
          gapSize={0.1}
          transparent={true}
          opacity={0.6}
          depthTest={false}
        />
      </line>

      {/* Marker di partenza (blu) */}
      {showMarkers && (
        <group>
          <mesh position={startPosition}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color="#0066ff"
              emissive="#0066ff"
              emissiveIntensity={0.3}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
          
          {/* Anello intorno al marker di partenza */}
          <mesh position={startPosition}>
            <torusGeometry args={[0.12, 0.02, 8, 32]} />
            <meshBasicMaterial
              color="#0066ff"
              transparent={true}
              opacity={0.5}
              depthTest={false}
            />
          </mesh>
        </group>
      )}

      {/* Marker di arrivo (verde) */}
      {showMarkers && (
        <group>
          <mesh position={endPosition}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={0.3}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
          
          {/* Anello intorno al marker di arrivo */}
          <mesh position={endPosition}>
            <torusGeometry args={[0.12, 0.02, 8, 32]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent={true}
              opacity={0.5}
              depthTest={false}
            />
          </mesh>

          {/* Freccia direzionale al punto di arrivo */}
          <ArrowHelper startPosition={startPosition} endPosition={endPosition} />
        </group>
      )}

      {/* Info distanza a metà percorso */}
      <DistanceLabel
        position={new THREE.Vector3(
          (startPosition.x + endPosition.x) / 2,
          (startPosition.y + endPosition.y) / 2 + 0.2,
          (startPosition.z + endPosition.z) / 2
        )}
        distance={distance}
      />
    </group>
  )
}

// Componente per la freccia direzionale
function ArrowHelper({ startPosition, endPosition }) {
  // Calcola la direzione
  const direction = new THREE.Vector3()
    .subVectors(endPosition, startPosition)
    .normalize()

  // Posizione della freccia leggermente prima del punto finale
  const arrowPosition = new THREE.Vector3()
    .copy(endPosition)
    .sub(direction.multiplyScalar(0.15))

  // Calcola la rotazione per orientare il cono verso la direzione
  const quaternion = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  quaternion.setFromUnitVectors(up, direction)

  return (
    <mesh position={arrowPosition} quaternion={quaternion}>
      <coneGeometry args={[0.05, 0.15, 8]} />
      <meshBasicMaterial
        color="#00ff00"
        transparent={true}
        opacity={0.8}
        depthTest={false}
      />
    </mesh>
  )
}

// Componente per visualizzare la distanza (semplificato - solo un punto per ora)
function DistanceLabel({ position, distance }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial
        color="#ffff00"
        transparent={true}
        opacity={0.7}
      />
    </mesh>
  )
}
