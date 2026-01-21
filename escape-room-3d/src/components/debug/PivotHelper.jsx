// PivotHelper.jsx
// Componente per visualizzare e configurare il punto cardine (pivot) per rotazioni

import { useState, useRef } from 'react'
import * as THREE from 'three'

/**
 * Componente per mostrare il punto cardine di rotazione
 * @param {THREE.Vector3} position - Posizione del cardine
 * @param {Function} onPositionChange - Callback quando la posizione cambia
 * @param {string} axis - Asse di rotazione ('x', 'y', 'z')
 * @param {string} color - Colore del cardine
 * @param {boolean} interactive - Permette di spostare il cardine con drag
 */
export default function PivotHelper({ 
  position, 
  onPositionChange, 
  axis = 'y',
  color = '#ff0000',
  interactive = true 
}) {
  const [isDragging, setIsDragging] = useState(false)
  const sphereRef = useRef()

  // Handler per il drag
  const handlePointerDown = (e) => {
    if (!interactive) return
    e.stopPropagation()
    setIsDragging(true)
    console.log('[PivotHelper] Drag iniziato')
  }

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false)
      console.log('[PivotHelper] Drag terminato')
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging || !onPositionChange) return
    e.stopPropagation()
    
    // Ottieni la nuova posizione dal punto di intersezione
    const newPosition = e.point
    onPositionChange(newPosition)
  }

  // Colore più chiaro quando in dragging
  const displayColor = isDragging ? '#ffaa00' : color

  return (
    <group>
      {/* Sfera del cardine */}
      <mesh
        ref={sphereRef}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isDragging ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Anello intorno alla sfera per indicare che è interattiva */}
      {interactive && (
        <mesh position={position} rotation={getRotationForAxis(axis)}>
          <torusGeometry args={[0.15, 0.02, 8, 32]} />
          <meshBasicMaterial
            color={displayColor}
            transparent={true}
            opacity={0.6}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Asse di rotazione visualizzato come linea */}
      <AxisLine position={position} axis={axis} color={displayColor} length={1.0} />

      {/* Label per il cardine */}
      <TextLabel position={position} text="CARDINE" offset={[0, 0.3, 0]} />
    </group>
  )
}

// Helper per ottenere la rotazione corretta del torus in base all'asse
function getRotationForAxis(axis) {
  switch (axis) {
    case 'x':
      return [0, Math.PI / 2, 0]
    case 'y':
      return [Math.PI / 2, 0, 0]
    case 'z':
      return [0, 0, 0]
    default:
      return [0, 0, 0]
  }
}

// Componente per disegnare l'asse di rotazione
function AxisLine({ position, axis, color, length }) {
  const points = []
  const halfLength = length / 2

  // Crea i punti per la linea in base all'asse
  switch (axis) {
    case 'x':
      points.push(new THREE.Vector3(position.x - halfLength, position.y, position.z))
      points.push(new THREE.Vector3(position.x + halfLength, position.y, position.z))
      break
    case 'y':
      points.push(new THREE.Vector3(position.x, position.y - halfLength, position.z))
      points.push(new THREE.Vector3(position.x, position.y + halfLength, position.z))
      break
    case 'z':
      points.push(new THREE.Vector3(position.x, position.y, position.z - halfLength))
      points.push(new THREE.Vector3(position.x, position.y, position.z + halfLength))
      break
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        color={color}
        linewidth={2}
        transparent={true}
        opacity={0.7}
        depthTest={false}
      />
    </line>
  )
}

// Componente per label testuale 3D (semplificata)
function TextLabel({ position, text, offset = [0, 0, 0] }) {
  const labelPosition = [
    position.x + offset[0],
    position.y + offset[1],
    position.z + offset[2]
  ]

  return (
    <mesh position={labelPosition}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent={true}
        opacity={0.0}
      />
    </mesh>
  )
}
