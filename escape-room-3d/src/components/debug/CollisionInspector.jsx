import { useEffect, useState, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CollisionInspector - Advanced collision inspection system
 * 
 * Features:
 * - Proximity-based filtering (only show nearby objects)
 * - Individual object selection and inspection
 * - Detailed geometry information (bounding box, dimensions)
 * - Per-object collision toggle
 * - Warning system for problematic geometry
 * 
 * Controls:
 * - V: Toggle inspector mode
 * - Arrow Up/Down: Navigate objects list
 * - T: Toggle collision for selected object
 * - +/-: Adjust proximity radius
 */
export default function CollisionInspector({ 
  modelRef, 
  enabled = false, 
  proximityRadius = 5,
  selectedIndex = 0,
  onObjectSelected,
  onNearbyObjectsUpdate
}) {
  const { camera } = useThree()
  const highlightMeshRef = useRef(null)
  const selectedObjectRef = useRef(null)
  
  // Calculate nearby objects based on camera position
  useFrame(() => {
    if (!enabled || !modelRef || !modelRef.current || !camera) return
    
    const cameraPos = new THREE.Vector3()
    camera.getWorldPosition(cameraPos)
    
    const nearby = []
    
    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase()
        
        // Check if ground (exclude from collision inspection)
        const isGround = child.userData.ground === true
        
        // Same logic as EsternoScene for consistency
        // Only include meshes that are explicitly marked as collidable
        // Skip meshes that are explicitly marked as non-collidable (small details)
        let isCollidable = false
        if (child.userData.collidable === true) {
          isCollidable = true
        } else if (child.userData.collidable !== false && !isGround) {
          // For meshes not tagged by auto-collision, include them as collidable by default
          // This ensures walls and other objects are detected
          isCollidable = true
        }
        
        if (isCollidable && !isGround) {
          // Calculate distance
          const meshPos = new THREE.Vector3()
          child.getWorldPosition(meshPos)
          const distance = cameraPos.distanceTo(meshPos)
          
          if (distance <= proximityRadius) {
            // Calculate bounding box
            const bbox = new THREE.Box3().setFromObject(child)
            const size = new THREE.Vector3()
            bbox.getSize(size)
            
            // Check for problematic geometry
            const warnings = []
            const minDim = Math.min(size.x, size.y, size.z)
            if (minDim < 0.1) {
              warnings.push(`⚠️ Molto sottile: ${minDim.toFixed(3)}m`)
            }
            if (size.x > 50 || size.y > 50 || size.z > 50) {
              warnings.push('⚠️ Dimensioni eccessive')
            }
            
            nearby.push({
              mesh: child,
              name: child.name || 'unnamed',
              distance: distance,
              size: size,
              bbox: bbox,
              warnings: warnings,
              collisionEnabled: child.userData.collidable !== false
            })
          }
        }
      }
    })
    
    // Sort by distance
    nearby.sort((a, b) => a.distance - b.distance)
    
    // Send data to parent via callback
    if (onNearbyObjectsUpdate) {
      onNearbyObjectsUpdate(nearby)
    }
    
    // Update selected object reference
    if (nearby.length > 0 && selectedIndex < nearby.length) {
      selectedObjectRef.current = nearby[selectedIndex]
      if (onObjectSelected) {
        onObjectSelected(nearby[selectedIndex])
      }
    } else {
      selectedObjectRef.current = null
    }
  })
  
  // Create/update highlight mesh for selected object
  useEffect(() => {
    if (!enabled || !selectedObjectRef.current) {
      // Cleanup highlight
      if (highlightMeshRef.current && highlightMeshRef.current.parent) {
        highlightMeshRef.current.parent.remove(highlightMeshRef.current)
        highlightMeshRef.current.geometry.dispose()
        highlightMeshRef.current.material.dispose()
        highlightMeshRef.current = null
      }
      return
    }
    
    const selectedObj = selectedObjectRef.current
    if (!selectedObj || !selectedObj.mesh || !selectedObj.mesh.geometry) return
    
    // Remove old highlight
    if (highlightMeshRef.current && highlightMeshRef.current.parent) {
      highlightMeshRef.current.parent.remove(highlightMeshRef.current)
      highlightMeshRef.current.geometry.dispose()
      highlightMeshRef.current.material.dispose()
    }
    
    // Create new highlight
    const highlightGeo = selectedObj.mesh.geometry.clone()
    const highlightMat = new THREE.MeshBasicMaterial({
      color: '#ffff00',
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
      linewidth: 3 // Note: linewidth may not work on all platforms
    })
    
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat)
    highlightMesh.matrixAutoUpdate = false
    
    // Add to parent
    if (selectedObj.mesh.parent) {
      selectedObj.mesh.parent.add(highlightMesh)
    }
    
    highlightMeshRef.current = highlightMesh
  }, [enabled, selectedIndex])
  
  // Update highlight transform
  useFrame(() => {
    if (highlightMeshRef.current && selectedObjectRef.current && selectedObjectRef.current.mesh) {
      highlightMeshRef.current.matrix.copy(selectedObjectRef.current.mesh.matrixWorld)
      highlightMeshRef.current.matrixWorldNeedsUpdate = true
    }
  })
  
  return null
}

