/**
 * PuzzleLED Component
 * 
 * Finds and controls LED objects in the 3D model by UUID.
 * Changes emissive material properties based on puzzle state.
 * 
 * LED Colors:
 * - red: Puzzle active or locked (waiting)
 * - green: Puzzle completed
 * - off: Puzzle not yet unlocked
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function PuzzleLED({ ledUuid, state }) {
  const { scene } = useThree()
  const ledRef = useRef(null)
  const originalMaterialRef = useRef(null)
  const clonedMaterialRef = useRef(null) // 🔒 MEMORY: Track del material clonato per cleanup
  const [blinkState, setBlinkState] = useState(false) // false = red, true = green
  
  useEffect(() => {
    if (!scene || !ledUuid) return
    
    // Find LED object in scene by name (UUID is in parentheses in model)
    // Example: "LED PORTA CUCINA(5C8874BB-4373-44E7-91B9-0C2845ED2856)"
    let ledObject = null
    scene.traverse((child) => {
      // Check if name includes the UUID
      // ⚠️ IMPORTANTE: Escludi HITBOX invisibili (hanno stesso UUID ma material non emissivo)
      if (child.name && child.name.includes(ledUuid) && !child.name.includes('HITBOX')) {
        ledObject = child
      }
    })
    
    if (!ledObject) {
      console.warn(`⚠️  [PuzzleLED] LED not found with UUID: ${ledUuid}`)
      return
    }
    
    if (!ledObject.isMesh) {
      console.warn(`⚠️  [PuzzleLED] Object ${ledUuid} is not a mesh`)
      return
    }
    
    ledRef.current = ledObject
    
    // 🔒 MEMORY OPTIMIZATION: Clone material once e traccia per cleanup
    if (!originalMaterialRef.current) {
      originalMaterialRef.current = ledObject.material
      
      // Clona il material una sola volta
      const clonedMat = ledObject.material.clone()
      clonedMaterialRef.current = clonedMat
      ledObject.material = clonedMat
      
      console.log(`✅ [PuzzleLED] Found LED: ${ledObject.name} (${ledUuid}) - Material clonato`)
    }
    
    // Cleanup: Disponi del material clonato quando il componente smonta
    return () => {
      if (clonedMaterialRef.current) {
        clonedMaterialRef.current.dispose()
        console.log(`🗑️  [PuzzleLED] Material disposed for ${ledUuid}`)
        clonedMaterialRef.current = null
      }
    }
  }, [scene, ledUuid])
  
  // Blinking interval quando state === 'blinking'
  useEffect(() => {
    if (state !== 'blinking') return
    
    console.log(`⚡ [PuzzleLED] Avvio blinking per ${ledRef.current?.name}`)
    
    const interval = setInterval(() => {
      setBlinkState(prev => !prev)
    }, 500) // 500ms = 0.5 secondi (2 lampeggi al secondo)
    
    return () => {
      clearInterval(interval)
      console.log(`⏹️  [PuzzleLED] Stop blinking per ${ledRef.current?.name}`)
    }
  }, [state])
  
  // Update LED color quando state o blinkState cambiano
  useEffect(() => {
    if (!ledRef.current) return
    
    const led = ledRef.current
    const material = led.material
    
    // Ensure material supports emissive properties
    if (!material.emissive) {
      console.warn(`⚠️  [PuzzleLED] Material doesn't support emissive (${led.name})`)
      return
    }
    
    // Apply color based on state
    switch(state) {
      case 'red':
        material.emissive.set(0xff0000) // Red
        material.emissiveIntensity = 2.0
        material.color.set(0xff0000)
        console.log(`🔴 [PuzzleLED] ${led.name}: RED (active/locked)`)
        break
        
      case 'green':
        material.emissive.set(0x00ff00) // Verde puro intenso
        material.emissiveIntensity = 3.5
        material.color.set(0x00ff00)
        console.log(`🟢 [PuzzleLED] ${led.name}: GREEN (completed)`)
        break
        
      case 'blinking':
        // Alterna tra rosso e verde basato su blinkState
        if (blinkState) {
          material.emissive.set(0x00ff00) // Verde
          material.emissiveIntensity = 3.5
          material.color.set(0x00ff00)
        } else {
          material.emissive.set(0xff0000) // Rosso
          material.emissiveIntensity = 2.0
          material.color.set(0xff0000)
        }
        break
        
      case 'off':
        material.emissive.set(0x000000) // Black
        material.emissiveIntensity = 0
        material.color.set(0x333333)
        console.log(`⚫ [PuzzleLED] ${led.name}: OFF (locked)`)
        break
        
      default:
        console.warn(`⚠️  [PuzzleLED] Unknown state: ${state}`)
    }
    
    // Force material update
    material.needsUpdate = true
    
  }, [state, blinkState])
  
  // This component doesn't render anything in the scene
  // It only manipulates existing objects
  return null
}

// LED UUID constants (from specifications)
export const LED_UUIDS = {
  PORTA: '5C8874BB-4373-44E7-91B9-0C2845ED2856',
  FORNELLI: 'BD293CB6-B1B9-4AFF-B581-44A58C0C0182',
  FRIGO: '7127A953-E067-45F7-9427-B7B29F669501',
  SERRA: '12E65795-6B7B-435B-AC6A-4E91DB157C0E',
  LAMPADA_CAMERA: '592F5061-BEAC-4DB8-996C-4F71102704DD'
}
