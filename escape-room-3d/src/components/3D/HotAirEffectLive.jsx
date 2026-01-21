// HotAirEffectLive.jsx
// Wrapper di HotAirEffect con update parametri dal ParticleEditor

import { useMemo } from 'react'
import HotAirEffect from './HotAirEffect'

/**
 * HotAirEffectLive - Versione di HotAirEffect collegata al ParticleEditor
 * Mappa i parametri del ParticleEditor ai parametri dei layer animati
 * 
 * @param {Object} config - Configurazione dal ParticleEditor
 * @param {Object} sourceObject - Oggetto sorgente (non più usato con coordinate fisse)
 * @param {THREE.Vector3} targetPosition - Posizione target (non più usato)
 */
export default function HotAirEffectLive({ 
  config = {}, 
  sourceObject = null,
  targetPosition = null 
}) {
  // ✅ Mappa particleCount a layerCount (ridimensionato 100-1000 → 2-8)
  const layerCount = useMemo(() => {
    const count = config.particleCount || 500
    // Scala da 100-1000 a 2-8 layer
    return Math.max(2, Math.min(8, Math.floor(count / 125)))
  }, [config.particleCount])
  
  // ✅ Calcola layerSpacing da particleSize (più grandi = più spaziati)
  const layerSpacing = useMemo(() => {
    const size = config.particleSize || 50
    // Scala da 50-500 a 0.05-0.15
    return 0.05 + (size / 500) * 0.10
  }, [config.particleSize])
  
  // Se non abilitato, non renderizzare
  if (!config.enabled) {
    return null
  }
  
  return (
    <HotAirEffect
      enabled={config.enabled}
      layerCount={layerCount}                           // Calcolato da particleCount
      distortionScale={config.distortionIntensity || 0.3}
      risingSpeed={config.speed || 0.12}
      turbulence={config.turbulence || 0.4}
      layerSpacing={layerSpacing}                       // Calcolato da particleSize
      debug={false}
    />
  )
}
