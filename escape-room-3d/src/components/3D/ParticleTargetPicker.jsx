// ParticleTargetPicker.jsx
// Componente Canvas che attiva usePositionPicker per il Particle Editor

import { usePositionPicker } from '../../hooks/usePositionPicker'

/**
 * Componente che gestisce il picking della posizione target per il Particle Editor
 * Va montato DENTRO il Canvas (è un componente R3F)
 * 
 * @param {Object} particleEditor - Hook useParticleEditor con stato e handlers
 */
export default function ParticleTargetPicker({ particleEditor }) {
  // Hook per catturare posizione target quando in modalità 'target'
  usePositionPicker(
    particleEditor.selectingMode === 'target',
    (worldPos) => {
      console.log('[ParticleTargetPicker] 🎯 Target particelle picked:', worldPos)
      particleEditor.handleTargetSelected(worldPos)
    },
    () => {
      console.log('[ParticleTargetPicker] 🎯 Pick target particelle annullato')
      particleEditor.cancelSelecting()
    }
  )
  
  // Nessun rendering - solo logica di picking
  return null
}
