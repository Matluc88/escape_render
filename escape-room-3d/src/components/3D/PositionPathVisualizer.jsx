// PositionPathVisualizer.jsx
// Componente 3D per visualizzare il percorso di un'animazione di posizione

import { Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Componente che mostra visualmente:
 * - Linea tratteggiata da punto Start a punto End
 * - Marker sferico sul punto End
 * 
 * @param {Object} config - Configurazione posizione con startX/Y/Z e endX/Y/Z
 * @param {boolean} visible - Se true, mostra il visualizer
 */
export default function PositionPathVisualizer({ config, visible = true }) {
  if (!visible || !config) return null

  const { startX, startY, startZ, endX, endY, endZ } = config

  // Verifica che tutti i valori siano definiti
  if (
    startX === undefined || startY === undefined || startZ === undefined ||
    endX === undefined || endY === undefined || endZ === undefined
  ) {
    return null
  }

  // Punti per la linea
  const startPoint = [startX, startY, startZ]
  const endPoint = [endX, endY, endZ]

  // Calcola distanza
  const distance = Math.sqrt(
    Math.pow(endX - startX, 2) +
    Math.pow(endY - startY, 2) +
    Math.pow(endZ - startZ, 2)
  )

  return (
    <group name="PositionPathVisualizer">
      {/* Linea tratteggiata Start → End */}
      <Line
        points={[startPoint, endPoint]}
        color="cyan"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Marker sul punto Start (verde scuro) */}
      <mesh position={startPoint}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.6}
          depthTest={false}
        />
      </mesh>

      {/* Marker sul punto End (verde lime brillante) */}
      <mesh position={endPoint}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial 
          color="#00ff00" 
          transparent 
          opacity={0.8}
          depthTest={false}
        />
      </mesh>

      {/* Ring attorno al marker End per maggiore visibilità */}
      <mesh position={endPoint} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.12, 32]} />
        <meshBasicMaterial 
          color="#00ff00" 
          side={THREE.DoubleSide}
          transparent 
          opacity={0.5}
          depthTest={false}
        />
      </mesh>

      {/* Label distanza (opzionale - commentato per ora) */}
      {/* 
      <Text
        position={[
          (startX + endX) / 2,
          (startY + endY) / 2 + 0.2,
          (startZ + endZ) / 2
        ]}
        fontSize={0.1}
        color="cyan"
        anchorX="center"
        anchorY="middle"
      >
        {distance.toFixed(2)}m
      </Text>
      */}
    </group>
  )
}
