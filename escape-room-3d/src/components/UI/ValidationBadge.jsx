// ValidationBadge.jsx
// Badge validazione configurazione con dettagli espandibili

import { useState } from 'react'
import * as THREE from 'three'
import './ValidationBadge.css'

/**
 * Valida la configurazione dell'animazione
 */
function validateConfiguration(config, objectInfo) {
  if (!config || !objectInfo) {
    return { isValid: false, checks: {}, fixable: false }
  }

  const checks = {
    axis: {
      valid: config.mode === 'position' || ['x', 'y', 'z'].includes(config.axis),
      message: config.mode === 'position' ? 'Movimento traslazione' : `Asse ${config.axis?.toUpperCase()} corretto`,
      detail: config.mode === 'position' 
        ? 'Spostamento lineare dell\'oggetto'
        : `Rotazione su asse ${config.axis?.toUpperCase()}`,
      severity: 'info'
    }
  }

  if (config.mode === 'rotation') {
    // Valida cardine
    const bbox = objectInfo.boundingBox
    const pivotValid = 
      config.pivotX >= bbox.min.x - 0.5 && config.pivotX <= bbox.max.x + 0.5 &&
      config.pivotY >= bbox.min.y - 0.5 && config.pivotY <= bbox.max.y + 0.5 &&
      config.pivotZ >= bbox.min.z - 0.5 && config.pivotZ <= bbox.max.z + 0.5

    checks.pivot = {
      valid: pivotValid,
      message: pivotValid ? 'Cardine posizionato correttamente' : 'Cardine fuori bounding box',
      detail: pivotValid 
        ? `Posizione: X=${config.pivotX.toFixed(2)}m, Y=${config.pivotY.toFixed(2)}m, Z=${config.pivotZ.toFixed(2)}m`
        : `Cardine fuori dall'oggetto. Usa i preset "Bordo"`,
      severity: pivotValid ? 'success' : 'warning'
    }

    // Valida angolo
    const angleValid = config.angle >= 30 && config.angle <= 120
    checks.angle = {
      valid: angleValid,
      message: angleValid ? 'Angolo entro limiti meccanici' : 'Angolo fuori range realistico',
      detail: angleValid
        ? `${config.angle}° (range realistico: 30°-120°)`
        : `${config.angle}° (consigliato: 30°-120°)`,
      severity: angleValid ? 'success' : 'warning'
    }

    // Valida velocità
    const speedValid = config.speed >= 45 && config.speed <= 180
    checks.speed = {
      valid: speedValid,
      message: speedValid ? 'Velocità realistica' : 'Velocità fuori range',
      detail: speedValid
        ? `${config.speed}°/s (fluido e naturale)`
        : `${config.speed}°/s (consigliato: 45°-180°/s)`,
      severity: speedValid ? 'success' : 'info'
    }
  }

  const allValid = Object.values(checks).every(c => c.valid)
  const hasWarnings = Object.values(checks).some(c => !c.valid && c.severity === 'warning')

  return {
    isValid: allValid,
    hasWarnings: hasWarnings,
    checks,
    fixable: !allValid && checks.axis?.valid
  }
}

/**
 * Componente badge validazione
 */
export default function ValidationBadge({ config, objectInfo, onAutoFix }) {
  const [showDetails, setShowDetails] = useState(false)
  
  const validation = validateConfiguration(config, objectInfo)

  const handleClick = () => {
    console.log('[ValidationBadge] 🖱️ CLICK RILEVATO!')
    console.log('[ValidationBadge] showDetails prima:', showDetails)
    setShowDetails(true)
    console.log('[ValidationBadge] showDetails dopo setShowDetails(true)')
  }

  const handleClose = () => {
    setShowDetails(false)
  }

  const handleAutoFix = () => {
    if (onAutoFix && validation.fixable) {
      onAutoFix(validation.checks)
    }
    setShowDetails(false)
  }

  const badgeClass = validation.isValid 
    ? 'validation-badge validation-badge--valid'
    : validation.hasWarnings
    ? 'validation-badge validation-badge--warning'
    : 'validation-badge validation-badge--error'

  return (
    <>
      <div 
        className={badgeClass} 
        onClick={handleClick} 
        title="Click per dettagli"
        style={{ 
          pointerEvents: 'auto', 
          position: 'relative', 
          zIndex: 100,
          cursor: 'pointer'
        }}
      >
        {validation.isValid 
          ? '✓ Configurazione Realistica'
          : validation.hasWarnings
          ? '⚠️ Configurazione con Warning'
          : '❌ Configurazione Non Valida'}
        <span className="validation-badge__icon">ⓘ</span>
      </div>

      {showDetails && (
        <>
          {console.log('[ValidationBadge] 🎯 Rendering ValidationModal - showDetails è TRUE')}
          <ValidationModal
            validation={validation}
            onClose={handleClose}
            onAutoFix={validation.fixable ? handleAutoFix : null}
          />
        </>
      )}
    </>
  )
}

/**
 * Modal con dettagli validazione
 */
function ValidationModal({ validation, onClose, onAutoFix }) {
  return (
    <div className="validation-modal-overlay" onClick={onClose}>
      <div className="validation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="validation-modal__header">
          <h3>
            {validation.isValid 
              ? '✓ Configurazione Realistica'
              : validation.hasWarnings
              ? '⚠️ Configurazione con Warning'
              : '❌ Configurazione Non Valida'}
          </h3>
          <button className="validation-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="validation-modal__content">
          {Object.entries(validation.checks).map(([key, check]) => (
            <div 
              key={key}
              className={`validation-check validation-check--${check.severity}`}
            >
              <div className="validation-check__icon">
                {check.valid ? '✓' : check.severity === 'warning' ? '⚠️' : '❌'}
              </div>
              <div className="validation-check__content">
                <div className="validation-check__message">{check.message}</div>
                <div className="validation-check__detail">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="validation-modal__footer">
          {onAutoFix && (
            <button className="validation-modal__button validation-modal__button--primary" onClick={onAutoFix}>
              🔧 Correggi Automaticamente
            </button>
          )}
          <button className="validation-modal__button" onClick={onClose}>
            {onAutoFix ? 'Mantieni Comunque' : 'Chiudi'}
          </button>
        </div>
      </div>
    </div>
  )
}
