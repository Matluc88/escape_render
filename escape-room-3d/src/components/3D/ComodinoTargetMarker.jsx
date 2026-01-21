// ComodinoTargetMarker.jsx
// Indicatore visivo 3D per la destinazione finale del comodino
// Freccia verticale verde lime brillante che punta dal soffitto al pavimento

import React from 'react'
import * as THREE from 'three'

/**
 * Componente che mostra una freccia 3D verticale ben visibile
 * per indicare chiaramente ai bambini dove mettere il comodino
 * 
 * @param {Object} props
 * @param {number} props.targetX - Coordinata X destinazione
 * @param {number} props.targetY - Coordinata Y destinazione (pavimento = 0)
 * @param {number} props.targetZ - Coordinata Z destinazione
 * @param {boolean} props.visible - Se mostrare o nascondere il marker
 */
export default function ComodinoTargetMarker({ 
  targetX = -3, 
  targetY = 0, 
  targetZ = -2.38,
  visible = true 
}) {
  
  // Se non visibile, non renderizzare nulla
  if (!visible) {
    return null
  }
  
  // Colore verde lime brillante
  const arrowColor = 0x00FF00
  
  return (
    <group name="ComodinoTargetMarkerGroup" position={[targetX, 0, targetZ]}>
      
      {/* 🔷 CORPO CILINDRICO DELLA FRECCIA - Più corto! */}
      <mesh 
        position={[0, 1.1, 0]} 
        userData={{ collidable: false }}
      >
        <cylinderGeometry args={[
          0.05,  // raggio top: 5cm = 10cm diametro
          0.05,  // raggio bottom: 5cm = 10cm diametro
          0.7,   // altezza: 0.7 metri (da 0.75m a 1.45m)
          32     // segmenti radiali per renderlo liscio
        ]} />
        <meshStandardMaterial 
          color={arrowColor}
          emissive={arrowColor}
          emissiveIntensity={0.8}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      
      {/* 🔻 PUNTA CONICA - Molto più alta! */}
      <mesh 
        position={[0, 0.75, 0]}
        rotation={[0, 0, Math.PI]} // ✅ Rotazione di 180° per puntare GIÙ
        userData={{ collidable: false }}
      >
        <coneGeometry args={[
          0.125,  // raggio base: 12.5cm = 25cm di diametro
          0.3,    // altezza: 30cm (vertice a Y=0.45m, 45cm sopra pavimento!)
          32      // segmenti radiali
        ]} />
        <meshStandardMaterial 
          color={arrowColor}
          emissive={arrowColor}
          emissiveIntensity={1.0}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      
      {/* 🔵 ANELLO CIRCOLARE SUL PAVIMENTO - Dimensioni proporzionate */}
      <mesh 
        position={[0, 0.02, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        userData={{ collidable: false }}
      >
        <ringGeometry args={[
          0.3,  // raggio interno: 30cm
          0.4,  // raggio esterno: 40cm (10cm di spessore)
          64    // segmenti per renderlo liscio
        ]} />
        <meshBasicMaterial 
          color={arrowColor} 
          transparent 
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* ⭕ CERCHIO PIENO AL CENTRO - Extra visibilità */}
      <mesh 
        position={[0, 0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        userData={{ collidable: false }}
      >
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial 
          color={arrowColor} 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
    </group>
  )
}
