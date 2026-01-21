import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import CasaModel from '../3D/CasaModel'
import portaIngressoSequence from '../../../public/porta_ingresso_sequence.json'
import { useFPSControls } from '../../hooks/useFPSControls'
import { usePositionCapture } from '../../hooks/usePositionCapture'
import { getCapturedPosition } from '../../utils/cameraPositioning'
import PositionCaptureOverlay from '../UI/PositionCaptureOverlay'
import LivePositionDebug, { LivePositionReader } from '../debug/LivePositionDebug'
import LoadingOverlay from '../UI/LoadingOverlay'
import CollisionVisualizer, { useCollisionVisualization, CollisionVisualizerOverlay } from '../debug/CollisionVisualizer'
import CollisionInspector, { useCollisionInspector, CollisionInspectorOverlay } from '../debug/CollisionInspector'
import { useMqttEsterno } from '../../hooks/useMqttEsterno'
import AnimationEditor from '../UI/AnimationEditor'
import { useObjectSelection } from '../../hooks/useObjectSelection'
import { usePositionPicker } from '../../hooks/usePositionPicker'
import ObjectHighlighter from '../debug/ObjectHighlighter'
import PivotHelper from '../debug/PivotHelper'
import PathHelper from '../debug/PathHelper'
import { useAnimationPreview } from '../../hooks/useAnimationPreview'
import { getMovableNode } from '../../utils/movableNodeHelper'

function FPSController({ modelRef, mobileInput, onLookAtChange, groundPlaneMesh, isMobile = false, boundaryLimits, initialPosition, initialYaw = 0, eyeHeight = 1.6, modelScale = 1, positionCaptureRef }) {
  const { camera } = useThree()
  const [collisionObjects, setCollisionObjects] = useState([])
  const [groundObjects, setGroundObjects] = useState([])
  const [interactiveObjects, setInteractiveObjects] = useState([])
  const raycasterRef = useRef(new THREE.Raycaster())
  const lastTargetRef = useRef(null)
  const timeSinceLastRaycastRef = useRef(0)
  const RAYCAST_INTERVAL = isMobile ? 0.1 : 0 // Throttle raycasting on mobile (10 Hz)
  
  // Hook per cattura posizioni (tasto N)
  const captureSystem = usePositionCapture()
  
  // Esponi il sistema di cattura al componente parent tramite ref
  useEffect(() => {
    if (positionCaptureRef) {
      positionCaptureRef.current = captureSystem
    }
  }, [captureSystem])
  
  useEffect(() => {
    // === CASO 1: LISTE FORZATE DA CASAMODEL (Sincronizzazione perfetta!) ===
    if (modelRef && (modelRef.forcedCollidables || modelRef.forcedGrounds)) {
      console.log('[EsternoScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL');
      
      let cols = modelRef.forcedCollidables || [];
      let grnds = modelRef.forcedGrounds || [];
      const interactives = [];

      // Aggiungi ground plane artificiale se c'è
      if (groundPlaneMesh) {
        grnds = [...grnds, groundPlaneMesh];
        groundPlaneMesh.userData.ground = true;
      }

      // Cerca oggetti interattivi nelle collidables
      cols.forEach(child => {
        const name = child.name ? child.name.toLowerCase() : '';
        
        // Interactive objects specifici per esterno (cancelli, porte)
        if (name.startsWith('test') || 
            name.includes('cancello') || 
            name.includes('porta') || 
            name.includes('gate') ||
            name.includes('door')) {
          interactives.push(child);
          child.userData.interactive = true;
        }
      });

      setCollisionObjects(cols);
      setGroundObjects(grnds);
      setInteractiveObjects(interactives);
      
      console.log(`[EsternoScene] ✅ Configurazione: ${cols.length} collision, ${grnds.length} grounds, ${interactives.length} interattivi`);
      return;
    }

    // === CASO 2: FALLBACK (Codice vecchio se CasaModel non manda liste) ===
    if (!modelRef || !modelRef.current) return;
    
    const collidables = []
    const grounds = []
    const interactives = []
    
    console.log('[EsternoScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)');
    
    // Usa i tag userData impostati da CasaModel
    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase()
        
        // CasaModel ha già taggato ground e collidable objects
        if (child.userData.ground === true) {
          grounds.push(child)
        } else if (child.userData.collidable === true) {
          collidables.push(child)
        }
        
        // Mark interactive objects (test objects or known interactive names)
        if (name.startsWith('test') || 
            name.includes('cancello') || 
            name.includes('porta') || 
            name.includes('gate') ||
            name.includes('door')) {
          interactives.push(child)
          child.userData.interactive = true
        }
      }
    })
    
    // Add the programmatic ground plane if available
    if (groundPlaneMesh) {
      grounds.push(groundPlaneMesh)
      groundPlaneMesh.userData.ground = true
    }
    
    console.log(`[EsternoScene] Ground objects (${grounds.length}):`, grounds.map(o => o.name))
    console.log(`[EsternoScene] Collidable objects (${collidables.length}):`, collidables.map(o => o.name))
    
    setCollisionObjects(collidables)
    setGroundObjects(grounds)
    setInteractiveObjects(interactives)
  }, [modelRef, groundPlaneMesh])
  
  // Raycasting for interactive object detection (for mobile interaction button)
  // Throttled on mobile to improve performance (10 Hz instead of 60 Hz)
  useFrame((_, delta) => {
    if (!onLookAtChange || interactiveObjects.length === 0) return
    
    // Throttle raycasting on mobile
    if (RAYCAST_INTERVAL > 0) {
      timeSinceLastRaycastRef.current += delta
      if (timeSinceLastRaycastRef.current < RAYCAST_INTERVAL) return
      timeSinceLastRaycastRef.current = 0
    }
    
    // Cast ray from camera forward
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    raycasterRef.current.set(camera.position, direction)
    raycasterRef.current.far = 5 // Max interaction distance
    
    const intersects = raycasterRef.current.intersectObjects(interactiveObjects, true)
    
    if (intersects.length > 0) {
      const target = intersects[0].object
      // Find the root interactive object (might be a child mesh)
      let interactiveParent = target
      while (interactiveParent && !interactiveParent.userData.interactive) {
        interactiveParent = interactiveParent.parent
      }
      
      const targetName = interactiveParent?.name || target.name
      
      if (lastTargetRef.current !== targetName) {
        lastTargetRef.current = targetName
        onLookAtChange(targetName, targetName)
      }
    } else {
      if (lastTargetRef.current !== null) {
        lastTargetRef.current = null
        onLookAtChange(null, null)
      }
    }
  })
  
  // 🟢 CALIBRAZIONE FINALE DEFINITIVA: Player 0.315m (63cm larghezza) + 32 raggi
  // 0.315m = Equilibrio perfetto tra presenza fisica e mobilità
  // Il valore ideale tra snellezza (corridoi) e robustezza (cancello)
  const COLLISION_RADIUS = 0.315 // 31.5cm di raggio = 63cm di larghezza (VALORE FINALE)
  const PLAYER_HEIGHT = 1.7      // 1.7m di altezza (umano standard)
  const MOVE_SPEED = 3.0         // 3 m/s (passo svelto)
  // Disable gravity for EsternoScene to preserve original behavior
  useFPSControls(collisionObjects, mobileInput, groundObjects, boundaryLimits, initialPosition, initialYaw, eyeHeight, COLLISION_RADIUS, PLAYER_HEIGHT, MOVE_SPEED, true)
  
  return null
}

