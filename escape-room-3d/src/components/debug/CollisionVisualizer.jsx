import { useEffect, useState, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CollisionVisualizer - Real-time collision visualization system
 * 
 * Displays collision meshes with wireframe/outline overlays, excluding ground objects.
 * Useful for debugging collision detection and verifying collision boundaries.
 * 
 * Features:
 * - Wireframe rendering of collidable objects
 * - Automatic ground exclusion (userData.ground === true)
 * - Color-coded by type (static = green, dynamic = red)
 * - Toggle with 'C' key
 * - Real-time updates when model changes
 * 
 * @param {Object} modelRef - Ref to the model group to visualize
 * @param {boolean} enabled - Whether visualization is active (controlled by parent)
 * @param {Function} onToggle - Callback when visualization is toggled
 */
export default function CollisionVisualizer({ modelRef, enabled = false, onToggle, onStatsUpdate }) {
  const [collisionObjects, setCollisionObjects] = useState([])
  const [statsInfo, setStatsInfo] = useState({ total: 0, static: 0, dynamic: 0 })
  const wireframeMeshesRef = useRef([])
  const groupRef = useRef(null)
  
  // Collect collidable objects from model
  useEffect(() => {
    if (!modelRef || !modelRef.current) {
      console.log('[CollisionVisualizer] No model ref available')
      return
    }
    
    const collidables = []
    let staticCount = 0
    let dynamicCount = 0
    
    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        // Check if object is collidable
        const isCollidable = child.userData.collidable === true || 
                            (child.userData.collidable !== false && 
                             child.userData.ground !== true &&
                             child.userData.trigger !== true &&
                             child.userData.decorative !== true)
        
        // Exclude ground/floor objects
        const isGround = child.userData.ground === true
        
        if (isCollidable && !isGround) {
          const isDynamic = child.name.toLowerCase().includes('cancell') ||
                           child.name.toLowerCase().includes('porta') ||
                           child.name.toLowerCase().includes('anta') ||
                           child.name.toLowerCase().includes('door') ||
                           child.name.toLowerCase().includes('gate')
          
          collidables.push({
            mesh: child,
            name: child.name || 'unnamed',
            isDynamic: isDynamic
          })
          
          if (isDynamic) {
            dynamicCount++
          } else {
            staticCount++
          }
        }
      }
    })
    
    console.log(`[CollisionVisualizer] Found ${collidables.length} collidable objects (${staticCount} static, ${dynamicCount} dynamic)`)
    setCollisionObjects(collidables)
    const newStats = {
      total: collidables.length,
      static: staticCount,
      dynamic: dynamicCount
    }
    setStatsInfo(newStats)
    
    // Notify parent of stats update
    if (onStatsUpdate) {
      onStatsUpdate(newStats)
    }
  }, [modelRef, onStatsUpdate])
  
  // Create wireframe overlays for collision objects
  useEffect(() => {
    if (!enabled || collisionObjects.length === 0) {
      // Cleanup existing wireframes
      wireframeMeshesRef.current.forEach(mesh => {
        if (mesh.parent) {
          mesh.parent.remove(mesh)
        }
        mesh.geometry.dispose()
        mesh.material.dispose()
      })
      wireframeMeshesRef.current = []
      return
    }
    
    // Create wireframe meshes
    const wireframes = []
    
    collisionObjects.forEach(({ mesh, isDynamic }) => {
      if (!mesh.geometry) return
      
      // Clone geometry to avoid modifying original
      const wireframeGeo = mesh.geometry.clone()
      
      // Color based on type: green for static, red for dynamic
      const color = isDynamic ? '#ff0000' : '#00ff00'
      
      // Create wireframe material
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
        depthWrite: false
      })
      
      // Create wireframe mesh
      const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat)
      
      // Copy transform from original mesh
      wireframeMesh.position.copy(mesh.position)
      wireframeMesh.rotation.copy(mesh.rotation)
      wireframeMesh.scale.copy(mesh.scale)
      wireframeMesh.matrixAutoUpdate = false
      wireframeMesh.matrix.copy(mesh.matrix)
      
      // Add to parent (same parent as original mesh)
      if (mesh.parent) {
        mesh.parent.add(wireframeMesh)
      }
      
      wireframes.push(wireframeMesh)
    })
    
    wireframeMeshesRef.current = wireframes
    console.log(`[CollisionVisualizer] Created ${wireframes.length} wireframe overlays`)
    
    // Cleanup on unmount or when disabled
    return () => {
      wireframes.forEach(mesh => {
        if (mesh.parent) {
          mesh.parent.remove(mesh)
        }
        mesh.geometry.dispose()
        mesh.material.dispose()
      })
      wireframeMeshesRef.current = []
    }
  }, [enabled, collisionObjects])
  
  // Update wireframe transforms to match original meshes (for animated objects)
  useFrame(() => {
    if (!enabled) return
    
    wireframeMeshesRef.current.forEach((wireframe, index) => {
      const collisionObj = collisionObjects[index]
      if (collisionObj && collisionObj.mesh) {
        // Update matrix to match original mesh
        wireframe.matrix.copy(collisionObj.mesh.matrixWorld)
        wireframe.matrixWorldNeedsUpdate = true
      }
    })
  })
  
  return null // This component only manages Three.js objects, no React rendering
}

/**
 * Hook to manage collision visualization toggle
 * @returns {Object} - { enabled, toggle, stats }
 */
export function useCollisionVisualization() {
  const [enabled, setEnabled] = useState(false)
  const [stats, setStats] = useState({ total: 0, static: 0, dynamic: 0 })
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        setEnabled(prev => {
          const newState = !prev
          console.log(`[CollisionVisualizer] Visualization ${newState ? 'ENABLED' : 'DISABLED'}`)
          return newState
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return {
    enabled,
    toggle: () => setEnabled(prev => !prev),
    stats,
    setStats
  }
}

/**
 * UI Overlay component to display collision visualization status
 */
export function CollisionVisualizerOverlay({ enabled, stats }) {
  if (!enabled) return null
  
  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px 20px',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '13px',
      lineHeight: '1.6',
      zIndex: 1000,
      minWidth: '250px',
      border: '2px solid #00ff00',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
    }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: '10px',
        fontSize: '14px',
        color: '#00ff00',
        borderBottom: '1px solid #00ff00',
        paddingBottom: '8px'
      }}>
        🔍 Visualizzazione Collisioni
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#aaa' }}>Totale:</span>{' '}
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{stats.total} oggetti</span>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#0f0' }}>●</span>{' '}
        <span style={{ color: '#aaa' }}>Statici:</span>{' '}
        <span style={{ color: '#0f0' }}>{stats.static}</span>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#f00' }}>●</span>{' '}
        <span style={{ color: '#aaa' }}>Dinamici:</span>{' '}
        <span style={{ color: '#f00' }}>{stats.dynamic}</span>
      </div>
      
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid #555',
        fontSize: '11px',
        color: '#bbb'
      }}>
        <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>C</kbd> Toggle visualizzazione</div>
        <div style={{ marginTop: '6px', color: '#888' }}>
          ⚫ Pavimento escluso
        </div>
      </div>
    </div>
  )
}
