// ObjectHighlighter.jsx
// Componente per evidenziare visivamente un oggetto 3D selezionato
// Mostra bounding box wireframe e outline colorato

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Componente per evidenziare un oggetto selezionato
 * @param {THREE.Object3D} object - L'oggetto da evidenziare
 * @param {string} color - Colore dell'highlight (default: cyan)
 * @param {boolean} showBoundingBox - Mostra la bounding box wireframe (default: true)
 */
export default function ObjectHighlighter({ object, color = '#00ffff', showBoundingBox = true }) {
  const boundingBoxRef = useRef()
  const outlineRef = useRef()

  useEffect(() => {
    if (!object) return

    // Crea o aggiorna la bounding box
    const box = new THREE.Box3().setFromObject(object)
    const size = new THREE.Vector3()
    box.getSize(size)
    
    const center = new THREE.Vector3()
    box.getCenter(center)

    // Crea geometria box helper
    if (boundingBoxRef.current) {
      // Aggiorna posizione e dimensioni
      boundingBoxRef.current.position.copy(center)
      boundingBoxRef.current.scale.set(size.x, size.y, size.z)
    }

    // Log per debug
    console.log('[ObjectHighlighter] Evidenziato:', object.name, {
      center: center.toArray(),
      size: size.toArray()
    })

  }, [object])

  if (!object) return null

  // Calcola bounding box
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  
  const center = new THREE.Vector3()
  box.getCenter(center)

  return (
    <group>
      {/* Bounding Box Wireframe */}
      {showBoundingBox && (
        <mesh ref={boundingBoxRef} position={center}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={color}
            wireframe={true}
            transparent={true}
            opacity={0.5}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Corner markers per rendere la box più visibile */}
      {showBoundingBox && (
        <>
          {/* Angoli della bounding box */}
          <CornerMarker position={[box.min.x, box.min.y, box.min.z]} color={color} />
          <CornerMarker position={[box.max.x, box.min.y, box.min.z]} color={color} />
          <CornerMarker position={[box.min.x, box.max.y, box.min.z]} color={color} />
          <CornerMarker position={[box.max.x, box.max.y, box.min.z]} color={color} />
          <CornerMarker position={[box.min.x, box.min.y, box.max.z]} color={color} />
          <CornerMarker position={[box.max.x, box.min.y, box.max.z]} color={color} />
          <CornerMarker position={[box.min.x, box.max.y, box.max.z]} color={color} />
          <CornerMarker position={[box.max.x, box.max.y, box.max.z]} color={color} />
        </>
      )}
    </group>
  )
}

// Componente helper per i marker agli angoli
function CornerMarker({ position, color }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent={true}
        opacity={0.8}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
