import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * SerraParticles - Sistema particellare cinematografico per serra
 * 
 * Features V2:
 * - Movimento sinusoidale 3D complesso (polline fluttuante)
 * - Particelle reagiscono al colore della luce (rosso/verde)
 * - Variazione dimensionale organica
 * - Glow volumetrico con soft edges
 * - Performance ottimizzate (frustum culling)
 * - 🆕 Auto-posizionamento sul MURO_SERRA nel modello
 */

const MURO_SERRA_UUID = 'BA166D41-384C-499E-809C-E932A5015BB4'

export default function SerraParticles({ 
  enabled = false, 
  position = [0, 0, 0],  // Fallback se MURO_SERRA non trovato
  count = 300,
  lightColor = new THREE.Color(0x00ff00),  // Colore luce per reattività
  lightState = 'active'  // 'locked' | 'active' | 'solved'
}) {
  const pointsRef = useRef()
  const timeRef = useRef(0)
  const { scene } = useThree()
  const muroSerraRef = useRef(null)
  const isAttachedRef = useRef(false)
  
  // 🔍 Trova il MURO_SERRA e vincola le particelle come child
  useEffect(() => {
    if (!scene) return
    
    const findAndAttachToMuroSerra = () => {
      let muroObj = null
      scene.traverse((obj) => {
        if (obj.name && obj.name.includes(MURO_SERRA_UUID)) {
          muroObj = obj
        }
      })
      
      if (muroObj) {
        muroSerraRef.current = muroObj
        console.log(`[SerraParticles] 🌿 MURO_SERRA trovato: ${muroObj.name}`)
        
        // 📍 LOG COORDINATE WORLD DEL MURO_SERRA
        const worldPos = new THREE.Vector3()
        muroObj.getWorldPosition(worldPos)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[SerraParticles] 📍 COORDINATE MURO_SERRA:')
        console.log(`  World Position: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`)
        console.log(`  Local Position: (${muroObj.position.x.toFixed(3)}, ${muroObj.position.y.toFixed(3)}, ${muroObj.position.z.toFixed(3)})`)
        console.log(`  Rotation: (${muroObj.rotation.x.toFixed(3)}, ${muroObj.rotation.y.toFixed(3)}, ${muroObj.rotation.z.toFixed(3)})`)
        console.log(`  Scale: (${muroObj.scale.x.toFixed(3)}, ${muroObj.scale.y.toFixed(3)}, ${muroObj.scale.z.toFixed(3)})`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // Se le particelle esistono già, attaccale subito
        if (pointsRef.current && !isAttachedRef.current) {
          muroObj.add(pointsRef.current)
          pointsRef.current.position.set(0, 0, 0) // Posizione locale rispetto al parent
          isAttachedRef.current = true
          console.log('[SerraParticles] ✅ Particelle vincolate come child di MURO_SERRA')
        }
      } else {
        console.warn('[SerraParticles] ⚠️ MURO_SERRA non trovato, uso posizione fallback')
      }
    }
    
    // Ritardo per dare tempo al modello di caricare
    const timeout = setTimeout(findAndAttachToMuroSerra, 100)
    return () => {
      // Cleanup: rimuovi le particelle dal parent se necessario
      if (pointsRef.current && isAttachedRef.current && muroSerraRef.current) {
        muroSerraRef.current.remove(pointsRef.current)
        isAttachedRef.current = false
      }
      clearTimeout(timeout)
    }
  }, [scene])
  
  // 🔗 Attacca le particelle al MURO_SERRA quando vengono create
  useEffect(() => {
    if (pointsRef.current && muroSerraRef.current && !isAttachedRef.current) {
      muroSerraRef.current.add(pointsRef.current)
      pointsRef.current.position.set(0, 0, 0) // Posizione locale rispetto al parent
      isAttachedRef.current = true
      console.log('[SerraParticles] ✅ Particelle vincolate come child di MURO_SERRA (delayed attach)')
    }
  }, [pointsRef.current, muroSerraRef.current])

  // Vertex Shader - Movimento sinusoidale 3D avanzato
  const vertexShader = `
    uniform float uTime;
    uniform float uSize;
    uniform float uIntensity;
    attribute float aScale;
    attribute vec3 aRandomness;
    attribute float aPhaseOffset;
    
    varying float vAlpha;
    varying float vDistance;
    varying vec3 vPosition;
    
    void main() {
      vec3 pos = position;
      
      // ✨ MOVIMENTO MAGICO - Veloce e scintillante (NON fumo!)
      float phase = uTime + aPhaseOffset;
      
      // Y - Danza verticale rapida (scintillio magico)
      float waveY = sin(phase * 2.5 + aRandomness.x * 6.28) * 0.15;
      waveY += sin(phase * 4.0 + aRandomness.x * 3.14) * 0.08; // Scintillii rapidi
      pos.y += waveY;
      
      // X - Movimento orizzontale vivace
      float waveX = sin(phase * 2.0 + aRandomness.y * 6.28) * 0.12;
      waveX += cos(phase * 3.5 + aRandomness.y * 2.0) * 0.06;
      pos.x += waveX;
      
      // Z - Spirale compatta e veloce
      float waveZ = cos(phase * 2.2 + aRandomness.z * 6.28) * 0.12;
      waveZ += sin(phase * 3.8 + aRandomness.z * 4.0) * 0.06;
      pos.z += waveZ;
      
      // Rotazione rapida per effetto "vorticoso magico"
      float angle = phase * 0.8 + aRandomness.x * 6.28;
      float radius = length(pos.xz);
      pos.x = pos.x * cos(angle * 0.3) - pos.z * sin(angle * 0.3);
      pos.z = pos.x * sin(angle * 0.3) + pos.z * cos(angle * 0.3);
      
      // Trasformazione MVP
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Dimensione variabile - più grandi vicino alla sorgente
      float distFromCenter = length(pos);
      float sizeFactor = 1.0 - smoothstep(0.0, 5.0, distFromCenter);
      gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z) * (0.7 + sizeFactor * 0.6);
      
      // Alpha fadeout basato su altezza e distanza
      vAlpha = smoothstep(-1.0, 3.0, pos.y) * smoothstep(6.0, 2.0, distFromCenter);
      vDistance = distFromCenter;
      vPosition = pos;
    }
  `

  // Fragment Shader - Glow cinematografico con soft edges
  const fragmentShader = `
    uniform vec3 uColor;
    uniform vec3 uSecondaryColor;
    uniform float uColorMix;
    varying float vAlpha;
    varying float vDistance;
    varying vec3 vPosition;
    
    void main() {
      // Distanza radiale dal centro particella
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      // Glow multi-layer per softness
      float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow2 = 1.0 - smoothstep(0.0, 0.3, dist);
      float glowCore = 1.0 - smoothstep(0.0, 0.15, dist);
      
      // Combina layers per glow volumetrico
      float strength = pow(glow1, 1.5) * 0.4 + pow(glow2, 2.0) * 0.4 + pow(glowCore, 3.0) * 0.2;
      
      // Mix colori dinamico (primario/secondario)
      vec3 color = mix(uColor, uSecondaryColor, uColorMix * 0.5);
      
      // Variazione colore basata su distanza (più caldo vicino)
      float warmth = smoothstep(4.0, 0.0, vDistance);
      color = mix(color, uSecondaryColor, warmth * 0.3);
      
      // Alpha finale con soft edges
      float alpha = strength * vAlpha * 0.7;
      
      // Discard early per performance
      if (alpha < 0.02) discard;
      
      gl_FragColor = vec4(color, alpha);
    }
  `


  // Palette colori per stati
  const colorPalettes = useMemo(() => ({
    locked: {
      primary: new THREE.Color(0xff0000),    // Rosso
      secondary: new THREE.Color(0xff6600),  // Arancione
    },
    active: {
      primary: new THREE.Color(0x00ff00),    // Verde acido
      secondary: new THREE.Color(0x7fff00),  // Lime
    },
    solved: {
      primary: new THREE.Color(0x00ff88),    // Verde luminoso
      secondary: new THREE.Color(0x88ffaa),  // Verde chiaro
    }
  }), [])

  // Geometry e attributi delle particelle
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    
    // Attributi particelle
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const randomness = new Float32Array(count * 3)
    const phaseOffsets = new Float32Array(count)  // Nuovo: offset temporale unico
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // ✨ DISTRIBUZIONE MAGICA: Concentrata intorno al neon (0.8m raggio)
      // Forma sferica compatta per effetto "alone magico"
      const angle = Math.random() * Math.PI * 2
      const radius = Math.pow(Math.random(), 1.2) * 0.8  // 🔥 Molto concentrato!
      
      positions[i3 + 0] = Math.cos(angle) * radius
      positions[i3 + 1] = Math.random() * 1.5 - 0.3      // Y: -0.3 a +1.2 (contenuto)
      positions[i3 + 2] = Math.sin(angle) * radius
      
      // ✨ Scala più variabile per scintillii magici
      scales[i] = Math.pow(Math.random(), 0.8) * 0.8 + 0.5  // 0.5 a 1.3, più grandi!
      
      // Randomness per movimento unico
      randomness[i3 + 0] = Math.random()
      randomness[i3 + 1] = Math.random()
      randomness[i3 + 2] = Math.random()
      
      // Phase offset per evitare sincronizzazione
      phaseOffsets[i] = Math.random() * Math.PI * 2
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geo.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3))
    geo.setAttribute('aPhaseOffset', new THREE.BufferAttribute(phaseOffsets, 1))
    
    // Shader Material con uniforms completi
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 60.0 },         // Dimensione base ridotta (polline)
        uIntensity: { value: 1.0 },     // Intensità generale
        uColor: { value: colorPalettes.active.primary },
        uSecondaryColor: { value: colorPalettes.active.secondary },
        uColorMix: { value: 0.5 }       // Mix tra colori
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    
    return { geometry: geo, material: mat }
  }, [count, vertexShader, fragmentShader])

  // Animazione - aggiorna uniforms e reattività
  useFrame((state, delta) => {
    if (!enabled || !pointsRef.current) return
    
    timeRef.current += delta
    const palette = colorPalettes[lightState]
    
    // Aggiorna tempo
    material.uniforms.uTime.value = timeRef.current
    
    // Aggiorna colori in base allo stato luce (transizione smooth)
    material.uniforms.uColor.value.lerp(palette.primary, 0.05)
    material.uniforms.uSecondaryColor.value.lerp(palette.secondary, 0.05)
    
    // Oscillazione color mix per varietà
    material.uniforms.uColorMix.value = (Math.sin(timeRef.current * 0.5) + 1) / 2
    
    // Intensità varia con lo stato
    const targetIntensity = lightState === 'solved' ? 1.2 : lightState === 'locked' ? 0.6 : 1.0
    const currentIntensity = material.uniforms.uIntensity.value
    material.uniforms.uIntensity.value += (targetIntensity - currentIntensity) * 0.03
  })


  // Non renderizzare se disabilitato
  if (!enabled) return null

  return (
    <points 
      ref={pointsRef} 
      position={position}  // Fallback position se non attaccato al parent
      geometry={geometry} 
      material={material} 
    />
  )
}