/**
 * Hook to manage collision inspector
 */
export function useCollisionInspector() {
  const [enabled, setEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(5)
  const [selectedObject, setSelectedObject] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [nearbyObjects, setNearbyObjects] = useState([])
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // V: Toggle inspector
      if (e.key === 'v' || e.key === 'V') {
        setEnabled(prev => {
          const newState = !prev
          console.log(`[CollisionInspector] Inspector ${newState ? 'ENABLED' : 'DISABLED'}`)
          return newState
        })
      }
      
      if (!enabled) return
      
      // J: Previous object (up in list)
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
        console.log(`[CollisionInspector] Selected object ${Math.max(0, selectedIndex - 1) + 1}/${nearbyObjects.length}`)
      }
      
      // K: Next object (down in list)
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(nearbyObjects.length - 1, prev + 1))
        console.log(`[CollisionInspector] Selected object ${Math.min(nearbyObjects.length - 1, selectedIndex + 1) + 1}/${nearbyObjects.length}`)
      }
      
      // T: Toggle collision for selected object
      if (e.key === 't' || e.key === 'T') {
        if (selectedObject && selectedObject.mesh) {
          const newState = !(selectedObject.mesh.userData.collidable !== false)
          selectedObject.mesh.userData.collidable = newState
          console.log(`[CollisionInspector] "${selectedObject.name}" collision: ${newState ? 'ENABLED' : 'DISABLED'}`)
        }
      }
      
      // +: Increase radius
      if (e.key === '+' || e.key === '=') {
        setProximityRadius(prev => Math.min(20, prev + 1))
      }
      
      // -: Decrease radius
      if (e.key === '-' || e.key === '_') {
        setProximityRadius(prev => Math.max(1, prev - 1))
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, selectedObject, nearbyObjects.length])
  
  return {
    enabled,
    proximityRadius,
    selectedObject,
    selectedIndex,
    nearbyObjects,
    setEnabled,
    setProximityRadius,
    setSelectedObject,
    setSelectedIndex,
    setNearbyObjects
  }
}

/**
 * UI Overlay for collision inspector
 */
