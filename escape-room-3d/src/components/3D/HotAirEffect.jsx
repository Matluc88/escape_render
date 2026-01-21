import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function HotAirEffect({ 
  enabled = false,
  layerCount = 4,             // Numero di layer sovrapposti
  distortionScale = 0.3,      // Intensità distorsione base
  risingSpeed = 0.12,         // Velocità salita base
  turbulence = 0.4,           // Oscillazione laterale
  layerSpacing = 0.08,        // Distanza tra layer
  debug = false            
}) {
  const groupRef = useRef()
  const layersRef = useRef([])
  const texturesRef = useRef([])
  const timeRef = useRef(0)

  // ============================================
  // COORDINATE (invariate)
  // ============================================
  const POSIZIONE = useMemo(
    () => new THREE.Vector3(-2.025, 1.86, 1.128),
    []
  )
  
  const ROTAZIONE = useMemo(
    () => new THREE.Euler(1.700, 1.6, -1.571),
    []
  )
  
  const SCALA_GENERALE = 0.4 
  const BASE_RADIUS = 0.25 

  // ============================================
  // CONFIGURAZIONE LAYER
  // Ogni layer ha parametri diversi per varietà
  // ============================================
  const layerConfigs = useMemo(() => {
    const configs = []
    for (let i = 0; i < layerCount; i++) {
      const t = i / Math.max(1, layerCount - 1) // 0 to 1
      configs.push({
        // Scala progressiva (più grande man mano che sale)
        scale: 0.7 + t * 0.5,
        
        // Velocità diverse per ogni layer
        speedY: risingSpeed * (0.8 + Math.random() * 0.4),
        speedX: (Math.random() - 0.5) * 0.02,
        
        // Frequenza oscillazione diversa
        oscFreq: 0.3 + Math.random() * 0.4,
        oscAmp: turbulence * (0.01 + Math.random() * 0.02),
        
        // Intensità distorsione (più debole ai bordi)
        distortion: distortionScale * (0.6 + (1 - t) * 0.6),
        
        // Offset iniziale random per desync
        offsetY: Math.random(),
        offsetX: Math.random(),
        
        // Opacità (layer centrali più visibili)
        opacity: 0.85 + Math.sin(t * Math.PI) * 0.15,
        
        // IOR leggermente diverso
        ior: 1.01 + Math.random() * 0.02
      })
    }
    return configs
  }, [layerCount, distortionScale, risingSpeed, turbulence])

  // ============================================
  // NOISE TEXTURES (una per layer, diverse)
  // ============================================
  const noiseTextures = useMemo(() => {
    const textures = []
    
    for (let layer = 0; layer < layerCount; layer++) {
      const size = 128
      const data = new Uint8Array(size * size * 4)
      
      // Seed diverso per ogni layer
      const seed = layer * 1000
      
      const hash = (x, y, s) => {
        const dot = x * 12.9898 + y * 78.233 + s
        return (Math.sin(dot) * 43758.5453) % 1
      }
      
      // Noise con frequenze diverse per layer
      const baseFreq = 3 + layer * 0.5
      
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const stride = (i * size + j) * 4
          
          let nx = 0, ny = 0
          let amp = 0.5, freq = baseFreq
          
          // 3 ottave
          for (let oct = 0; oct < 3; oct++) {
            const sx = j * freq / size
            const sy = i * freq / size
            
            nx += (hash(sx, sy, seed) - 0.5) * amp
            ny += (hash(sx, sy, seed + 50) - 0.5) * amp
            
            amp *= 0.5
            freq *= 2
          }
          
          // Normalizza a 0-255 con bias verso il centro (128)
          data[stride] = Math.floor((nx * 0.5 + 0.5) * 255)
          data[stride + 1] = Math.floor((ny * 0.5 + 0.5) * 255)
          data[stride + 2] = 128
          data[stride + 3] = 255
        }
      }
      
      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.magFilter = THREE.LinearFilter
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.generateMipmaps = true
      tex.needsUpdate = true
      
      textures.push(tex)
    }
    
    return textures
  }, [layerCount])

  // ============================================
  // GEOMETRIA DISCO (condivisa)
  // ============================================
  const discGeometry = useMemo(() => {
    return new THREE.CircleGeometry(BASE_RADIUS, 64)
  }, [])

  // ============================================
  // MATERIALI (uno per layer)
  // ============================================
  const layerMaterials = useMemo(() => {
    return layerConfigs.map((config, i) => {
      return new THREE.MeshPhysicalMaterial({
        // Trasparenza totale
        transmission: 1.0,
        transparent: true,
        opacity: config.opacity,
        
        // Rifrazione sottile
        ior: config.ior,
        thickness: 0.2,
        
        // Superficie
        roughness: 0.05,
        metalness: 0,
        
        // Normal map per distorsione
        normalMap: noiseTextures[i],
        normalScale: new THREE.Vector2(config.distortion, config.distortion),
        
        // Nessun colore/riflesso
        color: 0xffffff,
        clearcoat: 0,
        reflectivity: 0,
        envMapIntensity: 0,
        
        // Rendering
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true
      })
    })
  }, [layerConfigs, noiseTextures])

  // ============================================
  // SETUP LAYER
  // ============================================
  useEffect(() => {
    if (!enabled || !groupRef.current) return

    // Cleanup
    layersRef.current.forEach(layer => {
      if (groupRef.current) {
        groupRef.current.remove(layer)
      }
    })
    layersRef.current = []

    // Crea i layer
    layerConfigs.forEach((config, i) => {
      const mesh = new THREE.Mesh(discGeometry, layerMaterials[i])
      
      // Posizione Z progressiva
      mesh.position.set(0, 0, i * layerSpacing)
      
      // Scala
      mesh.scale.setScalar(config.scale)
      
      // Render order (layer più lontani prima)
      mesh.renderOrder = 100 + i
      
      // Salva config nel mesh
      mesh.userData = { 
        config, 
        index: i,
        texture: noiseTextures[i]
      }
      
      groupRef.current.add(mesh)
      layersRef.current.push(mesh)
    })

    // Salva riferimenti texture
    texturesRef.current = noiseTextures

    return () => {
      layersRef.current.forEach(layer => {
        if (groupRef.current) {
          groupRef.current.remove(layer)
        }
      })
      layersRef.current = []
    }
  }, [enabled, layerConfigs, layerMaterials, discGeometry, noiseTextures, layerSpacing])

  // ============================================
  // ANIMATION LOOP
  // ============================================
  useFrame((_, delta) => {
    if (!enabled || !groupRef.current) return

    groupRef.current.position.copy(POSIZIONE)
    groupRef.current.rotation.copy(ROTAZIONE)

    timeRef.current += delta

    // Anima ogni layer
    layersRef.current.forEach((mesh) => {
      const { config, texture } = mesh.userData
      const time = timeRef.current
      
      // Movimento texture (principale effetto)
      if (texture) {
        // Movimento Y (salita) - velocità diversa per layer
        texture.offset.y = (texture.offset.y - delta * config.speedY) % 1
        
        // Movimento X con oscillazione sinusoidale
        texture.offset.x = config.offsetX + 
          Math.sin(time * config.oscFreq) * config.oscAmp +
          time * config.speedX
      }
    })
  })

  // ============================================
  // CLEANUP
  // ============================================
  useEffect(() => {
    return () => {
      discGeometry.dispose()
      layerMaterials.forEach(mat => mat.dispose())
      // NO texture.dispose() - gestite dal GC
    }
  }, [discGeometry, layerMaterials])

  if (!enabled) return null

  return (
    <group 
      ref={groupRef} 
      name="HotAirEffectSystem" 
      scale={[SCALA_GENERALE, SCALA_GENERALE, SCALA_GENERALE]}
    >
      {debug && (
        <>
          <axesHelper args={[1.0]} />
          <mesh>
            <ringGeometry args={[BASE_RADIUS - 0.01, BASE_RADIUS, 32]} />
            <meshBasicMaterial color="cyan" wireframe />
          </mesh>
          {/* Mostra posizione layer */}
          {layerConfigs.map((_, i) => (
            <mesh key={i} position={[0, 0, i * layerSpacing]}>
              <ringGeometry args={[BASE_RADIUS * 0.1, BASE_RADIUS * 0.12, 16]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
