import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * BathroomLights - Sistema di illuminazione bagno (2 lampade)
 * 
 * Features:
 * - Trova automaticamente 2 lampade tramite UUID
 * - Effetto pulsante smooth del materiale emissive (cyan)
 * - PointLight vera che illumina l'ambiente
 * - Retry logic per garantire il caricamento
 * 
 * Props:
 * - enabled: true/false per accendere/spegnere
 */
export default function BathroomLights({ enabled = false }) {
  const { scene } = useThree()
  
  // Refs per le 2 lampade
  const lamp1Ref = useRef(null)
  const lamp2Ref = useRef(null)
  
  // Refs per i 2 LED (bulbi luminosi)
  const led1Ref = useRef(null)
  const led2Ref = useRef(null)
  
  // Refs per le PointLight
  const light1Ref = useRef(null)
  const light2Ref = useRef(null)
  const ledLight1Ref = useRef(null)
  const ledLight2Ref = useRef(null)
  
  const timeRef = useRef(0)
  const searchingRef = useRef(true)
  const searchStartTimeRef = useRef(Date.now())
  const SEARCH_TIMEOUT = 10000 // 10 secondi timeout
  
  // UUID delle 2 lampade bagno (senza trattini come nel modello)
  const LAMP1_UUID = 'B80289818259434883 04FD6E0AC8327E' // LAMPADA BAGNO 1
  const LAMP2_UUID = '5C1DD3E5AC7144F3B048F1D286AB873C' // LAMPADA BAGNO 2
  
  // 🔄 RETRY LOGIC: Cerca i mesh continuamente finché non li trova
  useFrame(() => {
    // Se già trovati entrambi, skip
    if ((lamp1Ref.current && lamp2Ref.current) || !searchingRef.current) return
    
    // Check timeout
    const elapsed = Date.now() - searchStartTimeRef.current
    if (elapsed > SEARCH_TIMEOUT) {
      console.error('[BathroomLights] ⏱️ Timeout ricerca lampade dopo 10 secondi')
      console.error('[BathroomLights] 🔍 Lampada 1 trovata:', !!lamp1Ref.current)
      console.error('[BathroomLights] 🔍 Lampada 2 trovata:', !!lamp2Ref.current)
      searchingRef.current = false
      return
    }
    
    // Log ogni 2 secondi durante la ricerca
    if (elapsed % 2000 < 16) {
      console.log('[BathroomLights] 🔍 Ricerca lampade... (', (elapsed/1000).toFixed(1), 's)')
    }
    
    // Cerca i mesh
    let lamp1 = lamp1Ref.current
    let lamp2 = lamp2Ref.current
    
    scene.traverse((child) => {
      // Cerca lampada 1 (per UUID o nome completo)
      if (!lamp1) {
        if (child.uuid === LAMP1_UUID || 
            child.name === 'LAMPADA_BAGNO_1(B8028981-8259-4348-8304-FD6E0AC8327E)') {
          lamp1 = child
          console.log('[BathroomLights] 🔍 Candidato lampada 1:', child.name, 'UUID:', child.uuid)
        }
      }
      // Cerca lampada 2 (per UUID o nome completo)
      if (!lamp2) {
        if (child.uuid === LAMP2_UUID || 
            child.name === 'LAMPADA_BAGNO_2(5C1DD3E5-AC71-44F3-B048-F1D286AB873C)') {
          lamp2 = child
          console.log('[BathroomLights] 🔍 Candidato lampada 2:', child.name, 'UUID:', child.uuid)
        }
      }
      
      // 💡 Cerca LED LAMPADA BAGNO 1
      if (!led1Ref.current) {
        if (child.name === 'LED_LAMPADA_BAGNO_1(99425926-FB55-4377-8C8D-BA170F85DD7D)') {
          led1Ref.current = child
          console.log('[BathroomLights] 💡 LED 1 trovato:', child.name)
        }
      }
      
      // 💡 Cerca LED LAMPADA BAGNO 2
      if (!led2Ref.current) {
        if (child.name === 'LED_LAMPADA_BAGNO_2(0F50418E-EA43-4A39-B616-FD58F33859F0)') {
          led2Ref.current = child
          console.log('[BathroomLights] 💡 LED 2 trovato:', child.name)
        }
      }
    })
    
    // Se trovata lampada 1, configura
    if (lamp1 && lamp1.isMesh && lamp1.material && !lamp1Ref.current) {
      console.log('[BathroomLights] ✅ LAMPADA 1 trovata:', lamp1.name, '(dopo', elapsed, 'ms)')
      lamp1Ref.current = lamp1
      
      // Log posizione
      const worldPos = new THREE.Vector3()
      lamp1.getWorldPosition(worldPos)
      console.log('[BathroomLights] 📍 Lampada 1 posizione:', {
        x: worldPos.x.toFixed(3),
        y: worldPos.y.toFixed(3),
        z: worldPos.z.toFixed(3)
      })
      
      // Imposta stato iniziale (spento)
      if (!enabled) {
        lamp1.material.emissive = new THREE.Color(0x202020)
        lamp1.material.emissiveIntensity = 0
      }
    }
    
    // Se trovata lampada 2, configura
    if (lamp2 && lamp2.isMesh && lamp2.material && !lamp2Ref.current) {
      console.log('[BathroomLights] ✅ LAMPADA 2 trovata:', lamp2.name, '(dopo', elapsed, 'ms)')
      lamp2Ref.current = lamp2
      
      // Log posizione
      const worldPos = new THREE.Vector3()
      lamp2.getWorldPosition(worldPos)
      console.log('[BathroomLights] 📍 Lampada 2 posizione:', {
        x: worldPos.x.toFixed(3),
        y: worldPos.y.toFixed(3),
        z: worldPos.z.toFixed(3)
      })
      
      // Imposta stato iniziale (spento)
      if (!enabled) {
        lamp2.material.emissive = new THREE.Color(0x202020)
        lamp2.material.emissiveIntensity = 0
      }
    }
    
    // Se trovate entrambe, stop search
    if (lamp1Ref.current && lamp2Ref.current) {
      searchingRef.current = false
      console.log('[BathroomLights] ✅ Entrambe le lampade trovate e configurate!')
    }
  })
  
  // Animazione pulsante per materiali emissive (VARIATA - meno monotona!)
  useFrame((_, delta) => {
    timeRef.current += delta
    
    // Lampada 1 (Cyan - pulsazione LENTA e AMPIA)
    if (lamp1Ref.current && lamp1Ref.current.material) {
      const material = lamp1Ref.current.material
      
      if (enabled) {
        // Pulsazione lenta + onda secondaria per variazione
        const primaryPulse = Math.sin(timeRef.current * 0.8 * Math.PI) // Lenta
        const secondaryPulse = Math.sin(timeRef.current * 2.3 * Math.PI) * 0.2 // Onda veloce sottile
        const combined = primaryPulse + secondaryPulse
        
        const minIntensity = 0.8
        const maxIntensity = 2.2
        const intensity = minIntensity + ((combined + 1.2) / 2.4) * (maxIntensity - minIntensity)
        
        material.emissive = new THREE.Color(0x00FFFF) // Cyan
        material.emissiveIntensity = Math.max(0.8, Math.min(2.2, intensity))
      } else {
        material.emissive = new THREE.Color(0x202020)
        material.emissiveIntensity = 0
      }
    }
    
    // Lampada 2 (Cyan - pulsazione VELOCE e SOTTILE)  
    if (lamp2Ref.current && lamp2Ref.current.material) {
      const material = lamp2Ref.current.material
      
      if (enabled) {
        // Pulsazione veloce + offset di fase per asincronia
        const primaryPulse = Math.sin((timeRef.current + 0.5) * 1.8 * Math.PI) // Veloce + sfasata
        const secondaryPulse = Math.sin(timeRef.current * 0.7 * Math.PI) * 0.15 // Onda lenta sottile
        const combined = primaryPulse + secondaryPulse
        
        const minIntensity = 1.0
        const maxIntensity = 2.0
        const intensity = minIntensity + ((combined + 1.15) / 2.3) * (maxIntensity - minIntensity)
        
        material.emissive = new THREE.Color(0x00FFFF)
        material.emissiveIntensity = Math.max(1.0, Math.min(2.0, intensity))
      } else {
        material.emissive = new THREE.Color(0x202020)
        material.emissiveIntensity = 0
      }
    }
    
    // 💡 LED 1 (Arancione caldo INTENSA - luce incandescente)
    if (led1Ref.current && led1Ref.current.material) {
      const material = led1Ref.current.material
      
      if (enabled) {
        // Intensità ALTA e COSTANTE (no pulsazione)
        material.emissive = new THREE.Color(0xFF6600) // Arancione caldo
        material.emissiveIntensity = 5.0 // MOLTO INTENSA!
      } else {
        material.emissive = new THREE.Color(0x101010)
        material.emissiveIntensity = 0
      }
    }
    
    // 💡 LED 2 (Arancione caldo INTENSA)
    if (led2Ref.current && led2Ref.current.material) {
      const material = led2Ref.current.material
      
      if (enabled) {
        material.emissive = new THREE.Color(0xFF6600) // Arancione caldo
        material.emissiveIntensity = 5.0 // MOLTO INTENSA!
      } else {
        material.emissive = new THREE.Color(0x101010)
        material.emissiveIntensity = 0
      }
    }
  })
  
  // Calcola posizioni per PointLight (sincronizzate con le lampade)
  const lamp1Position = lamp1Ref.current ? 
    (() => {
      const pos = new THREE.Vector3()
      lamp1Ref.current.getWorldPosition(pos)
      return [pos.x, pos.y, pos.z]
    })() 
    : [0, 0, 0]
  
  const lamp2Position = lamp2Ref.current ? 
    (() => {
      const pos = new THREE.Vector3()
      lamp2Ref.current.getWorldPosition(pos)
      return [pos.x, pos.y, pos.z]
    })() 
    : [0, 0, 0]
  
  // Animazione intensità PointLight (sincronizzata con pulsazione)
  useFrame(() => {
    if (!enabled) {
      // Spente
      if (light1Ref.current) light1Ref.current.intensity = 0
      if (light2Ref.current) light2Ref.current.intensity = 0
      return
    }
    
    // Accese: pulsazione sincronizzata
    const pulseSpeed = 1.5
    const pulsePhase = Math.sin(timeRef.current * pulseSpeed * Math.PI)
    
    // Intensità per PointLight (più bassa del materiale)
    const minIntensity = 0.5
    const maxIntensity = 1.5
    const intensity = minIntensity + ((pulsePhase + 1) / 2) * (maxIntensity - minIntensity)
    
    if (light1Ref.current) light1Ref.current.intensity = intensity
    if (light2Ref.current) light2Ref.current.intensity = intensity
  })
  
  // Calcola posizioni LED
  const led1Position = led1Ref.current ? 
    (() => {
      const pos = new THREE.Vector3()
      led1Ref.current.getWorldPosition(pos)
      return [pos.x, pos.y, pos.z]
    })() 
    : [0, 0, 0]
  
  const led2Position = led2Ref.current ? 
    (() => {
      const pos = new THREE.Vector3()
      led2Ref.current.getWorldPosition(pos)
      return [pos.x, pos.y, pos.z]
    })() 
    : [0, 0, 0]
  
  // Renderizza 4 PointLight (2 lampade cyan + 2 LED arancioni)
  return (
    <group>
      {/* PointLight Lampada 1 - Cyan */}
      {lamp1Ref.current && (
        <pointLight
          ref={light1Ref}
          position={lamp1Position}
          color={0x00FFFF}
          intensity={enabled ? 1.0 : 0}
          distance={4}
          decay={2}
          castShadow={false}
        />
      )}
      
      {/* PointLight Lampada 2 - Cyan */}
      {lamp2Ref.current && (
        <pointLight
          ref={light2Ref}
          position={lamp2Position}
          color={0x00FFFF}
          intensity={enabled ? 1.0 : 0}
          distance={4}
          decay={2}
          castShadow={false}
        />
      )}
      
      {/* 💡 PointLight LED 1 - Arancione CALDO E INTENSA */}
      {led1Ref.current && (
        <pointLight
          ref={ledLight1Ref}
          position={led1Position}
          color={0xFF6600} // Arancione caldo
          intensity={enabled ? 3.0 : 0} // MOLTO INTENSA!
          distance={6} // Illumina fino a 6 metri
          decay={1.5} // Attenuazione più dolce
          castShadow={false}
        />
      )}
      
      {/* 💡 PointLight LED 2 - Arancione CALDO E INTENSA */}
      {led2Ref.current && (
        <pointLight
          ref={ledLight2Ref}
          position={led2Position}
          color={0xFF6600}
          intensity={enabled ? 3.0 : 0}
          distance={6}
          decay={1.5}
          castShadow={false}
        />
      )}
    </group>
  )
}
