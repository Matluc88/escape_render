import { useEffect, useState, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Componente INTERNO (dentro Canvas) che legge posizione/rotazione/velocità
 * e le passa al componente esterno tramite callback
 */
export function LivePositionReader({ onUpdate }) {
  const { camera } = useThree()
  const [yawPivotRef, setYawPivotRef] = useState(null)
  
  // Refs per calcolare la velocità
  const previousPositionRef = useRef(null)
  const previousTimeRef = useRef(null)

  useEffect(() => {
    let node = camera
    while (node) {
      if (node.name === 'YawPivot') {
        setYawPivotRef(node)
        break
      }
      node = node.parent
    }
  }, [camera])

  // Aggiorna le info ogni frame
  useFrame((state) => {
    const position = new THREE.Vector3()
    
    // Cerca PlayerRoot per posizione piedi
    let node = camera
    let playerRoot = null
    while (node) {
      if (node.name === 'PlayerRoot') {
        playerRoot = node
        break
      }
      node = node.parent
    }

    if (playerRoot) {
      playerRoot.getWorldPosition(position)
    } else {
      camera.getWorldPosition(position)
    }

    // Ottieni yaw
    let yaw = 0
    if (yawPivotRef) {
      yaw = yawPivotRef.rotation.y
    } else {
      // Fallback: calcola da direzione camera
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      yaw = Math.atan2(direction.x, direction.z)
    }

    // Calcola velocità
    let velocity = { x: 0, y: 0, z: 0 }
    let speed = {
      horizontal: 0,
      vertical: 0,
      total: 0
    }

    const currentTime = state.clock.getElapsedTime()

    if (previousPositionRef.current && previousTimeRef.current) {
      const deltaTime = currentTime - previousTimeRef.current
      
      if (deltaTime > 0) {
        // Calcola velocità vettoriale (unità/secondo)
        velocity.x = (position.x - previousPositionRef.current.x) / deltaTime
        velocity.y = (position.y - previousPositionRef.current.y) / deltaTime
        velocity.z = (position.z - previousPositionRef.current.z) / deltaTime

        // Calcola velocità scalari
        speed.horizontal = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
        speed.vertical = Math.abs(velocity.y)
        speed.total = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z)
      }
    }

    // Aggiorna riferimenti per il prossimo frame
    previousPositionRef.current = position.clone()
    previousTimeRef.current = currentTime

    onUpdate({
      position: {
        x: parseFloat(position.x.toFixed(2)),
        y: parseFloat(position.y.toFixed(2)),
        z: parseFloat(position.z.toFixed(2))
      },
      yaw: parseFloat(yaw.toFixed(4)),
      yawDegrees: parseFloat((yaw * 180 / Math.PI).toFixed(2)),
      velocity: {
        x: parseFloat(velocity.x.toFixed(3)),
        y: parseFloat(velocity.y.toFixed(3)),
        z: parseFloat(velocity.z.toFixed(3))
      },
      speed: {
        horizontal: parseFloat(speed.horizontal.toFixed(2)),
        vertical: parseFloat(speed.vertical.toFixed(2)),
        total: parseFloat(speed.total.toFixed(2))
      }
    })
  })

  return null // Non renderizza nulla, solo legge e invia dati
}

/**
 * Componente ESTERNO (fuori Canvas) che mostra i dati
 */
export default function LivePositionDebug({ debugInfo }) {
  if (!debugInfo) {
    return null // Non mostrare nulla finché non ci sono dati
  }

  // Funzione per determinare il colore in base alla velocità
  const getSpeedColor = (speed) => {
    if (speed < 0.1) return '#00ff00' // Verde: fermo
    if (speed < 1.0) return '#ffff00' // Giallo: lento
    if (speed < 3.0) return '#ff9900' // Arancione: medio
    return '#ff0000' // Rosso: veloce
  }

  const hasSpeed = debugInfo.speed !== undefined

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#00ff00',
      padding: '12px 16px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '13px',
      zIndex: 10000,
      border: '2px solid #00ff00',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
      minWidth: '280px'
    }}>
      <div style={{ 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: 'bold',
        borderBottom: '1px solid #00ff00',
        paddingBottom: '6px'
      }}>
        📍 POSITION & ROTATION & SPEED
      </div>
      
      <div style={{ lineHeight: '1.6' }}>
        <div style={{ color: '#00ddff' }}>
          <strong>Position:</strong>
        </div>
        <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
          X: <span style={{ color: '#ffff00' }}>{debugInfo.position.x}</span><br />
          Y: <span style={{ color: '#ffff00' }}>{debugInfo.position.y}</span><br />
          Z: <span style={{ color: '#ffff00' }}>{debugInfo.position.z}</span>
        </div>
        
        <div style={{ color: '#ff00ff' }}>
          <strong>Rotation (Yaw):</strong>
        </div>
        <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
          <span style={{ color: '#ffff00' }}>{debugInfo.yaw}</span> rad<br />
          <span style={{ color: '#00ff00', fontSize: '15px', fontWeight: 'bold' }}>
            {debugInfo.yawDegrees}°
          </span>
        </div>

        {hasSpeed && (
          <>
            <div style={{ color: '#ff6600' }}>
              <strong>Velocity (u/s):</strong>
            </div>
            <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                <span>Horizontal:</span>
                <span style={{ color: getSpeedColor(debugInfo.speed.horizontal) }}>
                  {debugInfo.speed.horizontal}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '2px'
              }}>
                <span>Vertical:</span>
                <span style={{ color: getSpeedColor(debugInfo.speed.vertical) }}>
                  {debugInfo.speed.vertical}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#aaaaaa'
              }}>
                <span>Total:</span>
                <span style={{ color: getSpeedColor(debugInfo.speed.total) }}>
                  {debugInfo.speed.total}
                </span>
              </div>
            </div>

            <div style={{ 
              fontSize: '10px',
              color: '#666666',
              marginBottom: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '4px'
            }}>
              <div>Vector: ({debugInfo.velocity.x}, {debugInfo.velocity.y}, {debugInfo.velocity.z})</div>
            </div>
          </>
        )}
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        paddingTop: '8px',
        borderTop: '1px solid rgba(0, 255, 0, 0.3)',
        fontSize: '11px',
        color: '#aaaaaa',
        textAlign: 'center'
      }}>
        Premi <strong style={{ color: '#ffff00' }}>N</strong> per catturare
      </div>
    </div>
  )
}
