import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * SerraLight - Manipola direttamente il neon fisico MURO_SERRA
 * 
 * Features:
 * - Trova automaticamente il neon nel modello tramite UUID
 * - Effetto pulsante smooth dell'emissive
 * - Glow naturale tramite emissiveIntensity
 * - Nessuna particella, solo luce del materiale
 * 
 * Props:
 * - enabled: true/false per accendere/spegnere
 * - state: 'locked' | 'active' | 'solved' (per variare il colore se necessario)
 */
export default function SerraLight({ enabled = true, state = 'active' }) {
  const { scene } = useThree()
  const neonMeshRef = useRef(null)
  const timeRef = useRef(0)
  const searchingRef = useRef(true)  // Flag per controllare se stiamo ancora cercando
  const searchStartTimeRef = useRef(Date.now())
  const SEARCH_TIMEOUT = 10000  // 10 secondi timeout
  
  // UUID del MURO_SERRA neon
  const NEON_UUID = 'BA166D41-384C-499E-809C-E932A5015BB4'
  
  // 🔄 RETRY LOGIC: Cerca il mesh continuamente finché non lo trova
  useFrame(() => {
    // Se già trovato, skip
    if (neonMeshRef.current || !searchingRef.current) return
    
    // Check timeout
    const elapsed = Date.now() - searchStartTimeRef.current
    if (elapsed > SEARCH_TIMEOUT) {
      console.error('[SerraLight] ⏱️ Timeout ricerca MURO_SERRA dopo 10 secondi')
      searchingRef.current = false
      return
    }
    
    // Cerca il mesh
    let neonMesh = null
    scene.traverse((child) => {
      if (child.uuid === NEON_UUID) {
        neonMesh = child
      }
    })
    
    // Se trovato, configura
    if (neonMesh && neonMesh.isMesh && neonMesh.material) {
      console.log('[SerraLight] ✅ MURO_SERRA trovato:', neonMesh.name, '(dopo', elapsed, 'ms)')
      neonMeshRef.current = neonMesh
      searchingRef.current = false
      
      // Log posizione per debug
      const worldPos = new THREE.Vector3()
      neonMesh.getWorldPosition(worldPos)
      console.log('[SerraLight] 📍 Posizione world:', {
        x: worldPos.x.toFixed(3),
        y: worldPos.y.toFixed(3),
        z: worldPos.z.toFixed(3)
      })
      
      // Imposta stato iniziale (spento)
      if (!enabled) {
        neonMesh.material.emissive = new THREE.Color(0x202020)
        neonMesh.material.emissiveIntensity = 0
      }
    }
  })
  
  // Animazione pulsante
  useFrame((_, delta) => {
    if (!neonMeshRef.current || !neonMeshRef.current.material) return
    
    const material = neonMeshRef.current.material
    timeRef.current += delta
    
    if (enabled) {
      // 🟢 ACCESO: Verde pulsante
      const pulseSpeed = 2.0  // 2 cicli al secondo
      const pulsePhase = Math.sin(timeRef.current * pulseSpeed * Math.PI)
      
      // Pulsazione dolce tra 1.5 e 3.0
      const minIntensity = 1.5
      const maxIntensity = 3.0
      const intensity = minIntensity + ((pulsePhase + 1) / 2) * (maxIntensity - minIntensity)
      
      // Verde brillante
      material.emissive = new THREE.Color(0x00ff00)
      material.emissiveIntensity = intensity
      
    } else {
      // ⚫ SPENTO: Grigio scuro
      material.emissive = new THREE.Color(0x202020)
      material.emissiveIntensity = 0
    }
  })
  
  // Non renderizza nulla - lavora solo sul materiale esistente
  return null
}