export function CollisionInspectorOverlay({ 
  enabled, 
  proximityRadius,
  selectedObject,
  selectedIndex,
  nearbyObjects,
  onSelectObject,
  onToggleCollision
}) {
  if (!enabled) return null
  
  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '400px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: '15px 20px',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.5',
      zIndex: 1000,
      width: '350px',
      maxHeight: '70vh',
      overflow: 'hidden',
      border: '2px solid #ffaa00',
      boxShadow: '0 0 20px rgba(255, 170, 0, 0.4)'
    }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: '10px',
        fontSize: '14px',
        color: '#ffaa00',
        borderBottom: '1px solid #ffaa00',
        paddingBottom: '8px'
      }}>
        🔍 Collision Inspector
      </div>
      
      <div style={{ marginBottom: '10px', color: '#aaa', fontSize: '11px' }}>
        <div>Raggio: <span style={{ color: '#fff', fontWeight: 'bold' }}>{proximityRadius}m</span></div>
        <div>Oggetti vicini: <span style={{ color: '#fff', fontWeight: 'bold' }}>{nearbyObjects.length}</span></div>
      </div>
      
      {/* Objects list */}
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto',
        marginBottom: '10px',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '5px'
      }}>
        {nearbyObjects.length === 0 ? (
          <div style={{ color: '#888', padding: '10px', textAlign: 'center' }}>
            Nessun oggetto nel raggio
          </div>
        ) : (
          nearbyObjects.map((obj, index) => (
            <div
              key={index}
              onClick={() => onSelectObject && onSelectObject(index)}
              style={{
                padding: '6px 8px',
                marginBottom: '2px',
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? 'rgba(255, 170, 0, 0.3)' : 'transparent',
                borderLeft: index === selectedIndex ? '3px solid #ffaa00' : '3px solid transparent',
                color: index === selectedIndex ? '#ffaa00' : '#ccc',
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: index === selectedIndex ? 'bold' : 'normal' }}>
                {obj.collisionEnabled ? '✓' : '✗'} {obj.name}
              </div>
              <div style={{ fontSize: '10px', color: '#888' }}>
                {obj.distance.toFixed(1)}m
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Selected object details */}
      {selectedObject && (
        <div style={{
          border: '1px solid #ffaa00',
          borderRadius: '4px',
          padding: '10px',
          marginBottom: '10px',
          backgroundColor: 'rgba(255, 170, 0, 0.1)'
        }}>
          <div style={{ fontWeight: 'bold', color: '#ffaa00', marginBottom: '8px' }}>
            {selectedObject.name}
          </div>
          
          <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
            <div><span style={{ color: '#aaa' }}>Distanza:</span> {selectedObject.distance.toFixed(2)}m</div>
            <div><span style={{ color: '#aaa' }}>Dimensioni:</span> {selectedObject.size.x.toFixed(2)} x {selectedObject.size.y.toFixed(2)} x {selectedObject.size.z.toFixed(2)}m</div>
            <div>
              <span style={{ color: '#aaa' }}>Collisione:</span>{' '}
              <span style={{ color: selectedObject.collisionEnabled ? '#0f0' : '#f00', fontWeight: 'bold' }}>
                {selectedObject.collisionEnabled ? 'ATTIVA' : 'DISATTIVA'}
              </span>
            </div>
          </div>
          
          {selectedObject.warnings.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '6px',
              backgroundColor: 'rgba(255, 100, 0, 0.2)',
              borderRadius: '3px',
              fontSize: '10px',
              color: '#ff6600'
            }}>
              {selectedObject.warnings.map((warning, i) => (
                <div key={i}>{warning}</div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => onToggleCollision && onToggleCollision()}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px',
              backgroundColor: selectedObject.collisionEnabled ? '#d9534f' : '#5cb85c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            {selectedObject.collisionEnabled ? 'Disabilita Collisione' : 'Abilita Collisione'}
          </button>
        </div>
      )}
      
      {/* Controls */}
      <div style={{
        borderTop: '1px solid #555',
        paddingTop: '10px',
        fontSize: '10px',
        color: '#888'
      }}>
        <div><kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px' }}>V</kbd> Toggle inspector</div>
        <div><kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px' }}>J/K</kbd> Naviga su/giù</div>
        <div><kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px' }}>T</kbd> Toggle collisione</div>
        <div><kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px' }}>+/-</kbd> Raggio ±1m</div>
      </div>
    </div>
  )
}
