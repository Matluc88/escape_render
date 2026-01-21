import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { updateSpawnPosition } from '../../utils/api'
import './SpawnEditor.css'

// Vista dall'alto del modello completo
function TopDownView({ onPositionClick, selectedRoom, tempPosition, tempYaw, savedPositions, savedYaws, currentRoomColor }) {
  const { scene } = useGLTF('/models/casa.glb')
  const { camera, raycaster, gl } = useThree()
  const meshRef = useRef()
  const groupRef = useRef()

  // ✅ Setup modello con IDENTICA logica di CasaModel.jsx
  // Trova piano terra REALE ed applica offset dinamico
  useEffect(() => {
    if (!scene || !groupRef.current) return
    
    const CASA_SCALE = 10
    scene.scale.set(CASA_SCALE, CASA_SCALE, CASA_SCALE)
    scene.updateWorldMatrix(true, true)
    
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    // ✅ TROVA IL PIANO TERRA REALE (non cantina) - IDENTICO A CASAMODEL
    let targetGroundY = box.min.y
    let mainFloorY = null
    
    scene.traverse(o => {
      if (o.isMesh && o.name) {
        const name = o.name.toLowerCase()
        let isMainGround = false
        
        // Cerca pavimento principale basato sulla stanza
        if (selectedRoom === 'esterno') {
          isMainGround = /giardino|prato|grass|ground|terreno/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        } else {
          isMainGround = /pattern|piano|pavimento|floor|гольфстрим/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        }
        
        if (isMainGround) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
          const objBox = new THREE.Box3().setFromObject(o)
          const floorY = objBox.min.y
          
          // Prendi il pavimento più ALTO tra quelli trovati (piano terra, non cantina)
          if (mainFloorY === null || floorY > mainFloorY) {
            mainFloorY = floorY
            console.log(`[SpawnEditor] 🏠 Piano terra trovato: "${o.name}" a Y=${floorY.toFixed(3)}`)
          }
        }
      }
    })
    
    if (mainFloorY !== null) {
      targetGroundY = mainFloorY
      console.log(`[SpawnEditor] ✅ Usando pavimento piano terra come riferimento: Y=${targetGroundY.toFixed(3)}`)
    } else {
      console.warn(`[SpawnEditor] ⚠️ Pavimento principale non trovato, uso min.y=${targetGroundY.toFixed(3)}`)
    }
    
    // ✅ APPLICA STESSO OFFSET DI CASAMODEL (0.6m esterno, 2.0m interno)
    const PIANO_TERRA_HEIGHT = selectedRoom === 'esterno' ? 0.6 : 2.0
    groupRef.current.position.set(-center.x, -targetGroundY + PIANO_TERRA_HEIGHT, -center.z)
    groupRef.current.updateWorldMatrix(true, true)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`[SpawnEditor] 🎯 REFERENCE SPACE IDENTICO A CASAMODEL`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Stanza:', selectedRoom)
    console.log('Offset applicato:', PIANO_TERRA_HEIGHT + 'm', selectedRoom === 'esterno' ? '(esterno)' : '(interno)')
    console.log('Piano terra Y:', targetGroundY.toFixed(3) + 'm')
    console.log('Model Group Y:', groupRef.current.position.y.toFixed(3) + 'm')
    console.log('Center:', { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [scene, selectedRoom])

  // Setup camera ortografica dall'alto
  useEffect(() => {
    camera.position.set(0, 50, 0)
    camera.lookAt(0, 0, 0)
  }, [camera])

  // ✅ Handle click sul modello - RAYCAST FILTRATO + Y REALE
  const handleClick = (event) => {
    event.stopPropagation()
    
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera({ x, y }, camera)
    
    // ✅ FILTRA SOLO GROUNDMESHES (esclude cantina e oggetti non-pavimento)
    const groundMeshes = []
    scene.traverse((child) => {
      if (child.isMesh && child.name) {
        const name = child.name.toLowerCase()
        
        // Stessi pattern di CasaModel per ground detection
        let isGround = false
        
        if (selectedRoom === 'esterno') {
          // Pattern per esterno: giardino, prato, terreno (esclude cantina)
          isGround = /giardino|prato|grass|ground|terreno/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        } else {
          // Pattern per interno: pavimenti (esclude cantina)
          isGround = /pattern|piano|pavimento|floor|гольфстрим/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        }
        
        if (isGround) {
          groundMeshes.push(child)
        }
      }
    })
    
    // Raycast SOLO su groundMeshes validi
    const intersects = raycaster.intersectObjects(groundMeshes, false)

    if (intersects.length > 0) {
      const worldPoint = intersects[0].point
      
      // 🔧 CONVERSIONE WORLD → LOCAL SPACE
      // Il gruppo ha già applicato l'offset corretto (2.0m interno, 0.6m esterno)
      // Convertiamo in coordinate LOCAL rispetto al gruppo per avere coordinate invarianti
      const localPoint = groupRef.current.worldToLocal(worldPoint.clone())
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[SpawnEditor] 🎯 SPAWN EDITOR DEBUG - CLICK CAPTURE')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🏗️ MODEL SETUP:')
      console.log('  CASA_SCALE:', CASA_SCALE)
      console.log('  groupRef.position:', {
        x: groupRef.current.position.x.toFixed(3),
        y: groupRef.current.position.y.toFixed(3),
        z: groupRef.current.position.z.toFixed(3)
      })
      console.log('  groupRef.scale:', {
        x: groupRef.current.scale.x,
        y: groupRef.current.scale.y,
        z: groupRef.current.scale.z
      })
      console.log('  Model Group Y Offset:', groupRef.current.position.y.toFixed(3) + 'm')
      
      console.log('\n🎯 COORDINATE CATTURATE:')
      console.log('  Mesh colpito:', intersects[0].object.name)
      console.log('  Click WORLD (raycast):', {
        x: worldPoint.x.toFixed(3),
        y: worldPoint.y.toFixed(3),
        z: worldPoint.z.toFixed(3)
      })
      console.log('  Click LOCAL (worldToLocal):', {
        x: localPoint.x.toFixed(3),
        y: localPoint.y.toFixed(3),
        z: localPoint.z.toFixed(3)
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // 🔧 USA COORDINATE LOCAL CON Y=0 (pavimento locale)
      // Questo garantisce che le coordinate siano invarianti rispetto all'offset del modello
      onPositionClick({ 
        x: parseFloat(localPoint.x.toFixed(2)), 
        y: 0,  // ← FISSO! Pavimento in local space
        z: parseFloat(localPoint.z.toFixed(2)) 
      })
    } else {
      console.warn('[SpawnEditor] ⚠️ Nessun groundMesh colpito - click ignorato')
      console.warn('[SpawnEditor] ℹ️ Assicurati di cliccare sul PAVIMENTO, non su muri o oggetti')
    }
  }

  return (
    <group ref={groupRef}>
      <primitive 
        ref={meshRef}
        object={scene} 
        onClick={handleClick}
      />
      
      {/* 🎯 MARKER IN LOCAL SPACE - Renderizzati DENTRO il gruppo del modello */}
      {/* Marker posizione temporanea CON FRECCIA - SOLO quando stai posizionando */}
      {tempPosition && (
        <PositionMarker 
          position={tempPosition} 
          yaw={tempYaw}
          color={currentRoomColor}
          showArrow={true}
        />
      )}

      {/* Marker salvato - SOLO stanza corrente, SOLO se NON stai posizionando */}
      {!tempPosition && savedPositions[selectedRoom] && (
        <PositionMarker 
          position={savedPositions[selectedRoom]}
          yaw={savedYaws[selectedRoom] || 0}
          color={currentRoomColor}
          showArrow={true}
        />
      )}
    </group>
  )
}

// Marker visivo per la posizione selezionata con freccia direzionale
function PositionMarker({ position, yaw = 0, color = '#00ff00', showArrow = false }) {
  if (!position) return null
  
  return (
    <group position={[position.x, 0.5, position.z]} rotation={[0, yaw, 0]}>
      {/* Cilindro verticale sottile */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, 1, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {/* Sfera piccola in cima */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
      
      {/* Freccia direzionale (solo per marker selezionato) */}
      {showArrow && (
        <group position={[0, 0.6, 0]}>
          {/* Cono freccia */}
          <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08, 0.15, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
          </mesh>
          {/* Linea freccia */}
          <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  )
}

// Griglia helper
function GridHelper() {
  return (
    <>
      <gridHelper args={[100, 100, '#444444', '#222222']} />
      <axesHelper args={[10]} />
    </>
  )
}

export default function SpawnEditor() {
  const [selectedRoom, setSelectedRoom] = useState('soggiorno')
  const [tempPosition, setTempPosition] = useState(null)
  const [tempYaw, setTempYaw] = useState(0) // Rotazione temporanea
  const [savedPositions, setSavedPositions] = useState({})
  const [savedYaws, setSavedYaws] = useState({}) // Rotazioni salvate
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking') // 'online', 'offline', 'checking'

  const rooms = [
    { id: 'soggiorno', name: '🛋️ Soggiorno', color: '#00ff00' },
    { id: 'cucina', name: '🍳 Cucina', color: '#ff6600' },
    { id: 'bagno', name: '🚿 Bagno', color: '#00ccff' },
    { id: 'camera', name: '🛏️ Camera', color: '#ff00ff' },
    { id: 'esterno', name: '🌳 Esterno', color: '#ffff00' }
  ]

  // Controlla stato backend
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${BACKEND_URL}/rooms`)
        if (response.ok) {
          setBackendStatus('online')
          console.log('[SpawnEditor] ✅ Backend ONLINE')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        setBackendStatus('offline')
        console.log('[SpawnEditor] ❌ Backend OFFLINE')
      }
    }
    checkBackend()
    
    // Ricontrolla ogni 30 secondi
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  // Carica posizioni e rotazioni salvate
  useEffect(() => {
    const loadSavedData = () => {
      const savedPos = {}
      const savedRot = {}
      rooms.forEach(room => {
        const stored = localStorage.getItem(`spawn_${room.id}`)
        if (stored) {
          try {
            const data = JSON.parse(stored)
            savedPos[room.id] = data.data.position
            savedRot[room.id] = data.data.yaw || 0
          } catch (e) {
            console.error(`Error loading ${room.id}:`, e)
          }
        }
      })
      setSavedPositions(savedPos)
      setSavedYaws(savedRot)
    }
    loadSavedData()
  }, [])

  const handlePositionClick = (position) => {
    setTempPosition(position)
    // Mantieni yaw esistente se ri-posizioni una stanza già configurata
    if (savedYaws[selectedRoom] !== undefined) {
      setTempYaw(savedYaws[selectedRoom])
    }
    setMessage(null)
  }
  
  const handleYawChange = (newYaw) => {
    setTempYaw(parseFloat(newYaw))
  }

  const handleSave = async () => {
    if (!tempPosition) {
      setMessage({ type: 'error', text: '❌ Seleziona una posizione sulla mappa!' })
      return
    }

    setIsSaving(true)
    setMessage({ type: 'info', text: '💾 Salvataggio in corso...' })

    try {
      // 🔧 SALVA COORDINATE LOCAL SPACE CON Y=0 (pavimento locale)
      const spawnData = {
        position: {
          x: parseFloat(tempPosition.x.toFixed(2)),
          y: 0,  // ← SEMPRE 0! Pavimento in local space
          z: parseFloat(tempPosition.z.toFixed(2))
        },
        yaw: tempYaw // Usa rotazione configurata
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[SpawnEditor] 💾 SALVATAGGIO NEL DB')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('  Stanza:', selectedRoom)
      console.log('  Coordinate (LOCAL space):', spawnData.position)
      console.log('  Space Type: LOCAL (relativo a groupRef)')
      console.log('  Runtime deve applicare: localToWorld() conversion')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      await updateSpawnPosition(selectedRoom, spawnData)

      // Aggiorna stato locale
      setSavedPositions(prev => ({
        ...prev,
        [selectedRoom]: spawnData.position
      }))
      setSavedYaws(prev => ({
        ...prev,
        [selectedRoom]: spawnData.yaw
      }))

      setMessage({ 
        type: 'success', 
        text: `✅ Posizione salvata per ${rooms.find(r => r.id === selectedRoom)?.name}!` 
      })
      setTempPosition(null)

      console.log(`[SpawnEditor] ✅ Saved position for ${selectedRoom}:`, spawnData)
    } catch (error) {
      console.error('[SpawnEditor] Error saving:', error)
      setMessage({ 
        type: 'error', 
        text: `❌ Errore nel salvataggio: ${error.message}` 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTempPosition(null)
    setTempYaw(savedYaws[selectedRoom] || 0)
    setMessage(null)
  }

  const handleExportAll = () => {
    // Raccogli tutte le posizioni salvate dal localStorage
    const exportData = []
    
    rooms.forEach(room => {
      const stored = localStorage.getItem(`spawn_${room.id}`)
      if (stored) {
        try {
          const data = JSON.parse(stored)
          exportData.push({
            room: room.id,
            name: room.name,
            position: data.data.position,
            yaw: data.data.yaw || 0,
            yaw_degrees: Math.round(((data.data.yaw || 0) * 180) / Math.PI)
          })
        } catch (e) {
          console.error(`Error exporting ${room.id}:`, e)
        }
      }
    })

    if (exportData.length === 0) {
      setMessage({ type: 'error', text: '❌ Nessuna posizione salvata da esportare!' })
      return
    }

    // Crea il JSON formattato
    const jsonString = JSON.stringify(exportData, null, 2)
    
    // Scarica come file
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spawn-positions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Copia anche negli appunti
    navigator.clipboard.writeText(jsonString).then(() => {
      setMessage({ 
        type: 'success', 
        text: `✅ ${exportData.length} posizioni esportate e copiate negli appunti!` 
      })
      console.log('[SpawnEditor] 📥 Exported positions:', exportData)
    }).catch(err => {
      setMessage({ 
        type: 'warning', 
        text: `📥 File scaricato ma copia negli appunti fallita` 
      })
    })
  }

  const handleResetAll = () => {
    if (!confirm('⚠️ Sei sicuro di voler eliminare TUTTE le posizioni salvate?\n\nQuesta azione eliminerà solo la cache locale (localStorage).\nLe posizioni nel database rimarranno invariate.')) {
      return
    }

    // Rimuovi tutte le posizioni dal localStorage
    rooms.forEach(room => {
      localStorage.removeItem(`spawn_${room.id}`)
    })

    // Resetta stato locale
    setSavedPositions({})
    setSavedYaws({})
    setTempPosition(null)
    setTempYaw(0)

    setMessage({ 
      type: 'success', 
      text: '🗑️ Tutte le posizioni locali sono state eliminate!' 
    })

    console.log('[SpawnEditor] 🗑️ All local positions cleared')
  }

  const currentRoomColor = rooms.find(r => r.id === selectedRoom)?.color || '#00ff00'

  return (
    <div className="spawn-editor">
      {/* Sidebar controlli */}
      <div className="spawn-editor__sidebar">
        <div className="spawn-editor__header">
          <h1>🎯 Spawn Point Editor</h1>
          <p>Vista dall'alto - Click sulla mappa per posizionare</p>
          
          {/* Badge stato backend */}
          <div className={`backend-status ${backendStatus}`}>
            {backendStatus === 'checking' && '⏳ Controllo backend...'}
            {backendStatus === 'online' && '✅ Backend Online - Salvataggio PERMANENTE'}
            {backendStatus === 'offline' && '⚠️ Backend Offline - Solo cache (1h)'}
          </div>
        </div>

        {/* Selezione stanza */}
        <div className="spawn-editor__section">
          <h3>Seleziona Stanza</h3>
          <div className="spawn-editor__rooms">
            {rooms.map(room => (
              <button
                key={room.id}
                className={`spawn-editor__room-btn ${selectedRoom === room.id ? 'active' : ''} ${savedPositions[room.id] ? 'saved' : ''}`}
                onClick={() => setSelectedRoom(room.id)}
                style={{ '--room-color': room.color }}
              >
                <span className="room-indicator" style={{ backgroundColor: room.color }} />
                {room.name}
                {savedPositions[room.id] && <span className="saved-badge">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Posizione corrente */}
        <div className="spawn-editor__section">
          <h3>Posizione Selezionata</h3>
          {tempPosition ? (
            <>
              <div className="spawn-editor__coords">
                <div className="coord-item">
                  <span className="coord-label">X:</span>
                  <span className="coord-value">{tempPosition.x.toFixed(2)}</span>
                </div>
                <div className="coord-item">
                  <span className="coord-label">Y:</span>
                  <span className="coord-value">{tempPosition.y.toFixed(2)}</span>
                </div>
                <div className="coord-item">
                  <span className="coord-label">Z:</span>
                  <span className="coord-value">{tempPosition.z.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Controllo Rotazione */}
              <div className="rotation-control">
                <label className="rotation-label">
                  🧭 Rotazione: <span className="rotation-value">{Math.round((tempYaw * 180) / Math.PI)}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.01"
                  value={tempYaw}
                  onChange={(e) => handleYawChange(e.target.value)}
                  className="rotation-slider"
                />
                <div className="rotation-hint">
                  Trascina lo slider per ruotare il personaggio
                </div>
              </div>
            </>
          ) : (
            <p className="spawn-editor__no-position">
              👆 Click sulla mappa per selezionare
            </p>
          )}
        </div>

        {/* Posizione salvata */}
        {savedPositions[selectedRoom] && (
          <div className="spawn-editor__section">
            <h3>Posizione Salvata</h3>
            <div className="spawn-editor__coords saved">
              <div className="coord-item">
                <span className="coord-label">X:</span>
                <span className="coord-value">{savedPositions[selectedRoom].x.toFixed(2)}</span>
              </div>
              <div className="coord-item">
                <span className="coord-label">Z:</span>
                <span className="coord-value">{savedPositions[selectedRoom].z.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Azioni */}
        <div className="spawn-editor__actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!tempPosition || isSaving}
          >
            {isSaving ? '💾 Salvataggio...' : '💾 Salva Posizione'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={!tempPosition || isSaving}
          >
            ❌ Annulla
          </button>
        </div>

        {/* Azione Export */}
        <div className="spawn-editor__export">
          <button
            className="btn btn-export"
            onClick={handleExportAll}
            disabled={Object.keys(savedPositions).length === 0}
            title="Scarica tutte le posizioni salvate come file JSON"
          >
            📥 Esporta Tutte le Posizioni
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleResetAll}
            disabled={Object.keys(savedPositions).length === 0}
            title="Elimina tutte le posizioni dal localStorage"
            style={{ marginTop: '10px', width: '100%' }}
          >
            🗑️ Reset Cache Locale
          </button>
          <p className="export-hint">
            {Object.keys(savedPositions).length > 0 
              ? `${Object.keys(savedPositions).length} posizioni disponibili`
              : 'Nessuna posizione salvata'}
          </p>
        </div>

        {/* Messaggi */}
        {message && (
          <div className={`spawn-editor__message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Istruzioni */}
        <div className="spawn-editor__instructions">
          <h4>📋 Istruzioni</h4>
          <ol>
            <li>Seleziona una stanza dalla lista</li>
            <li>Ruota la vista per orientarti (trascina)</li>
            <li>Click sul punto esatto del pavimento</li>
            <li>Verifica le coordinate X,Z</li>
            <li>Click "Salva Posizione"</li>
          </ol>
          <p className="note">
            ℹ️ Le posizioni vengono salvate nel database e sovrascrivono i fallback
          </p>
        </div>
      </div>

      {/* Canvas 3D */}
      <div className="spawn-editor__canvas">
        <Canvas
          camera={{ 
            position: [0, 50, 0],
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          orthographic
          camera-zoom={20}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 50, 10]} intensity={1} />
          <directionalLight position={[-10, 50, -10]} intensity={0.5} />
          
          <GridHelper />
          
          <Suspense fallback={null}>
            <TopDownView 
              onPositionClick={handlePositionClick}
              selectedRoom={selectedRoom}
              tempPosition={tempPosition}
              tempYaw={tempYaw}
              savedPositions={savedPositions}
              savedYaws={savedYaws}
              currentRoomColor={currentRoomColor}
            />
          </Suspense>

          <OrbitControls 
            enableRotate={true}
            enablePan={true}
            enableZoom={true}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>

        {/* Leggenda */}
        <div className="spawn-editor__legend">
          <h4>🎨 Legenda Marker</h4>
          {rooms.map(room => (
            <div key={room.id} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: room.color }} />
              {room.name}
              {savedPositions[room.id] && ' ✓'}
              {room.id === selectedRoom && ' 👈'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}