import { useState, useEffect } from 'react'

/**
 * CollisionDebugOverlay - Overlay per debug collisioni in tempo reale
 * Mostra informazioni su oggetti colpiti durante il movimento
 */
export default function CollisionDebugOverlay({ collisionData, isEnabled }) {
  const [visible, setVisible] = useState(false)
  const [fadeTimeout, setFadeTimeout] = useState(null)

  useEffect(() => {
    if (!isEnabled) {
      setVisible(false)
      return
    }

    if (collisionData) {
      setVisible(true)
      
      // Reset fade timeout
      if (fadeTimeout) {
        clearTimeout(fadeTimeout)
      }
      
      // Auto-hide dopo 3 secondi senza nuove collisioni
      const timeout = setTimeout(() => {
        setVisible(false)
      }, 3000)
      
      setFadeTimeout(timeout)
      
      return () => {
        if (timeout) clearTimeout(timeout)
      }
    }
  }, [collisionData, isEnabled])

  if (!visible || !collisionData) {
    return null
  }

  // Calcola colore in base alla distanza
  const getColorByDistance = (distance) => {
    if (distance < 0.10) return '#ff3333' // Rosso critico: < 10cm
    if (distance < 0.20) return '#ffaa00' // Giallo warning: 10-20cm
    return '#44ff44' // Verde safe: > 20cm
  }

  // Calcola direzione cardinale
  const getCardinalDirection = (angle) => {
    if (angle === undefined || angle === null) return 'N/A'
    
    // Converti radianti in gradi e normalizza
    const degrees = ((angle * 180 / Math.PI) + 360) % 360
    
    if (degrees >= 337.5 || degrees < 22.5) return 'Nord ↑'
    if (degrees >= 22.5 && degrees < 67.5) return 'Nord-Est ↗'
    if (degrees >= 67.5 && degrees < 112.5) return 'Est →'
    if (degrees >= 112.5 && degrees < 157.5) return 'Sud-Est ↘'
    if (degrees >= 157.5 && degrees < 202.5) return 'Sud ↓'
    if (degrees >= 202.5 && degrees < 247.5) return 'Sud-Ovest ↙'
    if (degrees >= 247.5 && degrees < 292.5) return 'Ovest ←'
    return 'Nord-Ovest ↖'
  }

  const distance = collisionData.distance || 0
  const distanceColor = getColorByDistance(distance)
  const distanceCm = (distance * 100).toFixed(0)
  const distanceM = distance.toFixed(2)
  const penetration = collisionData.penetration || 0
  const isPenetrating = penetration > 0

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: '15px 20px',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '13px',
      lineHeight: '1.8',
      zIndex: 10000,
      minWidth: '300px',
      border: `3px solid ${distanceColor}`,
      boxShadow: `0 0 20px ${distanceColor}`,
      animation: 'slideIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '12px', 
        fontSize: '14px',
        color: distanceColor,
        borderBottom: `2px solid ${distanceColor}`,
        paddingBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🚧</span>
        <span>COLLISION DEBUG</span>
      </div>
      
      {/* Nome oggetto */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#aaa' }}>Oggetto:</span>{' '}
        <span style={{ color: '#00ffff', fontWeight: 'bold' }}>
          {collisionData.objectName || 'Sconosciuto'}
        </span>
      </div>
      
      {/* Distanza */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#aaa' }}>Distanza:</span>{' '}
        <span style={{ color: distanceColor, fontWeight: 'bold' }}>
          {distanceM}m ({distanceCm}cm)
        </span>
      </div>
      
      {/* Direzione */}
      {collisionData.angle !== undefined && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#aaa' }}>Direzione:</span>{' '}
          <span style={{ color: '#ffff00' }}>
            {getCardinalDirection(collisionData.angle)}
          </span>
        </div>
      )}
      
      {/* Tipo collisione */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#aaa' }}>Tipo:</span>{' '}
        <span style={{ color: '#ff88ff' }}>
          {collisionData.type || 'Sphere-Cast'}
        </span>
      </div>
      
      {/* Penetrazione (se presente) */}
      {isPenetrating && (
        <div style={{ 
          marginTop: '12px',
          padding: '8px 10px',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          borderRadius: '4px',
          border: '2px solid #ff3333',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <div style={{ color: '#ff3333', fontWeight: 'bold' }}>
              PENETRAZIONE CRITICA
            </div>
            <div style={{ color: '#ffaaaa', fontSize: '12px' }}>
              {(penetration * 100).toFixed(1)}cm dentro l'oggetto
            </div>
          </div>
        </div>
      )}
      
      {/* Info toggle */}
      <div style={{ 
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid #555',
        fontSize: '11px',
        color: '#888',
        textAlign: 'center'
      }}>
        Premi <kbd style={{ 
          padding: '2px 6px', 
          backgroundColor: '#333', 
          borderRadius: '3px',
          color: '#fff'
        }}>C</kbd> per nascondere
      </div>
    </div>
  )
}