// Ground plane component that registers itself for ground detection
function GroundPlane({ onGroundReady }) {
  const meshRef = useRef()
  
  useEffect(() => {
    if (meshRef.current && onGroundReady) {
      onGroundReady(meshRef.current)
    }
  }, [onGroundReady])
  
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow name="ground_plane">
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#4a7c4e" polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
  )
}

// Reference height for scale calculation (same as KitchenScene)
const REFERENCE_HEIGHT = 22.5

export default function EsternoScene({ onObjectClick, onLookAtChange, mobileInput, isMobile = false, isAdmin = false, socket, sessionId, playerName }) {
  const [modelRef, setModelRef] = useState({ current: null })
  const [groundPlaneRef, setGroundPlaneRef] = useState(null)
  const [boundaryLimits, setBoundaryLimits] = useState(null)
  const positionCaptureRef = useRef(null)
  const [captureReady, setCaptureReady] = useState(false)
  const [liveDebugInfo, setLiveDebugInfo] = useState(null)
  const [spawnData, setSpawnData] = useState(null)
  const [isLoadingSpawn, setIsLoadingSpawn] = useState(true)
  const [worldReady, setWorldReady] = useState(false)
  
  // Collision visualization system (toggle with 'C' key)
  const collisionViz = useCollisionVisualization()
  
  // Collision inspector system (toggle with 'V' key)
  const inspector = useCollisionInspector()
  
  // 🔌 MQTT ESP32 Integration
  const mqtt = useMqttEsterno()
  
  // 🧪 TEST: Bypass MQTT con tasto K (temporaneo)
  const [testBypass, setTestBypass] = useState(false)
  
  // Reset test bypass quando cambia sessionId (nuova sessione = stato pulito)
  useEffect(() => {
    console.log('[EsternoScene] 🔄 Session changed, resetting test bypass to false')
    setTestBypass(false)
  }, [sessionId])
  
  // DEBUG: Offset Y del modello (controllabile con tastiera - solo admin)
  const [modelYOffset, setModelYOffset] = useState(0.6) // Default: 0.6m (per ottenere Model Group Y = -0.517m)
  
  // DEBUG: EyeHeight (altezza occhi camera) controllabile in tempo reale (solo admin)
  const [eyeHeight, setEyeHeight] = useState(0.9) // Default: 0.9m (VALORI FINALI VERIFICATI)
  
  // State per minimizzare il pannello debug
  const [isDebugMinimized, setIsDebugMinimized] = useState(false)
  
  // Sistema di editing animazioni
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)
  const [animationConfig, setAnimationConfig] = useState(null)
  const [showEditorUI, setShowEditorUI] = useState(false)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [pickDestinationMode, setPickDestinationMode] = useState(false)
  
  // Quando un oggetto viene selezionato, mostra l'UI
  useEffect(() => {
    if (selectedObject && editorEnabled) {
      setShowEditorUI(true)
    } else {
      setShowEditorUI(false)
    }
  }, [selectedObject, editorEnabled])
  
  useEffect(() => {
    if (positionCaptureRef.current && !captureReady) {
      setCaptureReady(true)
    }
  }, [positionCaptureRef.current, captureReady])
  
  // 🚀 EVENT-DRIVEN: Callback invocato da CasaModel quando il mondo è pronto
  const handleWorldReady = useCallback(() => {
    console.log('[EsternoScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn')
    setWorldReady(true)
  }, [])
  
  useEffect(() => {
    const load = async () => {
      try {
        const captured = await getCapturedPosition('esterno')
        setSpawnData(captured ? { position: captured.position, yaw: captured.yaw } : null)
      } catch (e) {
        setSpawnData(null)
      } finally {
        setIsLoadingSpawn(false)
      }
    }
    load()
  }, [])
  
  // Start with null to prevent FPSController from rendering with unscaled values
  const [modelScale, setModelScale] = useState(null)
  // Spawn position calculated from model bounds (outside the house)
  const [spawnPosition, setSpawnPosition] = useState(null)
  // Eye height derived from gate (cancello) center Y position
  const [gateEyeHeight, setGateEyeHeight] = useState(null)
  // Initial yaw for camera rotation
  const [initialYaw, setInitialYaw] = useState(0)
  // Gate animation state - derivati da MQTT
  const cancelloAperto = mqtt.cancelloAperto // cancello1 > 45° o cancello2 > 45°
  // ❌ cancellettoAperto rimosso - non più usato (solo cancello grande)
  const tettoAperto = mqtt.tettoAperto // tetto > 90°
  
  // Enigma 1: Fotocellula state - MQTT + TEST BYPASS
  // testBypass SOLO per fotocellula, NON per apertura automatica cancello
  const fotocellulaSbloccata = testBypass || mqtt.fotocellulaSbloccata // IR sensor libero O bypass test
  const ledVerde = testBypass || mqtt.ledVerde // LED verde attivo O bypass test
  
  const [mostraMessaggio, setMostraMessaggio] = useState(false)
  const [mostraMessaggioObiettivo, setMostraMessaggioObiettivo] = useState(false)
  const [mostraMessaggioApri, setMostraMessaggioApri] = useState(false)
  const [mostraDialog, setMostraDialog] = useState(false)
  const [controlliBloccati, setControlliBloccati] = useState(false)
  const fotocellulaPrevRef = useRef(fotocellulaSbloccata)
  
  // 🔒 Interaction Lock System
  const [isInteractionLocked, setIsInteractionLocked] = useState(false)
  const [lockedByPlayer, setLockedByPlayer] = useState(null)
  const [showLockedMessage, setShowLockedMessage] = useState(false)
  
  // 🚪 Stato per apertura cancello dal dialog SI (separato da MQTT)
  const [cancelloApertoDalDialog, setCancelloApertoDalDialog] = useState(false)
  const cancelloApertoFinal = cancelloApertoDalDialog || cancelloAperto // Aperto da dialog O da MQTT
  
  // 🖱️ Rilascia pointer lock quando appare il dialog (per mostrare il cursore)
  useEffect(() => {
    if (mostraDialog) {
      // Exit pointer lock per mostrare il cursore
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
  }, [mostraDialog])
  
  // 🚪 Stato per porta ingresso - controllo manuale tasto L
  const [portaApertaManualeConL, setPortaApertaManualeConL] = useState(false)
  
  // 🚪 Porta ingresso si apre con fotocellula O con tasto L (override manuale)
  const portaIngressoAperta = fotocellulaSbloccata || portaApertaManualeConL
  
  // 🏠 Stati per distribuzione stanze
  const [distributionTriggered, setDistributionTriggered] = useState(false)
  const [assignedRoom, setAssignedRoom] = useState(null)
  const [showTransition, setShowTransition] = useState(false)
  const [fadeOpacity, setFadeOpacity] = useState(0)
  const transitionTimerRef = useRef(null)
  
  // ⏱️ Stato per countdown visibile (ultimi 10 secondi)
  const [countdownSeconds, setCountdownSeconds] = useState(null)
  const countdownIntervalRef = useRef(null)
  
  // 🚪 Configurazioni porta ingresso (caricata da JSON)
  const portaIngressoConfig = useMemo(() => portaIngressoSequence, [])
  
  // 🚪 Maniglia ESTERNA porta ingresso
  const manigliaEsternaPortaIngressoConfig = useMemo(() => {
    if (!modelRef.current) return null
    
    let manigliaObj = null
    modelRef.current.traverse((child) => {
      if (child.name === "MANIGLIA_PORTA_INGRESSO(C79AFA0F-3538-48BE-9380-3D385F83BF71)") {
        manigliaObj = child
      }
    })
    
    if (!manigliaObj) return null
    
    const bbox = new THREE.Box3().setFromObject(manigliaObj)
    const pivotLocation = "left"
    
    const pivotX = pivotLocation === "left" ? bbox.min.x : bbox.max.x
    const pivotY = (bbox.min.y + bbox.max.y) / 2
    const pivotZ = (bbox.min.z + bbox.max.z) / 2
    
    return {
      objectName: "MANIGLIA_PORTA_INGRESSO(C79AFA0F-3538-48BE-9380-3D385F83BF71)",
      pivotX,
      pivotY,
      pivotZ,
      angle: 90,
      axis: 'y',
      direction: pivotLocation === "left" ? 1 : -1
    }
  }, [modelRef])
  
  // 🚪 Maniglia INTERNA porta ingresso
  const manigliaInternaPortaIngressoConfig = useMemo(() => {
    if (!modelRef.current) return null
    
    let manigliaObj = null
    modelRef.current.traverse((child) => {
      if (child.name === "MANIGLIA_PORTA_INGRESSO(2AE21696-5B61-4DBB-B9A6-D60D43EEDED8)") {
        manigliaObj = child
      }
    })
    
    if (!manigliaObj) return null
    
    const bbox = new THREE.Box3().setFromObject(manigliaObj)
    const pivotLocation = "left"
    
    const pivotX = pivotLocation === "left" ? bbox.min.x : bbox.max.x
    const pivotY = (bbox.min.y + bbox.max.y) / 2
    const pivotZ = (bbox.min.z + bbox.max.z) / 2
    
    return {
      objectName: "MANIGLIA_PORTA_INGRESSO(2AE21696-5B61-4DBB-B9A6-D60D43EEDED8)",
      pivotX,
      pivotY,
      pivotZ,
      angle: 90,
      axis: 'y',
      direction: pivotLocation === "left" ? 1 : -1
    }
  }, [modelRef])
  
  // Keyboard shortcuts:
  // - E key: toggle Animation Editor - SOLO ADMIN
  // - K key: toggle test bypass (sblocca fotocellula + apre cancello) - TUTTI
  // - 1/2/3 keys control model Y offset (debug) - SOLO ADMIN
  // - 7/8/9 keys control eye height (debug) - SOLO ADMIN
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      
      // Tasto E - Toggle Animation Editor (SOLO ADMIN)
      if (key === 'e' && isAdmin) {
        e.preventDefault()
        e.stopPropagation()
        setEditorEnabled(prev => {
          const newState = !prev
          console.log('[EsternoScene] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
          if (!newState) {
            setSelectedObject(null)
            setShowEditorUI(false)
          }
          return newState
        })
        return
      }
      
      // 🧪 TEST: Tasto K per bypassare MQTT + mostra dialog immediato (DISPONIBILE PER TUTTI - sincronizzato via WebSocket)
      if (e.key === 'k' || e.key === 'K') {
        const newState = !testBypass
        setTestBypass(newState)
        console.log(`[EsternoScene] 🧪 TEST BYPASS: ${newState ? 'ATTIVO (cancello aperto!)' : 'DISATTIVO'}`)
        
        // Se attivato, mostra IMMEDIATAMENTE il dialog "Provare ad aprire?"
        if (newState) {
          console.log('[EsternoScene] 🚪 Mostrando dialog immediato (tasto K)')
          setControlliBloccati(true)
          setMostraDialog(true)
          
          // Exit pointer lock per mostrare il cursore
          if (document.pointerLockElement) {
            document.exitPointerLock()
          }
        }
        
        // Emit via WebSocket per sincronizzare tutti i giocatori
        if (socket && sessionId) {
          socket.emit('toggleTestBypass', {
            sessionId,
            room: 'esterno',
            state: newState,
            playerName: playerName || 'Unknown'
          })
        }
        return
      }
      
      // 🚪 Tasto L - Toggle Porta Ingresso MANUALE (DISPONIBILE PER TUTTI - sincronizzato via WebSocket)
      if (key === 'l') {
        const newState = !portaApertaManualeConL
        console.log(`[EsternoScene] 🚪 Porta Ingresso MANUALE: ${newState ? 'APERTA' : 'CHIUSA'}`)
        setPortaApertaManualeConL(newState)
        
        // Emit via WebSocket per sincronizzare tutti i giocatori (FUORI dal setState!)
        if (socket && sessionId) {
          console.log(`[EsternoScene] 📤 Emitting toggleDoorState:`, {
            sessionId,
            room: 'esterno',
            state: newState,
            playerName: playerName || 'Unknown'
          })
          socket.emit('toggleDoorState', {
            sessionId,
            room: 'esterno',
            state: newState,
            playerName: playerName || 'Unknown'
          })
        } else {
          console.warn(`[EsternoScene] ⚠️ Cannot emit - socket=${!!socket}, sessionId=${sessionId}`)
        }
        return
      }
      
      // Solo admin può usare i controlli debug seguenti
      if (!isAdmin) return
      
      // DEBUG: Controlli per offset Y del modello (tasti numerici 1/2/3)
      if (e.key === '1') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev + 0.1) * 10) / 10 // Round to 1 decimal
          console.log(`[EsternoScene] 📈 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (e.key === '2') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev - 0.1) * 10) / 10 // Round to 1 decimal
          console.log(`[EsternoScene] 📉 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (e.key === '3') {
        setModelYOffset(0.6)
        console.log('[EsternoScene] 🔄 Model Y offset reset to default: 0.6m')
      }
      
      // DEBUG: Controlli per eyeHeight (altezza occhi) (tasti numerici 7/8/9)
      if (e.key === '7') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev + 0.1) * 10) / 10 // Round to 1 decimal
          console.log(`[EsternoScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (e.key === '8') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev - 0.1) * 10) / 10 // Round to 1 decimal
          console.log(`[EsternoScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (e.key === '9') {
        setEyeHeight(0.9)
        console.log('[EsternoScene] 🔄 EyeHeight reset to default: 0.9m')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [testBypass, socket, sessionId, playerName, fotocellulaSbloccata, isAdmin])
  
  // useEffect to detect when fotocellula is unlocked (false → true)
  useEffect(() => {
    // Check if fotocellula just became unlocked (transition from false to true)
    if (!fotocellulaPrevRef.current && fotocellulaSbloccata) {
      console.log('[EsternoScene] 🟢 Fotocellula sbloccata! Mostrando messaggio APRI CANCELLO')
      setMostraMessaggioApri(true)
      
      // Hide message after 5 seconds
      const timer = setTimeout(() => {
        console.log('[EsternoScene] ⏱️ Nascondendo messaggio APRI CANCELLO')
        setMostraMessaggioApri(false)
      }, 5000)
      
      // Cleanup
      return () => clearTimeout(timer)
    }
    
    // Update the ref to current value for next comparison
    fotocellulaPrevRef.current = fotocellulaSbloccata
  }, [fotocellulaSbloccata])
  
  // WebSocket listener: sincronizza test bypass quando altri giocatori premono K
  useEffect(() => {
    if (!socket) return
    
    const handleTestBypassChanged = (data) => {
      if (data.room === 'esterno') {
        console.log(`[EsternoScene] 🔄 Test bypass da ${data.toggledBy}: ${data.state}`)
        setTestBypass(data.state)
      }
    }
    
    const handleDoorStateChanged = (data) => {
      if (data.room === 'esterno') {
        console.log(`[EsternoScene] 🚪 Porta Ingresso MANUALE da ${data.toggledBy}: ${data.state ? 'APERTA' : 'CHIUSA'}`)
        setPortaApertaManualeConL(data.state)
      }
    }
    
    const handleGateStateChanged = (data) => {
      if (data.room === 'esterno') {
        console.log(`[EsternoScene] 🚪 Cancello da ${data.toggledBy}: ${data.state ? 'APERTO' : 'CHIUSO'}`)
        setCancelloApertoDalDialog(data.state)
        
        // Se il cancello si apre, chiudi il dialog per tutti
        if (data.state === true) {
          console.log('[EsternoScene] ✨ Cancello aperto - Chiudendo dialog e sbloccando controlli')
          setMostraDialog(false)
          setControlliBloccati(false)
        }
      }
    }
    
    socket.on('testBypassChanged', handleTestBypassChanged)
    socket.on('doorStateChanged', handleDoorStateChanged)
    socket.on('gateStateChanged', handleGateStateChanged)
    
    return () => {
      socket.off('testBypassChanged', handleTestBypassChanged)
      socket.off('doorStateChanged', handleDoorStateChanged)
      socket.off('gateStateChanged', handleGateStateChanged)
    }
  }, [socket])
  
  // 🏠 WebSocket listeners per distribuzione stanze
  useEffect(() => {
    if (!socket) return
    
    const handleRoomAssigned = (data) => {
      console.log('[EsternoScene] 🏠 Stanza assegnata:', data)
      setAssignedRoom(data.assignedRoom)
      setShowTransition(true)
      
      // Avvia fade to black (2 secondi)
      let opacity = 0
      const fadeInterval = setInterval(() => {
        opacity += 0.05 // Incremento ogni 50ms per smooth fade
        setFadeOpacity(opacity)
        
        if (opacity >= 1) {
          clearInterval(fadeInterval)
          
          // Dopo 1 secondo di nero completo, naviga
          setTimeout(() => {
            console.log(`[EsternoScene] 🚀 Redirect a ${data.assignedRoom}`)
            window.location.href = `/play/${sessionId}/${data.assignedRoom}`
          }, 1000)
        }
      }, 50)
      
      // Cleanup
      transitionTimerRef.current = fadeInterval
    }
    
    const handleRoomDistribution = (data) => {
      console.log('[EsternoScene] 📊 Distribuzione completata:', data.distribution)
    }
    
    const handleDistributionFailed = (data) => {
      console.error('[EsternoScene] ❌ Distribuzione fallita:', data.error)
      alert(`Errore: ${data.error}`)
    }
    
    socket.on('roomAssigned', handleRoomAssigned)
    socket.on('roomDistribution', handleRoomDistribution)
    socket.on('distributionFailed', handleDistributionFailed)
    
    return () => {
      socket.off('roomAssigned', handleRoomAssigned)
      socket.off('roomDistribution', handleRoomDistribution)
      socket.off('distributionFailed', handleDistributionFailed)
      
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current)
      }
    }
  }, [socket, sessionId])
  
  // ⏱️ TIMER AUTOMATICO 25 SECONDI - Distribuzione stanze dopo apertura cancello
  useEffect(() => {
    if (!cancelloApertoFinal || distributionTriggered || !socket || !sessionId) return
    
    console.log('[EsternoScene] ⏱️ Cancello aperto! Timer 25 secondi avviato...')
    
    // Timer principale per distribuzione (25 secondi)
    const distributionTimer = setTimeout(() => {
      console.log('[EsternoScene] ⏰ 25 secondi trascorsi - Avvio distribuzione stanze!')
      setDistributionTriggered(true)
      setControlliBloccati(true)
      
      // Emetti evento WebSocket per distribuire i giocatori
      socket.emit('distributeRooms', {
        sessionId,
        triggeredBy: 'Sistema Automatico'
      })
    }, 25000) // 25 secondi
    
    // Timer per countdown visibile (inizia dopo 15 secondi, mostra ultimi 10)
    const countdownStartTimer = setTimeout(() => {
      console.log('[EsternoScene] 🔟 Countdown visibile iniziato (ultimi 10 secondi)')
      let seconds = 10
      setCountdownSeconds(seconds)
      
      // Intervallo per decrementare ogni secondo
      const interval = setInterval(() => {
        seconds--
        setCountdownSeconds(seconds)
        
        if (seconds <= 0) {
          clearInterval(interval)
          setCountdownSeconds(null)
        }
      }, 1000)
      
      // Salva riferimento per cleanup
      countdownIntervalRef.current = interval
    }, 15000) // Inizia dopo 15s (per mostrare gli ultimi 10s)
    
    // Cleanup timers se il componente viene smontato
    return () => {
      console.log('[EsternoScene] 🧹 Cleanup timer distribuzione e countdown')
      clearTimeout(distributionTimer)
      clearTimeout(countdownStartTimer)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [cancelloApertoFinal, distributionTriggered, socket, sessionId])
  
  // Handle click on cancello (gate) - INTERACTIVE SEQUENCE WITH OBJECTIVE MESSAGE
  const handleCancelloClick = (objectName) => {
    // Extract name from object if needed
    const targetName = typeof objectName === 'string' ? objectName : (objectName?.name || '')
    if (!targetName) return
    
    const name = targetName.toLowerCase()
    console.log('[EsternoScene] 🚪 Click ricevuto su:', targetName)
    
    // Check if clicked on gate (CANCELLO_ANTA_1 or CANCELLO_ANTA_2)
    if (name.includes('cancello_anta') || name.includes('cancello anta')) {
      // Se il cancello è già stato aperto, non mostrare più i messaggi
      if (cancelloApertoDalDialog) {
        console.log('[EsternoScene] ℹ️ Cancello già aperto - messaggi skip')
        return
      }
      
      console.log('[EsternoScene] 🚪 Cancello clicked - Starting interactive sequence with objective')
      
      // 1. Blocca controlli
      setControlliBloccati(true)
      
      // 2. Mostra primo messaggio (enigma)
      setMostraMessaggio(true)
      
      // 3. Dopo 3 secondi → nasconde messaggio iniziale + mostra OBIETTIVO
      setTimeout(() => {
        setMostraMessaggio(false)
        setMostraMessaggioObiettivo(true)
        
        // 4. Dopo altri 5 secondi → nasconde obiettivo + SBLOCCA controlli
        // (Il dialog apparirà SOLO premendo K - non automaticamente)
        setTimeout(() => {
          setMostraMessaggioObiettivo(false)
          setControlliBloccati(false)
          console.log('[EsternoScene] ℹ️ Sequenza messaggi completata - Premi K per aprire')
        }, 5000)
      }, 3000)
    }
  }
  
  // Handler per bottone SI del dialog
  const handleDialogSI = () => {
    console.log('[EsternoScene] 🟢 Dialog SI clicked')
    setMostraDialog(false)
    
    if (testBypass || fotocellulaSbloccata) {
      // SUCCESSO! Fotocellula sbloccata
      console.log('[EsternoScene] ✅ Fotocellula sbloccata - Aprendo cancello e porta')
      
      setMostraMessaggioApri(true)     // "APRI CANCELLO"
      setCancelloApertoDalDialog(true) // ✨ Apre cancello
      setPortaApertaManualeConL(true)  // ✅ FIX: Apre porta ingresso (era setPortaIngressoAperta)
      
      // Emit WebSocket per sincronizzare tutti
      if (socket && sessionId) {
        // Sincronizza cancello
        socket.emit('toggleGateState', {
          sessionId,
          room: 'esterno',
          state: true,
          playerName: playerName || 'Unknown'
        })
        
        // Sincronizza porta ingresso
        socket.emit('toggleDoorState', {
          sessionId,
          room: 'esterno',
          state: true,
          playerName: playerName || 'Unknown'
        })
      }
      
      // Nasconde messaggio e sblocca dopo 3 secondi
      setTimeout(() => {
        setMostraMessaggioApri(false)
        setControlliBloccati(false)
      }, 3000)
    } else {
      // FALLITO - Fotocellula ancora bloccata
      console.log('[EsternoScene] ❌ Fotocellula ancora bloccata')
      setControlliBloccati(false)
    }
  }
  
  // Handler per bottone NO del dialog
  const handleDialogNO = () => {
    console.log('[EsternoScene] 🔴 Dialog NO clicked')
    setMostraDialog(false)
    setControlliBloccati(false)
  }
  
  // Wrapper for onObjectClick that handles cancello logic
  const handleObjectClick = (objectName) => {
    handleCancelloClick(objectName)
    // Also call parent handler if provided
    if (onObjectClick) {
      onObjectClick(objectName)
    }
  }
  
  useEffect(() => {
    if (!modelRef.current) return
    
    // Update world matrices to ensure bounding box reflects repositioned model
    modelRef.current.updateWorldMatrix(true, true)
    
    const box = new THREE.Box3().setFromObject(modelRef.current)
    
    // 🚨 FIX TELETRASPORTO: DISABILITATI boundary limits per scena esterno
    // I boundary limits nella scena esterno COSTRINGEVANO il player a stare DENTRO la casa
    // causando il teletrasporto quando cliccava (il sistema lo riportava dentro i limiti)
    // Per l'esterno, il player deve essere LIBERO di muoversi, le collisioni fisiche bastano
    const limits = null // DISABILITATO
    
    console.log('[Esterno] 🔓 BOUNDARY LIMITS DISABILITATI (player libero all\'esterno)')
    console.log('[Esterno] Box della casa (solo info):', { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z })
    
    // Calculate scale from bounding box height (same as KitchenScene)
    const modelHeight = box.max.y - box.min.y
    const calculatedScale = modelHeight / REFERENCE_HEIGHT
    console.log('[Esterno] Calculated scale:', calculatedScale, '(model height:', modelHeight, '/ reference:', REFERENCE_HEIGHT, ')')
    console.log('[Esterno] Scaled FPS params will be: moveSpeed=', 20.0 * calculatedScale, 'collisionRadius=', 0.3 * calculatedScale, 'eyeHeight=', 1.6 * calculatedScale)
    setModelScale(calculatedScale)
    
    // Find the gate (cancello/cancelletto) and use its center Y as eye height
    // This positions the camera at gate level as requested by the user
    let gateFound = false
    modelRef.current.traverse((child) => {
      if (gateFound) return // Only use the first gate found
      if (child.isMesh && child.name.toLowerCase().includes('cancell')) {
        const gateBox = new THREE.Box3().setFromObject(child)
        const gateCenter = new THREE.Vector3()
        gateBox.getCenter(gateCenter)
        console.log('[Esterno] Found gate:', child.name, 'Center Y:', gateCenter.y, 'Box:', { min: gateBox.min.y, max: gateBox.max.y })
        setGateEyeHeight(gateCenter.y)
        gateFound = true
      }
    })
    
    if (!gateFound) {
      console.log('[Esterno] No gate found, using default eyeHeight:', 1.6 * calculatedScale)
    }
    
    // PRIORITÀ 1: Check for async loaded spawn data
    if (spawnData?.position) {
      console.log('[Esterno] ✅ Using API/cache coordinates:', spawnData.position)
      setSpawnPosition(spawnData.position)
      setInitialYaw(spawnData.yaw || 0)
    } else {
      // PRIORITÀ 2: Calculate spawn position OUTSIDE the house (using box.max.z + offset)
      const spawnOffset = 5 // Units outside the model bounds
      // Spawn at ground level (Y=0) - the model is already repositioned so floor is at Y=0
      // The eyeHeight parameter handles camera height above ground
      const outsideSpawn = {
        x: 0,
        y: 0,
        z: box.max.z + spawnOffset
      }
      console.log('[Esterno] Spawn position (outside house):', outsideSpawn, '(box.max.z:', box.max.z, '+ offset:', spawnOffset, ')')
      setSpawnPosition(outsideSpawn)
      setInitialYaw(0)
    }
    
    console.log('[Esterno] Boundary limits:', limits)
    setBoundaryLimits(limits)
  }, [modelRef, spawnData])
  
  if (isLoadingSpawn) {
    return <div style={{ width: '100%', height: '100%' }}><LoadingOverlay message="Caricamento esterno..." /></div>
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Debug overlay - mostra posizione, rotazione e velocità in tempo reale - SOLO ADMIN */}
      {isAdmin && <LivePositionDebug debugInfo={liveDebugInfo} />}
      
      {/* Collision Visualizer Overlay - mostra statistiche collisioni - SOLO ADMIN */}
      {isAdmin && <CollisionVisualizerOverlay 
        enabled={collisionViz.enabled}
        stats={collisionViz.stats}
      />}
      
      {/* Collision Inspector Overlay - inspector avanzato proximity-based - SOLO ADMIN */}
      {isAdmin && <CollisionInspectorOverlay
        enabled={inspector.enabled}
        proximityRadius={inspector.proximityRadius}
        selectedObject={inspector.selectedObject}
        selectedIndex={inspector.selectedIndex}
        nearbyObjects={inspector.nearbyObjects}
        onSelectObject={(index) => inspector.setSelectedIndex(index)}
        onToggleCollision={() => {
          if (inspector.selectedObject && inspector.selectedObject.mesh) {
            const newState = !(inspector.selectedObject.mesh.userData.collidable !== false)
            inspector.selectedObject.mesh.userData.collidable = newState
            console.log(`[CollisionInspector] Toggled collision for "${inspector.selectedObject.name}": ${newState ? 'ENABLED' : 'DISABLED'}`)
          }
        }}
      />}
      
      {/* Overlay UI per cattura posizioni - SOLO ADMIN */}
      {isAdmin && captureReady && positionCaptureRef.current && (
        <PositionCaptureOverlay
          isPromptOpen={positionCaptureRef.current.isPromptOpen}
          pendingCapture={positionCaptureRef.current.pendingCapture}
          captures={positionCaptureRef.current.captures}
          onSave={positionCaptureRef.current.saveCapture}
          onCancel={positionCaptureRef.current.cancelCapture}
          onDelete={positionCaptureRef.current.deleteCapture}
          onClearAll={positionCaptureRef.current.clearAllCaptures}
          onExportJSON={positionCaptureRef.current.exportJSON}
          onExportJavaScript={positionCaptureRef.current.exportJavaScript}
        />
      )}
      
      {/* Animation Editor UI - SOLO ADMIN */}
      {isAdmin && showEditorUI && (
        <AnimationEditor
          selectedObject={selectedObject}
          initialConfig={animationConfig}
          pickDestinationMode={pickDestinationMode}
          onClose={() => {
            setSelectedObject(null)
            setShowEditorUI(false)
            setIsAnimationPlaying(false)
            setPickDestinationMode(false)
          }}
          onConfigChange={setAnimationConfig}
          onTestAnimation={() => {
            console.log('[EsternoScene] Test animazione avviato')
            setIsAnimationPlaying(true)
          }}
          isAnimationPlaying={isAnimationPlaying}
          onPickDestinationStart={() => {
            console.log('[EsternoScene] Pick destination mode ATTIVATO')
            setPickDestinationMode(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[EsternoScene] Pick destination mode DISATTIVATO')
            setPickDestinationMode(false)
          }}
        />
      )}
      
      {/* Indicatore stato editor - SOLO ADMIN */}
      {isAdmin && editorEnabled && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 170, 255, 0.9)',
          padding: '10px 15px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 15px rgba(0, 170, 255, 0.4)',
          border: '2px solid #00ffff'
        }}>
          🎨 ANIMATION EDITOR ATTIVO - Clicca su un oggetto
        </div>
      )}
      
      <Canvas
        camera={{ position: [0, 1.6, 10], fov: 75, near: 0.1 }} 
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.2] : [1, 2]}
        gl={{ antialias: !isMobile, powerPreference: isMobile ? 'low-power' : 'high-performance' }}
      >
        <ambientLight intensity={isMobile ? 0.8 : 0.7} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.0} 
          castShadow={!isMobile} 
          shadow-bias={-0.0005} 
        />
        <hemisphereLight intensity={0.5} groundColor="#8B4513" />
        
        {/* Reader interno - legge posizione/rotazione/velocità e aggiorna lo state */}
        <LivePositionReader onUpdate={setLiveDebugInfo} />
        
        {/* Only render FPSController after modelScale has been calculated from the model's bounding box */}
        {/* Use gate center Y as eye height if found, otherwise fall back to scaled default */}
        {worldReady && modelScale !== null && spawnPosition !== null && (
          <FPSController 
            modelRef={modelRef} 
            mobileInput={mobileInput}
            onLookAtChange={onLookAtChange}
            groundPlaneMesh={groundPlaneRef}
            isMobile={isMobile}
            boundaryLimits={boundaryLimits}
            initialPosition={spawnPosition}
            initialYaw={initialYaw}
            eyeHeight={eyeHeight}
            modelScale={modelScale}
            positionCaptureRef={positionCaptureRef}
          />
        )}
        
        <Suspense fallback={null}>
          <CasaModel 
            sceneType="esterno"
            onObjectClick={handleObjectClick} 
            modelRef={setModelRef}
            onReady={handleWorldReady}
            enableShadows={!isMobile}
            cancelloAperto={cancelloApertoFinal}
            ledSerraVerde={fotocellulaSbloccata}
            ledPortaVerde={portaIngressoAperta}
            modelYOffset={modelYOffset}
            portaIngressoAperta={portaIngressoAperta}
            portaIngressoConfig={portaIngressoConfig}
            manigliaEsternaPortaIngressoConfig={manigliaEsternaPortaIngressoConfig}
            manigliaInternaPortaIngressoConfig={manigliaInternaPortaIngressoConfig}
          />
          
          <GroundPlane onGroundReady={setGroundPlaneRef} />
          {!isMobile && <Environment preset="sunset" />}
          
          {/* Collision Visualizer - Real-time collision visualization (toggle with 'C' key) */}
          <CollisionVisualizer 
            modelRef={modelRef}
            enabled={collisionViz.enabled}
            onStatsUpdate={collisionViz.setStats}
          />
          
          {/* Collision Inspector - Advanced proximity-based inspection (toggle with 'V' key) */}
          <CollisionInspector
            modelRef={modelRef}
            enabled={inspector.enabled}
            proximityRadius={inspector.proximityRadius}
            selectedIndex={inspector.selectedIndex}
            onObjectSelected={(obj) => inspector.setSelectedObject(obj)}
            onNearbyObjectsUpdate={(objects) => inspector.setNearbyObjects(objects)}
          />
          
          {/* Sistema di selezione oggetti per Animation Editor */}
          {isAdmin && editorEnabled && modelRef.current && (
            <AnimationEditorScene
              modelRef={modelRef}
              selectedObject={selectedObject}
              onSelect={setSelectedObject}
              animationConfig={animationConfig}
              isAnimationPlaying={isAnimationPlaying}
              onAnimationComplete={() => {
                console.log('[EsternoScene] Animazione completata')
                setIsAnimationPlaying(false)
              }}
              pickDestinationMode={pickDestinationMode}
              onDestinationPicked={(worldPos) => {
                console.log('[EsternoScene] ✅ Destinazione picked:', worldPos)
                if (animationConfig?.mode === 'position' && selectedObject) {
                  const movable = getMovableNode(selectedObject)
                  const currentWorldPos = new THREE.Vector3()
                  movable.getWorldPosition(currentWorldPos)
                  
                  const newConfig = {
                    ...animationConfig,
                    startX: currentWorldPos.x,
                    startY: currentWorldPos.y,
                    startZ: currentWorldPos.z,
                    endX: worldPos.x,
                    endY: worldPos.y,
                    endZ: worldPos.z
                  }
                  setAnimationConfig(newConfig)
                }
                setPickDestinationMode(false)
              }}
            />
          )}
        </Suspense>
      </Canvas>
      
      {/* DEBUG: Model Position Control Panel - SOLO ADMIN */}
      {isAdmin && !isDebugMinimized && <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        zIndex: 1000,
        minWidth: '280px',
        border: '2px solid #00aaff',
        boxShadow: '0 0 20px rgba(0, 170, 255, 0.3)'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '10px', 
          fontSize: '14px',
          color: '#00aaff',
          borderBottom: '1px solid #00aaff',
          paddingBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🔧 DEBUG: Posizione Modello</span>
          <button
            onClick={() => setIsDebugMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffaa00',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 170, 0, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            title="Minimizza pannello"
          >
            ▼
          </button>
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#aaa' }}>Model Y Offset:</span>{' '}
          <span style={{ color: '#0f0', fontWeight: 'bold' }}>{modelYOffset.toFixed(1)}m</span>
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#aaa' }}>EyeHeight:</span>{' '}
          <span style={{ color: '#0ff', fontWeight: 'bold' }}>{eyeHeight.toFixed(1)}m</span>
        </div>
        
        {modelRef.current && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#aaa' }}>Model Group Y:</span>{' '}
            <span style={{ color: '#ff0' }}>{modelRef.current.position.y.toFixed(3)}m</span>
          </div>
        )}
        
        {liveDebugInfo && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#aaa' }}>Camera Y:</span>{' '}
            <span style={{ color: '#f0f' }}>{liveDebugInfo.position.y.toFixed(3)}m</span>
          </div>
        )}
        
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '10px', 
          borderTop: '1px solid #555',
          fontSize: '11px',
          color: '#bbb'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#0f0' }}>Modello:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>1</kbd> Alza modello (+0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>2</kbd> Abbassa modello (-0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>3</kbd> Reset (0.6m)</div>
          
          <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', color: '#0ff' }}>Altezza Occhi:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>7</kbd> Alza occhi (+0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>8</kbd> Abbassa occhi (-0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>9</kbd> Reset (0.9m)</div>
          
          <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#ff0' }}>Debug:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>\</kbd> Nascondi/Mostra debug</div>
        </div>
      </div>}
      
      {/* Pannello DEBUG minimizzato - SOLO ADMIN */}
      {isAdmin && isDebugMinimized && (
        <button
          onClick={() => setIsDebugMinimized(false)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 170, 255, 0.9)',
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '2px solid #00ffff',
            boxShadow: '0 4px 15px rgba(0, 170, 255, 0.4)',
            zIndex: 1000,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 204, 255, 1)'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 170, 255, 0.9)'
            e.target.style.transform = 'translateY(0)'
          }}
          title="Mostra pannello debug"
        >
          🔧 Debug ▲
        </button>
      )}
      
      {/* LED Indicator - shows fotocellula state (red = locked, green = unlocked) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        zIndex: 1000
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: fotocellulaSbloccata ? '#00ff00' : '#ff0000',
          boxShadow: fotocellulaSbloccata 
            ? '0 0 10px #00ff00, 0 0 20px #00ff00' 
            : '0 0 10px #ff0000, 0 0 20px #ff0000'
        }} />
        <span>Fotocellula: {fotocellulaSbloccata ? 'SBLOCCATA' : 'BLOCCATA'}</span>
      </div>
      
      {/* 🎯 SISTEMA MESSAGGI OBIETTIVO - Cancello */}
      
      {/* Message overlay - shown when clicking gate with LED red */}
      {mostraMessaggio && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: '30px 40px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          textAlign: 'center',
          maxWidth: '400px',
          zIndex: 2001,
          border: '2px solid #ff6600',
          boxShadow: '0 0 30px rgba(255, 102, 0, 0.5)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '24px' }}>👁️</div>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            L'occhio vede tutto, libera il sensore.
          </p>
        </div>
      )}
      
      {/* 🎯 OBIETTIVO CANCELLO */}
      {mostraMessaggioObiettivo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(50, 30, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #ffaa00',
          boxShadow: '0 0 40px rgba(255, 170, 0, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🎯</div>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontWeight: 'bold', fontSize: '22px', color: '#ffaa00' }}>
            Obiettivo
          </p>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '18px' }}>
            Cerca la fotocellula e sbloccala per aprire il cancello
          </p>
        </div>
      )}
      
      {/* Second message overlay - shown when fotocellula is unlocked */}
      {mostraMessaggioApri && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: '30px 40px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          textAlign: 'center',
          maxWidth: '400px',
          zIndex: 1001,
          border: '2px solid #00ff88',
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '32px' }}>✅</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ff88' }}>
            APRI CANCELLO
          </p>
        </div>
      )}
      
      {/* 🚪 Dialog modale - Conferma apertura cancello */}
      {mostraDialog && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '40px 50px',
            borderRadius: '16px',
            border: '2px solid #ff6600',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 0 40px rgba(255, 102, 0, 0.6)'
          }}>
            <h2 style={{
              color: 'white',
              marginBottom: '20px',
              fontSize: '28px',
              fontFamily: 'Arial, sans-serif'
            }}>
              🚪 Cancello
            </h2>
            
            <p style={{
              color: '#ccc',
              fontSize: '20px',
              marginBottom: '35px',
              lineHeight: '1.5',
              fontFamily: 'Arial, sans-serif'
            }}>
              Provare ad aprire il cancello?
            </p>
            
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleDialogSI}
                style={{
                  padding: '15px 50px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  backgroundColor: '#00ff88',
                  color: '#000',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4)',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#00ffaa'
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#00ff88'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)'
                }}
              >
                SI
              </button>
              
              <button
                onClick={handleDialogNO}
                style={{
                  padding: '15px 50px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 4px 15px rgba(255, 68, 68, 0.4)',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ff6666'
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ff4444'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.4)'
                }}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ⏱️ COUNTDOWN VISIBILE - Ultimi 10 secondi prima della distribuzione */}
      {countdownSeconds !== null && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1500,
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: '120px',
            color: countdownSeconds <= 3 ? '#ff4444' : '#ffaa00',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            textShadow: countdownSeconds <= 3 
              ? '0 0 40px rgba(255, 68, 68, 1), 0 0 80px rgba(255, 68, 68, 0.5)' 
              : '0 0 40px rgba(255, 170, 0, 1), 0 0 80px rgba(255, 170, 0, 0.5)',
            animation: countdownSeconds <= 3 ? 'pulseFast 0.5s ease-in-out infinite' : 'pulse 1s ease-in-out infinite'
          }}>
            {countdownSeconds}
          </div>
          <p style={{
            color: 'white',
            fontSize: '24px',
            marginTop: '20px',
            fontFamily: 'Arial, sans-serif',
            textShadow: '0 0 10px rgba(0, 0, 0, 0.8)'
          }}>
            {countdownSeconds <= 3 ? '🔥 Preparati!' : '⏳ Distribuzione imminente...'}
          </p>
        </div>
      )}
      
      {/* 🏠 Room Assignment Transition Overlay */}
      {showTransition && assignedRoom && (
        <>
          {/* Fade to black overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            opacity: fadeOpacity,
            zIndex: 2000,
            pointerEvents: 'none',
            transition: 'opacity 0.05s linear'
          }} />
          
          {/* Room assignment message */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2001,
            textAlign: 'center',
            opacity: Math.min(fadeOpacity * 2, 1), // Appare più velocemente del fade
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              🏠
            </div>
            <h1 style={{
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              fontSize: '36px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)'
            }}>
              Sei stato assegnato alla:
            </h1>
            <h2 style={{
              color: '#00ff88',
              fontFamily: 'Arial, sans-serif',
              fontSize: '56px',
              fontWeight: 'bold',
              margin: 0,
              textTransform: 'uppercase',
              textShadow: '0 0 30px rgba(0, 255, 136, 0.8)'
            }}>
              {assignedRoom === 'cucina' && '🍳 CUCINA'}
              {assignedRoom === 'soggiorno' && '🛋️ SOGGIORNO'}
              {assignedRoom === 'bagno' && '🚿 BAGNO'}
              {assignedRoom === 'camera' && '🛏️ CAMERA'}
            </h2>
            <p style={{
              color: '#aaa',
              fontFamily: 'Arial, sans-serif',
              fontSize: '18px',
              marginTop: '30px'
            }}>
              Caricamento...
            </p>
          </div>
          
          {/* CSS Animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          `}</style>
        </>
      )}
      
      {/* CSS Animations for messages and countdown */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes pulseFast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

// Componente per gestire la selezione e i visual helper nell'editor
function AnimationEditorScene({ modelRef, selectedObject, onSelect, animationConfig, isAnimationPlaying, onAnimationComplete, pickDestinationMode, onDestinationPicked }) {
  // Hook di selezione oggetti
  useObjectSelection({
    enabled: !pickDestinationMode,
    selectableObjects: modelRef.current ? [modelRef.current] : [],
    onSelect: (obj) => {
      const movable = getMovableNode(obj)
      console.log('[AnimationEditorScene] Oggetto selezionato:', movable.name)
      onSelect(movable)
    },
    onDeselect: () => {
      console.log('[AnimationEditorScene] Deselezione')
      onSelect(null)
    }
  })
  
  // Hook per pick destination
  usePositionPicker(
    pickDestinationMode,
    (worldPos) => {
      console.log('[AnimationEditorScene] ✅ Coordinate picked:', worldPos)
      if (onDestinationPicked) {
        onDestinationPicked(worldPos)
      }
    },
    () => {
      console.log('[AnimationEditorScene] Pick annullato')
    }
  )
  
  // Hook per animazione preview
  useAnimationPreview(
    selectedObject,
    animationConfig,
    isAnimationPlaying,
    onAnimationComplete
  )
  
  return (
    <group>
      {/* Highlighter per oggetto selezionato */}
      {selectedObject && (
        <ObjectHighlighter
          object={selectedObject}
          color="#00ffff"
          showBoundingBox={true}
        />
      )}
      
      {/* Helper per rotazione */}
      {selectedObject && animationConfig?.mode === 'rotation' && (
        <PivotHelper
          position={new THREE.Vector3(
            animationConfig.pivotX,
            animationConfig.pivotY,
            animationConfig.pivotZ
          )}
          axis={animationConfig.axis}
          color="#ff0000"
          interactive={false}
        />
      )}
      
      {/* Helper per posizione */}
      {selectedObject && animationConfig?.mode === 'position' && (
        <PathHelper
          startPosition={new THREE.Vector3(
            animationConfig.startX,
            animationConfig.startY,
            animationConfig.startZ
          )}
          endPosition={new THREE.Vector3(
            animationConfig.endX,
            animationConfig.endY,
            animationConfig.endZ
          )}
          color="#ffaa00"
          showMarkers={true}
        />
      )}
    </group>
  )
}