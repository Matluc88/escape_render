/**
 * HeatHazeEffect - Componente R3F per post-processing heat haze
 * 
 * Integra EffectComposer con ShaderPass per effetto distorsione aria calda.
 * L'effetto si attiva quando enabled=true (porta chiusa).
 * 
 * Props:
 * - enabled: boolean - Attiva/disattiva effetto
 * - strength: number - Intensità distorsione (default: 0.008)
 * - fadeTime: number - Tempo fade in/out in secondi (default: 0.5)
 */

import { useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame, extend } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import HeatHazeShader from '../../shaders/HeatHazeShader'

// Registra i componenti three per R3F
extend({ EffectComposer, RenderPass, ShaderPass })

export default function HeatHazeEffect({ 
  enabled = false, 
  strength = 0.008,
  fadeTime = 0.5,  // Fade smooth in/out
  heatTint = 0.03  // Tinta rossa riscaldamento (0.0-0.2)
}) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef()
  const shaderPassRef = useRef()
  const timeRef = useRef(0)
  const enabledValueRef = useRef(0) // Per interpolazione smooth

  // ============================================
  // SETUP EFFECT COMPOSER (solo una volta)
  // ============================================
  useEffect(() => {
    // Crea composer
    const composer = new EffectComposer(gl)
    composer.setSize(size.width, size.height)
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Max 2x per mobile
    
    // Pass 1: Renderizza scena normale
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    
    // Pass 2: Shader distorsione heat haze
    const shaderPass = new ShaderPass(HeatHazeShader)
    shaderPass.renderToScreen = true
    composer.addPass(shaderPass)
    
    composerRef.current = composer
    shaderPassRef.current = shaderPass
    
    console.log('[HeatHazeEffect] ✅ EffectComposer inizializzato')
    
    // Cleanup
    return () => {
      composer.dispose()
    }
  }, [gl, scene, camera, size.width, size.height])

  // ============================================
  // RESIZE HANDLER
  // ============================================
  useEffect(() => {
    const handleResize = () => {
      if (composerRef.current) {
        composerRef.current.setSize(size.width, size.height)
        composerRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [size])

  // ============================================
  // UPDATE UNIFORMS & RENDER (ogni frame)
  // ============================================
  useFrame((state, delta) => {
    if (!shaderPassRef.current || !composerRef.current) return
    
    const shader = shaderPassRef.current.uniforms
    
    // Update time per animazione
    timeRef.current += delta
    shader.time.value = timeRef.current
    
    // Update intensità effetto
    shader.heatStrength.value = strength
    
    // Update tinta rossa
    shader.heatTint.value = heatTint
    
    // ========================================
    // FADE IN/OUT SMOOTH
    // ========================================
    const targetEnabled = enabled ? 1.0 : 0.0
    const fadeSpeed = 1.0 / fadeTime
    
    // Interpola verso target
    if (enabledValueRef.current < targetEnabled) {
      enabledValueRef.current = Math.min(targetEnabled, enabledValueRef.current + delta * fadeSpeed)
    } else if (enabledValueRef.current > targetEnabled) {
      enabledValueRef.current = Math.max(targetEnabled, enabledValueRef.current - delta * fadeSpeed)
    }
    
    shader.enabled.value = enabledValueRef.current
    
    // Render con composer invece di renderer normale
    composerRef.current.render()
  }, 1) // Priority 1 per renderizzare dopo la scena

  // Log cambio stato
  useEffect(() => {
    console.log(`[HeatHazeEffect] 🌡️ Heat Haze ${enabled ? 'ATTIVATO' : 'DISATTIVATO'} (fade: ${fadeTime}s)`)
  }, [enabled, fadeTime])

  return null // Componente invisibile, solo effetto
}
