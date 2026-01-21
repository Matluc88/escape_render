import React from 'react'
import './Crosshair.css'

/**
 * Crosshair component - Fixed center screen reticle
 * Provides visual feedback of where the player is aiming
 * @param {Object} props
 * @param {boolean} props.active - Whether an interactive object is targeted (changes color to green)
 */
function Crosshair({ active = false }) {
  return (
    <div className={`crosshair ${active ? 'crosshair-active' : ''}`}>
      <svg viewBox="0 0 50 50" width="45" height="45">
        {/* Simple large circle - friendly and educational */}
        <circle
          cx="25"
          cy="25"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        
        {/* Center dot */}
        <circle
          cx="25"
          cy="25"
          r="2.5"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

export default Crosshair
