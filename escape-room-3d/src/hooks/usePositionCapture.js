import { useState, useEffect, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook per catturare posizioni della camera premendo il tasto N
 * Permette di salvare coordinate precise per configurare spawn point delle stanze
 * 
 * @returns {Object} - Stato e funzioni per la gestione delle catture
 */
export function usePositionCapture() {
  const { camera } = useThree()
  const [captures, setCaptures] = useState([])
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [pendingCapture, setPendingCapture] = useState(null)
  const playerRootRef = useRef(null)
  const yawPivotRef = useRef(null)

  // Trova i nodi della gerarchia FPS Controls al mount
  useEffect(() => {
    // Cerca PlayerRoot e YawPivot nella scena
    let node = camera
    while (node) {
      if (node.name === 'PlayerRoot') {
        playerRootRef.current = node
      }
      if (node.name === 'YawPivot') {
        yawPivotRef.current = node
      }
      node = node.parent
    }
    
    console.log('[PositionCapture] Nodi trovati:', {
      PlayerRoot: !!playerRootRef.current,
      YawPivot: !!yawPivotRef.current
    })
  }, [camera])

  /**
   * Cattura la posizione e rotazione corrente della camera
   */
  const capturePosition = useCallback(() => {
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()

    // Ottieni posizione dal PlayerRoot (piedi del giocatore)
    if (playerRootRef.current) {
      playerRootRef.current.getWorldPosition(position)
    } else {
      // Fallback: usa posizione camera diretta
      camera.getWorldPosition(position)
      console.warn('[PositionCapture] PlayerRoot non trovato, uso camera.position')
    }

    // Ottieni rotazione yaw dal YawPivot
    let yaw = 0
    let yawMethod = 'unknown'
    
    if (yawPivotRef.current) {
      yaw = yawPivotRef.current.rotation.y
      yawMethod = 'YawPivot.rotation.y'
      console.log('[PositionCapture] ✅ YAW da YawPivot.rotation.y =', yaw)
    } else {
      // Fallback: calcola yaw dalla direzione camera
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      yaw = Math.atan2(direction.x, direction.z)
      yawMethod = 'Math.atan2 (FALLBACK)'
      console.warn('[PositionCapture] ⚠️ YawPivot NON TROVATO! Usando fallback atan2 =', yaw)
      console.warn('[PositionCapture] Direction:', direction)
    }

    // Timestamp formattato
    const now = new Date()
    const timestamp = now.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const captureData = {
      position: {
        x: parseFloat(position.x.toFixed(2)),
        y: parseFloat(position.y.toFixed(2)),
        z: parseFloat(position.z.toFixed(2))
      },
      rotation: {
        yaw: parseFloat(yaw.toFixed(4)),
        yawDegrees: parseFloat((yaw * 180 / Math.PI).toFixed(2)),
        method: yawMethod // Per debugging
      },
      timestamp,
      id: Date.now()
    }

    console.log('[PositionCapture] 📍 Cattura iniziata:', captureData)
    
    // Salva i dati temporanei e apri il prompt
    setPendingCapture(captureData)
    setIsPromptOpen(true)
  }, [camera])

  /**
   * Salva la cattura con il nome della stanza
   */
  const saveCapture = useCallback((roomName) => {
    if (!pendingCapture) return

    const finalCapture = {
      ...pendingCapture,
      roomName: roomName.trim()
    }

    setCaptures(prev => [...prev, finalCapture])
    console.log('[PositionCapture] ✅ Cattura salvata:', finalCapture)
    
    // Log formattato per facile copia
    console.log(`\n=== COORDINATE PER "${roomName.toUpperCase()}" ===`)
    console.log(`Position: { x: ${finalCapture.position.x}, y: ${finalCapture.position.y}, z: ${finalCapture.position.z} }`)
    console.log(`Yaw: ${finalCapture.rotation.yaw} radianti (${finalCapture.rotation.yawDegrees}°)`)
    console.log(`Method: ${finalCapture.rotation.method}`)
    console.log(`Timestamp: ${finalCapture.timestamp}\n`)

    // Reset
    setPendingCapture(null)
    setIsPromptOpen(false)
  }, [pendingCapture])

  /**
   * Cancella la cattura in corso
   */
  const cancelCapture = useCallback(() => {
    console.log('[PositionCapture] ❌ Cattura annullata')
    setPendingCapture(null)
    setIsPromptOpen(false)
  }, [])

  /**
   * Elimina una cattura salvata
   */
  const deleteCapture = useCallback((id) => {
    setCaptures(prev => prev.filter(c => c.id !== id))
    console.log('[PositionCapture] 🗑️ Cattura eliminata:', id)
  }, [])

  /**
   * Pulisce tutte le catture
   */
  const clearAllCaptures = useCallback(() => {
    setCaptures([])
    console.log('[PositionCapture] 🧹 Tutte le catture eliminate')
  }, [])

  /**
   * Esporta le catture in formato JSON
   */
  const exportJSON = useCallback(() => {
    const data = {
      captures,
      exportDate: new Date().toISOString(),
      totalCaptures: captures.length
    }
    return JSON.stringify(data, null, 2)
  }, [captures])

  /**
   * Esporta in formato JavaScript per cameraPositioning.js
   */
  const exportJavaScript = useCallback(() => {
    if (captures.length === 0) {
      return '// Nessuna cattura disponibile'
    }

    let code = '// Coordinate catturate con usePositionCapture\n'
    code += '// Copia e incolla in cameraPositioning.js\n\n'
    code += 'const spawnPositions = {\n'

    captures.forEach((capture, index) => {
      const key = capture.roomName.toLowerCase().replace(/\s+/g, '_')
      code += `  ${key}: {\n`
      code += `    position: { x: ${capture.position.x}, y: ${capture.position.y}, z: ${capture.position.z} },\n`
      code += `    yaw: ${capture.rotation.yaw}, // ${capture.rotation.yawDegrees}°\n`
      code += `    // Catturato: ${capture.timestamp}\n`
      code += `  }`
      if (index < captures.length - 1) code += ','
      code += '\n'
    })

    code += '}\n'
    return code
  }, [captures])

  /**
   * Listener per il tasto N
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Tasto N per catturare posizione
      if (event.key.toLowerCase() === 'n' && !isPromptOpen) {
        event.preventDefault()
        capturePosition()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [capturePosition, isPromptOpen])

  return {
    captures,
    isPromptOpen,
    pendingCapture,
    saveCapture,
    cancelCapture,
    deleteCapture,
    clearAllCaptures,
    exportJSON,
    exportJavaScript
  }
}
