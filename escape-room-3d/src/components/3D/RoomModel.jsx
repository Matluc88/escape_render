import { useGLTF } from '@react-three/drei'
import { useState, useMemo } from 'react'

export default function RoomModel({ 
  modelPath, 
  onObjectClick, 
  interactiveObjects = []
}) {
  const { scene } = useGLTF(modelPath)
  const [hoveredObject, setHoveredObject] = useState(null)

  // 🚨 CRITICAL FIX: Memoizza il clone della scena per prevenire memory leak devastante
  // PRIMA: scene.clone() veniva eseguito AD OGNI RENDER → crash garantito su smartphone/RPi
  // DOPO: Clona una sola volta quando scene o interactiveObjects cambiano
  const clonedScene = useMemo(() => {
    if (!scene) return null
    
    const clone = scene.clone()
    
    // Pre-calcola bounding boxes
    clone.traverse((child) => {
      if (child.isMesh && child.geometry && !child.geometry.boundingBox) {
        child.geometry.computeBoundingBox()
      }
    })
    
    return clone
  }, [scene])

  // Applica le proprietà una sola volta quando clonedScene cambia
  useMemo(() => {
    if (!clonedScene) return
    
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        if (interactiveObjects.includes(child.name)) {
          child.userData.interactive = true
        }
      }
    })
  }, [clonedScene, interactiveObjects])

  const handleClick = (event) => {
    event.stopPropagation()
    if (event.object.userData.interactive) {
      console.log('🖱️ Click:', event.object.name)
      onObjectClick(event.object.name)
    }
  }

  const handlePointerOver = (event) => {
    event.stopPropagation()
    if (event.object.userData.interactive) {
      document.body.style.cursor = 'pointer'
      setHoveredObject(event.object.name)
      if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x555555)
      }
    }
  }

  const handlePointerOut = (event) => {
    event.stopPropagation()
    if (event.object.userData.interactive) {
      document.body.style.cursor = 'default'
      setHoveredObject(null)
      if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x000000)
      }
    }
  }

  // Non renderizzare se clonedScene non è pronto
  if (!clonedScene) return null

  return (
    <primitive
      object={clonedScene}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  )
}

useGLTF.preload('/models/cucina.glb')
useGLTF.preload('/models/soggiorno.glb')
useGLTF.preload('/models/bagno.glb')
useGLTF.preload('/models/camera.glb')
