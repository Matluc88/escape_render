import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, Html, useProgress, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import CasaModel from '../3D/CasaModel'
import SerraLight from '../3D/SerraLight'
import { useFPSControls } from '../../hooks/useFPSControls'
import { usePositionCapture } from '../../hooks/usePositionCapture'
import { getCapturedPosition } from '../../utils/cameraPositioning'
import DebugExpose from '../debug/DebugExpose'
import PositionCaptureOverlay from '../UI/PositionCaptureOverlay'
import LivePositionDebug, { LivePositionReader } from '../debug/LivePositionDebug'
import AnimationEditor from '../UI/AnimationEditor'
import { useObjectSelection } from '../../hooks/useObjectSelection'
import { usePositionPicker } from '../../hooks/usePositionPicker'
import PositionPathVisualizer from '../3D/PositionPathVisualizer'
import ObjectHighlighter from '../debug/ObjectHighlighter'
import PivotHelper from '../debug/PivotHelper'
import PathHelper from '../debug/PathHelper'
import { useAnimationPreview } from '../../hooks/useAnimationPreview'
import { usePentolaTracker } from '../../hooks/usePentolaTracker'
import LoadingOverlay from '../UI/LoadingOverlay'
import CollisionDebugOverlay from '../UI/CollisionDebugOverlay'
import { getMovableNode } from '../../utils/movableNodeHelper'
import { useKitchenPuzzle } from '../../hooks/useKitchenPuzzle'
import { PuzzleLED, LED_UUIDS } from '../3D/PuzzleLED'
import useWebSocket from '../../hooks/useWebSocket'
import { useGameCompletion } from '../../hooks/useGameCompletion'

// Loading indicator component shown while the 3D model loads
function LoadingIndicator() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        minWidth: '200px'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '15px' }}>
          Caricamento cucina...
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4CAF50',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '14px', marginTop: '10px' }}>
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  )
}

// --- COMPONENTE DEBUG VISIVO ---
function DebugOverlay() {
  const { camera } = useThree()
  const [info, setInfo] = useState("")
  
  useFrame(() => {
    const r = camera.position
    setInfo(`POS: ${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}`)
  })

  return (
    <Html position={[0,0,0]} style={{ pointerEvents: 'none' }}>
      <div style={{ 
        position: 'fixed', top: '10px', left: '10px', 
        background: 'rgba(0,0,0,0.8)', color: '#0f0', 
        padding: '10px', fontFamily: 'monospace', fontSize: '14px',
        width: '300px', zIndex: 9999 
      }}>
        {info}
      </div>
    </Html>
  )
}

function FPSController({ modelRef, mobileInput, onLookAtChange, groundPlaneMesh, isMobile = false, boundaryLimits, initialPosition, initialYaw = 0, eyeHeight = 1.6, modelScale = 1, positionCaptureRef, onLoadingStateChange, portaCucinaOpen = false }) {
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
  
  // PARAMETRI UMANI STANDARD ANTI-JITTER (casa ora a scala 10x = dimensioni reali)
  const MODEL_SCALE = 1
  const RADIUS = 0.25 * MODEL_SCALE  // 25cm (50cm diametro) - più largo per passare facilmente
  const PLAYER_HEIGHT = 1.8 * MODEL_SCALE  // Altezza standard essere umano
  const MOVE_SPEED = 1.35 * MODEL_SCALE  // Camminata normale (target: 1.35 u/s horizontal speed)
  
  useEffect(() => {
    // === CASO 1: LISTE FORZATE DA CASAMODEL (Sincronizzazione perfetta!) ===
    if (modelRef && (modelRef.forcedCollidables || modelRef.forcedGrounds)) {
      console.log('[KitchenScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL');
      
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
        
        let hasMobileSmartAncestor = false;
        let node = child.parent;
        while (node) {
          const parentName = node.name?.toLowerCase() ?? '';
          if (parentName.includes('mobile smart')) {
            hasMobileSmartAncestor = true;
            break;
          }
          node = node.parent;
        }
        
        // 🎯 PATTERN COMPLETI per mirino - include TUTTI gli oggetti cliccabili
        // 🚫 ESCLUDI Humano (persona) + elementi che bloccano la vista - blocca il mirino!
        const isBlockingObject = name.includes('humano') || 
                                 name.includes('20005e44') ||  // UUID HUMANO specifico
                                 name.includes('tree') ||   // alberi serra
                                 name.includes('plant') ||  // piante decorative
                                 name.includes('leaf') ||   // foglie
                                 name.includes('arbre') ||  // albero (FR)
                                 name.includes('piano_casa') ||  // pavimento - blocca vista serra
                                 name.includes('3ec149f1') ||  // UUID PIANO_CASA
                                 name.includes('vetrata_cucina') ||  // 🚫 VETRATA - blocca frigo!
                                 name.includes('c252de07') ||  // UUID VETRATA_CUCINA
                                 name.includes('muro_cucina') ||  // 🚫 MURO_CUCINA - blocca click!
                                 name.includes('5fe64b15');  // UUID MURO_CUCINA
        
        if (!isBlockingObject && (
            name.startsWith('test') || 
            // 🍳 FORNELLI - pattern completi
            name.includes('forno') || 
            name.includes('fornelli') ||
            name.includes('feu') ||  // fuoco (FR)
            name.includes('corps') ||  // corpo (FR)
            name.includes('_32_') ||  // ID modello fornelli
            name.includes('cooktop') ||
            name.includes('piano_cottura') ||
            // 🧊 FRIGO - pattern completi + UUID
            name.includes('frigo') || 
            name.includes('sportello') ||
            name.includes('_472') ||  // Corps_472
            name.includes('36222976') ||  // Corps_472 UUID
            name.includes('ee25165a') ||  // SPORTELLO FRIGO UUID
            name.includes('942812a9') ||  // SPORTELLO_FRIGO_INFERIORE UUID
            // 🌿 SERRA - QUALSIASI grass + UUID + VASO SERRA + TERRA_ORTO
            name.includes('grass') ||  // ✅ QUALSIASI grass (non solo _20)!
            name.includes('30aac4ce') ||  // Grass_20 UUID specifico
            name.includes('2ff365de') ||  // VASO SERRA 1 → simula tasto Z
            name.includes('68ceedc2') ||  // VASO SERRA 2 → simula tasto Z
            name.includes('bef37c51') ||  // TERRA_ORTO 1 → simula tasto Z
            name.includes('18af9042') ||  // TERRA_ORTO 2 → simula tasto Z
            // Altri oggetti interattivi
            name.includes('cassetto') ||
            name.includes('finestra') ||
            name.includes('mobile smart') ||
            hasMobileSmartAncestor)) {
          interactives.push(child);
          child.userData.interactive = true;
        }
      });

      setCollisionObjects(cols);
      setGroundObjects(grnds);
      setInteractiveObjects(interactives);
      
      console.log(`[KitchenScene] ✅ Configurazione: ${cols.length} collision, ${grnds.length} grounds, ${interactives.length} interattivi`);
      return;
    }

    // === CASO 2: FALLBACK (Codice vecchio se CasaModel non manda liste) ===
    if (!modelRef || !modelRef.current) return;
    
    const collidables = []
    const grounds = []
    const interactives = []
    
    console.log('[KitchenScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)');
    
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
        
        // Mark interactive objects
        let hasMobileSmartAncestor = false
        let node = child.parent
        while (node) {
          const parentName = node.name?.toLowerCase() ?? ''
          if (parentName.includes('mobile smart')) {
            hasMobileSmartAncestor = true
            break
          }
          node = node.parent
        }
        
        if (name.startsWith('test') || 
            name.includes('forno') || 
            name.includes('frigo') || 
            name.includes('cassetto') ||
            name.includes('finestra') ||
            name.includes('mobile smart') ||
            hasMobileSmartAncestor) {
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
    
    console.log(`[KitchenScene] Ground objects (${grounds.length}):`, grounds.map(o => o.name))
    console.log(`[KitchenScene] Collidable objects (${collidables.length}):`, collidables.map(o => o.name))
    
    setCollisionObjects(collidables)
    setGroundObjects(grounds)
    setInteractiveObjects(interactives)
  }, [modelRef, groundPlaneMesh])
  
  // 🔇 LOG DISABILITATO (Opzione A - Zero log in produzione)
  // Log camera distance from ground periodically
  // const logTimerRef = useRef(0)
  // const LOG_INTERVAL = 2.0 // Log every 2 seconds
  
  // useFrame((_, delta) => {
  //   // Log camera position and distance from ground
  //   logTimerRef.current += delta
  //   if (logTimerRef.current >= LOG_INTERVAL) {
  //     logTimerRef.current = 0
  //     
  //     const cameraY = camera.position.y
  //     let minGroundDistance = Infinity
  //     
  //     // Find closest ground mesh
  //     groundObjects.forEach(ground => {
  //       const groundBox = new THREE.Box3().setFromObject(ground)
  //       const groundY = groundBox.max.y // Top of ground mesh
  //       const distance = Math.abs(cameraY - groundY)
  //       if (distance < minGroundDistance) {
  //         minGroundDistance = distance
  //       }
  //     })
  //     
  //     console.log(`[KitchenScene] 📷 Camera Y: ${cameraY.toFixed(2)} | Distance from ground: ${minGroundDistance.toFixed(2)} | Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
  //   }
  // })
  
  // Raycasting for interactive object detection
  // Throttled on mobile to improve performance (10 Hz instead of 60 Hz)
  useFrame((_, delta) => {
    if (!onLookAtChange || interactiveObjects.length === 0) return
    
    // Throttle raycasting on mobile
    if (RAYCAST_INTERVAL > 0) {
      timeSinceLastRaycastRef.current += delta
      if (timeSinceLastRaycastRef.current < RAYCAST_INTERVAL) return
      timeSinceLastRaycastRef.current = 0
    }
    
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    raycasterRef.current.set(camera.position, direction)
    raycasterRef.current.far = 5
    
    const intersects = raycasterRef.current.intersectObjects(interactiveObjects, true)
    
    if (intersects.length > 0) {
      const target = intersects[0].object
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
  
  // Callback per collision debug
  const handleCollision = (data) => {
    // Propaga i dati collisione al parent
    if (window.setCollisionData) {
      window.setCollisionData(data)
    }
  }
  
  // Usa parametri rilassati e recupera stato di caricamento
  const { isLoading, loadingProgress } = useFPSControls(
    collisionObjects,
    mobileInput,
    groundObjects,
    boundaryLimits,
    initialPosition,
    initialYaw,
    eyeHeight,
    RADIUS,
    PLAYER_HEIGHT,
    MOVE_SPEED,
    false, // disableGravity
    handleCollision // onCollision callback
  )
  
  // Notifica il parent component dello stato di caricamento
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading, loadingProgress)
    }
  }, [isLoading, loadingProgress, onLoadingStateChange])
  
  // 🔇 LOG DISABILITATO (Opzione A - Zero log in produzione)
  // Log pulito ogni 2 secondi
  // useFrame((state) => {
  //   if (Math.floor(state.clock.elapsedTime) % 2 !== 0) return;
  //   const wp = new THREE.Vector3();
  //   camera.getWorldPosition(wp);
  //   console.log(`[FPS] Pos: ${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)}`);
  // })
  
  return (
    <>
      {/* 🚪 Gestione Varco Dinamico Porta Cucina */}
      <DoorwayManager portaCucinaOpen={portaCucinaOpen} collisionObjects={collisionObjects} />
    </>
  )
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
      {/* Aumentato a 500x500 per coprire tutta la casa scalata */}
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#cccccc" polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
  )
}

export default function KitchenScene({ onObjectClick, onLookAtChange, mobileInput, isMobile = false, sessionId = '1' }) {
  const [modelRef, setModelRef] = useState({ current: null, spawnPoint: null })
  const [groundPlaneRef, setGroundPlaneRef] = useState(null)
  const [boundaryLimits, setBoundaryLimits] = useState(null)
  const positionCaptureRef = useRef(null)
  const [captureReady, setCaptureReady] = useState(false)
  const [liveDebugInfo, setLiveDebugInfo] = useState(null)
  
  // 🔄 WORLD READY STATE - Guard per sincronizzare spawn con trasformazioni CasaModel
  const [worldReady, setWorldReady] = useState(false)
  
  // 🚀 EVENT-DRIVEN: Callback invocato da CasaModel quando il mondo è pronto
  const handleWorldReady = useCallback(() => {
    console.log('[KitchenScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn')
    setWorldReady(true)
  }, [])
  
  // Stato per il loading overlay - INIZIA SUBITO COME TRUE
  const [isLoading, setIsLoading] = useState(true) // Parte da true per coprire subito
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Handler per aggiornare lo stato di caricamento
  const handleLoadingStateChange = (loading, progress) => {
    setIsLoading(loading)
    setLoadingProgress(progress)
  }
  
  // Timer per animare il progresso e nascondere l'overlay dopo 5 secondi
  useEffect(() => {
    const startTime = Date.now()
    const duration = 5000 // 5 secondi
    
    // Aggiorna progresso ogni 100ms
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(100, (elapsed / duration) * 100)
      setLoadingProgress(progress)
      
      if (elapsed >= duration) {
        clearInterval(progressInterval)
        setIsLoading(false)
        setLoadingProgress(100)
        console.log('⏱️ [KitchenScene] Loading overlay nascosto dopo 5 secondi')
      }
    }, 100)
    
    return () => clearInterval(progressInterval)
  }, []) // Solo al mount
  
  // Sistema di editing animazioni
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)
  const [animationConfig, setAnimationConfig] = useState(null)
  const [showEditorUI, setShowEditorUI] = useState(false)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [pickDestinationMode, setPickDestinationMode] = useState(false)
  
  // DEBUG: Offset Y del modello (controllabile con tastiera)
  const [modelYOffset, setModelYOffset] = useState(2.0) // Default: 2.0m (scene interne)
  
  // DEBUG: EyeHeight (altezza occhi camera) controllabile in tempo reale
  const [eyeHeight, setEyeHeight] = useState(1.4) // Default: 1.4m (cucina)
  
  // State per visibilità pannello debug
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  
  // 🎯 State per nascondere TUTTI i pannelli con tasto \
  const [hideAllPanels, setHideAllPanels] = useState(true)
  
  // 🚧 State per Collision Debug Overlay
  const [collisionDebugEnabled, setCollisionDebugEnabled] = useState(false)
  const [collisionData, setCollisionData] = useState(null)
  
  // Quando un oggetto viene selezionato, mostra l'UI
  useEffect(() => {
    if (selectedObject && editorEnabled) {
      setShowEditorUI(true)
    } else {
      setShowEditorUI(false)
    }
  }, [selectedObject, editorEnabled])
  
  // Monitora quando il sistema di cattura è pronto
  useEffect(() => {
    if (positionCaptureRef.current && !captureReady) {
      setCaptureReady(true)
    }
  }, [positionCaptureRef.current, captureReady])
  
  // === CONFIGURAZIONE FISICA STANDARD UMANO ANTI-JITTER (casa ora 10x = scala reale) ===
  const MODEL_SCALE = 1
  
  // ALTEZZA OCCHI: 1.6m standard per essere umano adulto
  const EYE_HEIGHT = 1.6 * MODEL_SCALE
  
  const COLLISION_RADIUS = 0.15 * MODEL_SCALE  // Ridotto a 15cm per passare facilmente dalle porte
  const PLAYER_HEIGHT = 1.8 * MODEL_SCALE  // Altezza totale standard
  const MOVE_SPEED = 1.35 * MODEL_SCALE  // Camminata normale (target: 1.35 u/s horizontal speed)
  
  // Stato per l'anta del mobile smart cucina (contiene la pentola)
  const [mobileSmartAntaAperta, setMobileSmartAntaAperta] = useState(false)
  
  // Stato per l'animazione della pentola verso i fornelli
  const [pentolaSuiFornelli, setPentolaSuiFornelli] = useState(false)
  
  // Stato per sportello animato (tasti 1-2) - ✅ INVERTITO per ESP32!
  const [animatedDoorOpen, setAnimatedDoorOpen] = useState(true)
  
  // ✅ Configurazione sportello 1 STABILE
  const animatedDoorConfig = useMemo(() => ({
    objectName: "sweethome3d_opening_on_hinge_1_door_511(D5F6C9BE-7802-4730-83AE-0BEB2ACAABFA)",
    mode: "rotation",
    pivotX: -2.872,
    pivotY: 0.754,
    pivotZ: 0.571,
    axis: "z",
    angle: 90,
    speed: 90,
    direction: -1
  }), [])
  
  // Stato per sportello frigo inferiore (tasti 3-4)
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(true) // ← INIZIO APERTO per enigma
  
  // 🚪 Stato per porta cucina (tasti 9-0)
  const [portaCucinaOpen, setPortaCucinaOpen] = useState(false)
  
  // 🌿 Stato Neon Serra - Controllato da tasti Z (ON) e X (OFF)
  const [neonSerraAcceso, setNeonSerraAcceso] = useState(false)
  
  // 🍳 KITCHEN PUZZLE SYSTEM - Hook integrato (sessionId viene da prop)
  // ✅ FIX: Passa parametri corretti a useWebSocket per joinSession
  const { socket } = useWebSocket(sessionId, 'cucina', 'DevPlayer')
  const { 
    puzzleStates, 
    ledStates, 
    completeFornelli, 
    closeFrigo, 
    activateSerra,
    resetPuzzles  // ← Aggiungi reset
  } = useKitchenPuzzle(sessionId, socket)
  
  // 🏆 GAME COMPLETION SYSTEM - LED globale porta
  const gameCompletion = useGameCompletion(sessionId, socket)
  
  // 🗄️ ESP32 ANTA MOBILE + PENTOLA - Listener WebSocket per animazioni
  useEffect(() => {
    if (!socket) return
    
    const handleAnimationUpdate = (data) => {
      console.log('[KitchenScene] 📡 WebSocket animation_update ricevuto:', data)
      
      // 🗄️ ANTA MOBILE - Toggle apertura/chiusura
      if (data.animation_type === 'anta_toggle') {
        console.log('[KitchenScene] 🗄️ ESP32: Toggle anta mobile decorativa')
        setAnimatedDoorOpen(prev => {
          const newState = !prev
          console.log('[KitchenScene] 🚪 Anta:', prev ? 'APERTA→CHIUSA' : 'CHIUSA→APERTA', '→', newState)
          return newState
        })
      }
      
      // 🍳 PENTOLA - Spostamento sui fornelli
      if (data.animation_type === 'pentola_fornelli') {
        console.log('[KitchenScene] 🍳 ESP32: Pentola sui fornelli')
        setPentolaSuiFornelli(true)
        console.log('[KitchenScene] ✅ Animazione pentola attivata (come tasto 5)')
      }
      
      // 🌿 SERRA - Accensione neon verde 3D
      if (data.animation_type === 'serra_light') {
        console.log('[KitchenScene] 🌿 ESP32/Microfono: Serra 3D ON')
        setNeonSerraAcceso(true)
        console.log('[KitchenScene] ✅ Neon serra 3D attivato (luce verde pulsante - come tasto Z)')
      }
    }
    
    socket.on('animation_update', handleAnimationUpdate)
    console.log('[KitchenScene] ✅ Listener ESP32 (anta + pentola) registrato')
    
    return () => {
      socket.off('animation_update', handleAnimationUpdate)
      console.log('[KitchenScene] 🔌 Listener ESP32 (anta + pentola) rimosso')
    }
  }, [socket])
  
  // 📥 LISTENER WebSocket - Sincronizzazione Player-to-Player
  useEffect(() => {
    if (!socket) return
    
    const handleAnimationSync = (data) => {
      // Filtra solo eventi per questo room
      if (data.room !== 'cucina') return
      
      console.log('[KitchenScene] 📥 Sync ricevuto da:', data.triggeredBy, '→', data.objectName, data.animationState)
      
      // 🍳 Pentola sync
      if (data.objectName === 'pentola') {
        if (data.animationState === 'sui_fornelli') {
          setPentolaSuiFornelli(true)
          console.log('[KitchenScene] ✅ Pentola sincronizzata: SUI FORNELLI')
        } else if (data.animationState === 'posto_originale') {
          setPentolaSuiFornelli(false)
          console.log('[KitchenScene] ✅ Pentola sincronizzata: POSTO ORIGINALE')
        }
      }
      
      // 🚪 Anta mobile sync
      if (data.objectName === 'anta_mobile') {
        setAnimatedDoorOpen(data.animationState === 'open')
        console.log('[KitchenScene] ✅ Anta mobile sincronizzata:', data.animationState)
      }
      
      // 🧊 Frigo sync
      if (data.objectName === 'frigo') {
        setFridgeDoorOpen(data.animationState === 'open')
        console.log('[KitchenScene] ✅ Frigo sincronizzato:', data.animationState)
      }
      
      // 🚪 Porta cucina sync
      if (data.objectName === 'porta') {
        setPortaCucinaOpen(data.animationState === 'open')
        console.log('[KitchenScene] ✅ Porta cucina sincronizzata:', data.animationState)
      }
      
      // 🌿 Serra sync
      if (data.objectName === 'serra') {
        setNeonSerraAcceso(data.animationState === 'accesa')
        console.log('[KitchenScene] ✅ Serra sincronizzata:', data.animationState)
      }
    }
    
    socket.on('animationStateChanged', handleAnimationSync)
    console.log('[KitchenScene] ✅ Listener player-to-player registrato')
    
    return () => {
      socket.off('animationStateChanged', handleAnimationSync)
      console.log('[KitchenScene] 🔌 Listener player-to-player rimosso')
    }
  }, [socket])
  
  // 🔄 AUTO-RESET al caricamento scena
  useEffect(() => {
    if (resetPuzzles) {
      console.log('[KitchenScene] 🔄 Auto-reset al mount')
      resetPuzzles('full')
      // Reset anche animazioni locali
      setPentolaSuiFornelli(false)
      setFridgeDoorOpen(true)
      setNeonSerraAcceso(false)
    }
  }, []) // Solo al mount
  
  // 🍳 TRIGGER: Quando pentola arriva sui fornelli → completa enigma
  useEffect(() => {
    console.log('[KitchenScene] 🔍 Trigger fornelli check:', {
      pentolaSuiFornelli,
      fornelliState: puzzleStates.fornelli,
      ledState: ledStates.fornelli,
      allPuzzleStates: puzzleStates,
      allLedStates: ledStates,
      shouldTrigger: pentolaSuiFornelli && puzzleStates.fornelli === 'active'
    })
    
    if (pentolaSuiFornelli && puzzleStates.fornelli === 'active') {
      console.log('[KitchenScene] 🔥 Pentola sui fornelli + enigma attivo → COMPLETO FORNELLI')
      completeFornelli()
      
      // ✅ MARCA ENIGMA COME COMPLETATO LOCALMENTE (anche se backend fallisce)
      console.log('[KitchenScene] ✅ Marcando enigma 1 come completato LOCALMENTE')
      setEnigma1Completato(true)
      
      // ✅ MOSTRA MESSAGGIO SUCCESSO IMMEDIATAMENTE!
      console.log('[KitchenScene] ✅ Mostrando messaggio successo fornelli')
      setMessaggioSuccessoFornelli(true)
      setTimeout(() => {
        setMessaggioSuccessoFornelli(false)
      }, 3000)
    }
  }, [pentolaSuiFornelli, puzzleStates.fornelli, completeFornelli, ledStates])
  
  // 🧊 TRIGGER: Quando frigo si chiude → completa enigma
  // ✅ FIX: Usa useRef per tracciare SOLO la transizione aperto→chiuso
  const prevFridgeState = useRef(true) // Parte aperto (true)
  
  useEffect(() => {
    // Rileva SOLO il cambio aperto→chiuso (transizione)
    if (prevFridgeState.current === true && fridgeDoorOpen === false) {
      if (puzzleStates.frigo === 'active') {
        console.log('[KitchenScene] 🧊 TRANSIZIONE rilevata: aperto→chiuso')
        closeFrigo()
        
        // ✅ MARCA ENIGMA 2 COME COMPLETATO LOCALMENTE (anche se backend fallisce)
        console.log('[KitchenScene] ✅ Marcando enigma 2 come completato LOCALMENTE')
        setEnigma2Completato(true)
        
        // ✅ MOSTRA MESSAGGIO SUCCESSO IMMEDIATAMENTE!
        console.log('[KitchenScene] ✅ Mostrando messaggio successo frigo')
        setMessaggioSuccessoFrigo(true)
        setTimeout(() => {
          setMessaggioSuccessoFrigo(false)
        }, 3000)
      }
    }
    // Aggiorna il ref per il prossimo ciclo
    prevFridgeState.current = fridgeDoorOpen
  }, [fridgeDoorOpen, puzzleStates.frigo, closeFrigo])
  
  // 🌿 CARICAMENTO STATO INIZIALE SERRA - Se già completata, accendi luce
  useEffect(() => {
    // ESEGUI SEMPRE al mount/update per verificare se già solved
    if (puzzleStates.serra === 'solved' && !neonSerraAcceso) {
      console.log('[KitchenScene] 🌿 Serra già completata nel DB → Accendo luce 3D automaticamente')
      setNeonSerraAcceso(true)
    }
  }, [puzzleStates.serra, neonSerraAcceso]) // ← Aggiungi neonSerraAcceso alle dependencies!
  
  // 🌿 TRIGGER: Quando serra si accende → completa enigma
  useEffect(() => {
    if (neonSerraAcceso && puzzleStates.serra === 'active') {
      console.log('[KitchenScene] 🌿 Serra accesa + enigma attivo → COMPLETO SERRA')
      activateSerra()
      
      // ✅ MARCA ENIGMA 3 COME COMPLETATO LOCALMENTE (anche se backend fallisce)
      console.log('[KitchenScene] ✅ Marcando enigma 3 come completato LOCALMENTE')
      setEnigma3Completato(true)
    }
  }, [neonSerraAcceso, puzzleStates.serra, activateSerra])
  
  // 🎯 TRIGGER MESSAGGI SUCCESSO - Monitora transizioni di stato per mostrare feedback
  const prevPuzzleStates = useRef({ fornelli: 'locked', frigo: 'locked', serra: 'locked' })
  
  useEffect(() => {
    // 🍳 FORNELLI: active/locked → solved
    if (prevPuzzleStates.current.fornelli !== 'solved' && puzzleStates.fornelli === 'solved') {
      console.log('[KitchenScene] ✅ Fornelli completato! Mostra messaggio successo')
      setMessaggioSuccessoFornelli(true)
      setTimeout(() => setMessaggioSuccessoFornelli(false), 3000)
    }
    
    // 🧊 FRIGO: active/locked → solved
    if (prevPuzzleStates.current.frigo !== 'solved' && puzzleStates.frigo === 'solved') {
      console.log('[KitchenScene] ✅ Frigo completato! Mostra messaggio successo')
      setMessaggioSuccessoFrigo(true)
      setTimeout(() => setMessaggioSuccessoFrigo(false), 3000)
    }
    
    // 🌿 SERRA: active/locked → solved (messaggio più lungo con animazione)
    if (prevPuzzleStates.current.serra !== 'solved' && puzzleStates.serra === 'solved') {
      console.log('[KitchenScene] ✅ Serra completata! Mostra messaggio successo FINALE')
      setMessaggioSuccessoSerra(true)
      setTimeout(() => setMessaggioSuccessoSerra(false), 5000) // 5 secondi per messaggio finale
    }
    
    // Aggiorna ref per il prossimo ciclo
    prevPuzzleStates.current = { ...puzzleStates }
  }, [puzzleStates])
  
  // 🌿 Stato enigma serra - 'locked' | 'active' | 'solved'
  const [serraState, setSerraState] = useState('active')  // Default: active (verde normale)
  
  // 🎯 STATI PER MESSAGGI UI - Sistema indizi cucina
  const [messaggioFornelli, setMessaggioFornelli] = useState(false)
  const [messaggioFrigo, setMessaggioFrigo] = useState(false)
  const [messaggioSerra, setMessaggioSerra] = useState(false)  // ← Aggiunto indizio serra!
  const [messaggioObiettivoFornelli, setMessaggioObiettivoFornelli] = useState(false)  // ← NUOVO obiettivo
  const [messaggioObiettivoFrigo, setMessaggioObiettivoFrigo] = useState(false)  // ← NUOVO obiettivo
  const [messaggioObiettivoSerra, setMessaggioObiettivoSerra] = useState(false)  // ← NUOVO obiettivo
  const [messaggioConfermeFrigo, setMessaggioConfermeFrigo] = useState(false)  // ← NUOVO: messaggio SI/NO
  const [messaggioSuccessoFornelli, setMessaggioSuccessoFornelli] = useState(false)
  const [messaggioSuccessoFrigo, setMessaggioSuccessoFrigo] = useState(false)
  const [messaggioSuccessoSerra, setMessaggioSuccessoSerra] = useState(false)
  const [messaggioBloccoFrigo, setMessaggioBloccoFrigo] = useState(false)
  const [messaggioBloccoSerra, setMessaggioBloccoSerra] = useState(false)
  
  // 🎯 STATE per tracciare cosa stai guardando con il mirino (come EsternoScene)
  const [currentLookTarget, setCurrentLookTarget] = useState(null)
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGI - Ref per memorizzare gli interval (come bagno)
  const fornelliRepeatIntervalRef = useRef(null)
  const frigoRepeatIntervalRef = useRef(null)
  const serraRepeatIntervalRef = useRef(null)
  
  // 🚫 GUARD: Impedisce messaggio conferma frigo multiplo
  const confermaFrigoMostrata = useRef(false)
  
  // 🎯 STATO SEQUENZA ENIGMI - Traccia completamento per far partire il successivo
  const [enigma1Avviato, setEnigma1Avviato] = useState(false)  // ← NUOVO: guard primo enigma
  const [enigma1Completato, setEnigma1Completato] = useState(false)
  const [enigma2Avviato, setEnigma2Avviato] = useState(false)
  const [enigma2Completato, setEnigma2Completato] = useState(false)
  const [enigma3Avviato, setEnigma3Avviato] = useState(false)
  const [enigma3Completato, setEnigma3Completato] = useState(false)
  
  // ✅ Configurazione sportello frigo STABILE (dati da modalità Avanzata)
  const fridgeDoorConfig = useMemo(() => ({
    objectName: "SPORTELLO_FRIGO_INFERIORE(942812A9-5DFF-4798-9B55-D5C8DE35CC5A)",
    mode: "rotation",
    pivotX: -0.947,
    pivotY: 0.767,
    pivotZ: 1.353,
    axis: "z",
    angle: 105,
    speed: 105,
    direction: 1
  }), [])
  
  // 🚪 Configurazione porta cucina STABILE (dati da Animation Editor V2.0)
  const portaCucinaConfig = useMemo(() => ({
    objectName: "PORTA_CUCINA(4677853D-8C06-4363-BBE7-FACF26F193E9)",
    mode: "rotation",
    pivotX: -0.650,
    pivotY: 0.543,
    pivotZ: 0.251,
    axis: "z",
    angle: 90,
    speed: 90,
    direction: 1,
    // 🔑 UUID delle maniglie da attaccare alla porta
    handleUUIDs: [
      "FBAB49BE-B1B7-4804-BBA0-036A7E466B8D",
      "7E0BD5A6-FCFE-4CE5-B78D-5BB8987EFEA4"
    ]
  }), [])
  
  // 🎯 CONSOLIDATED Keyboard listener - TUTTI I TASTI IN UN SOLO HANDLER
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      
      // 🎯 Tasto \ (backslash) - Toggle TUTTI i pannelli
      if (event.key === '\\') {
        event.preventDefault()
        event.stopPropagation()
        setHideAllPanels(prev => {
          const newState = !prev
          console.log('[KitchenScene] 🎯 Tasto \\ - ' + (newState ? 'NASCONDO' : 'MOSTRO') + ' tutti i pannelli')
          return newState
        })
        return
      }
      
      // Tasto E - Toggle Animation Editor
      if (key === 'e') {
        event.preventDefault()
        event.stopPropagation()
        setEditorEnabled(prev => {
          const newState = !prev
          console.log('[KitchenScene] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
          if (!newState) {
            setSelectedObject(null)
            setShowEditorUI(false)
          }
          return newState
        })
        return
      }
      
      // Tasto P - Toggle pannello debug
      if (key === 'p') {
        event.preventDefault()
        event.stopPropagation()
        setShowDebugPanel(prev => !prev)
        console.log('[KitchenScene] Pannello debug:', !showDebugPanel ? 'APERTO' : 'CHIUSO')
        return
      }
      
      // 🚧 Tasto C - Toggle Collision Debug Overlay
      if (key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        setCollisionDebugEnabled(prev => {
          const newState = !prev
          console.log('[KitchenScene] 🚧 Collision Debug:', newState ? 'ATTIVATO' : 'DISATTIVATO')
          return newState
        })
        return
      }
      
      // 🌿 Tasti Z e X - Controllo Neon Serra
      if (key === 'z') {
        event.preventDefault()
        event.stopPropagation()
        setNeonSerraAcceso(true)
        console.log('[KitchenScene] 🌿 Serra ACCESA ✅ (luce verde + particelle)')
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'serra',
            animationState: 'accesa',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: serra → accesa')
        }
        return
      }
      if (key === 'x') {
        event.preventDefault()
        event.stopPropagation()
        setNeonSerraAcceso(false)
        console.log('[KitchenScene] ⚫ Serra SPENTA')
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'serra',
            animationState: 'spenta',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: serra → spenta')
        }
        return
      }
      
      // 🔄 Tasto R - Reset Kitchen Puzzles (DEBUG)
      if (key === 'r') {
        event.preventDefault()
        event.stopPropagation()
        console.log('[KitchenScene] 🔄 Tasto R - RESET PUZZLE!')
        resetPuzzles('full')
        // Reset anche animazioni locali
        setPentolaSuiFornelli(false)
        setFridgeDoorOpen(true)
        setNeonSerraAcceso(false)
        return
      }
      
      // Tasto 5 - Pentola VAI AI FORNELLI (per ESP32)
      if (event.key === '5') {
        console.log('[KitchenScene] ⚡ Tasto 5 - Pentola AI FORNELLI')
        setPentolaSuiFornelli(true)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'pentola',
            animationState: 'sui_fornelli',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: pentola → sui_fornelli')
        }
      }
      
      // Tasto 6 - Pentola TORNA A CASA (per ESP32)
      if (event.key === '6') {
        console.log('[KitchenScene] 🏠 Tasto 6 - Pentola AL POSTO ORIGINALE')
        setPentolaSuiFornelli(false)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'pentola',
            animationState: 'posto_originale',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: pentola → posto_originale')
        }
      }
      
      // Tasti 1 e 2 - Animazione sportello 1
      if (event.key === '1') {
        console.log('[KitchenScene] 🚪 Tasto 1 - Apri sportello 1')
        setAnimatedDoorOpen(true)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'anta_mobile',
            animationState: 'open',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: anta_mobile → open')
        }
      }
      if (event.key === '2') {
        console.log('[KitchenScene] 🚪 Tasto 2 - Chiudi sportello 1')
        setAnimatedDoorOpen(false)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'anta_mobile',
            animationState: 'closed',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: anta_mobile → closed')
        }
      }
      
      // Tasti 3 e 4 - Animazione sportello frigo
      if (event.key === '3') {
        console.log('[KitchenScene] 🧊 Tasto 3 - Apri sportello frigo')
        setFridgeDoorOpen(true)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'frigo',
            animationState: 'open',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: frigo → open')
        }
      }
      if (event.key === '4') {
        console.log('[KitchenScene] 🧊 Tasto 4 - Chiudi sportello frigo')
        setFridgeDoorOpen(false)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'frigo',
            animationState: 'closed',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: frigo → closed')
        }
      }
      
      // Tasti 9 e 0 - Animazione porta cucina
      if (event.key === '9') {
        console.log('[KitchenScene] 🚪 Tasto 9 - Apri porta cucina')
        setPortaCucinaOpen(true)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'porta',
            animationState: 'open',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: porta → open')
        }
      }
      if (event.key === '0') {
        console.log('[KitchenScene] 🚪 Tasto 0 - Chiudi porta cucina')
        setPortaCucinaOpen(false)
        
        // 📤 SYNC WebSocket
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'cucina',
            objectName: 'porta',
            animationState: 'closed',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[KitchenScene] 📤 Sync emit: porta → closed')
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDebugPanel]) // Dependency per avere il valore corretto nel log
  
  useEffect(() => {
    if (!modelRef.current) return
    
    // Update world matrices to ensure bounding box reflects repositioned model
    modelRef.current.updateWorldMatrix(true, true)
    
    const box = new THREE.Box3().setFromObject(modelRef.current)
    
    const limits = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z
    }
    
    console.log('[Kitchen] Bounding box limits:', limits)
    console.log('[Kitchen] Model spawnPoint:', modelRef.spawnPoint)
    console.log('[Kitchen] Using FIXED params: eyeHeight=', EYE_HEIGHT, 'moveSpeed=', MOVE_SPEED, 'collisionRadius=', COLLISION_RADIUS)
    
    setBoundaryLimits(limits)
  }, [modelRef])
  
  // State per spawn position (caricato async da API)
  const [spawnPosition, setSpawnPosition] = useState(null)
  const [hasCapturedPosition, setHasCapturedPosition] = useState(false)
  
  // 🔒 Guard per prevenire doppio caricamento con StrictMode
  const spawnLoadedRef = useRef(false)
  
  // Carica spawn position async all'avvio
  useEffect(() => {
    // 🛡️ GUARD: Previene doppio mount causato da React.StrictMode in sviluppo
    if (spawnLoadedRef.current) {
      console.log('🔒 [KitchenScene] Spawn già caricato, skip doppio mount (StrictMode)')
      return
    }
    spawnLoadedRef.current = true
    
    const loadSpawnPosition = async () => {
      console.log('🔍 [KitchenScene] CARICAMENTO spawn position async - START')
      
      try {
        // getCapturedPosition ora è async e carica da API
        const captured = await getCapturedPosition('cucina')
        console.log('🔍 [KitchenScene] getCapturedPosition("cucina") returned:', captured)
        
        if (captured) {
          const result = {
            x: captured.position.x,
            y: captured.position.y,
            z: captured.position.z
          }
          console.log('✅ [KitchenScene] Usando coordinate da API/cache:', result)
          setSpawnPosition(result)
          setHasCapturedPosition(true)
        } else {
          // Fallback se API non disponibile
          const FALLBACK_SPAWN = { x: 0, y: 0, z: 0 }
          console.warn('⚠️ [KitchenScene] NESSUNA coordinata trovata! Usando fallback:', FALLBACK_SPAWN)
          setSpawnPosition(FALLBACK_SPAWN)
          setHasCapturedPosition(false)
        }
      } catch (error) {
        console.error('❌ [KitchenScene] Errore caricamento spawn:', error)
        // Fallback in caso di errore
        setSpawnPosition({ x: 0, y: 0, z: 0 })
        setHasCapturedPosition(false)
      }
      
      console.log('🔍 [KitchenScene] CARICAMENTO spawn position - END')
    }
    
    loadSpawnPosition()
  }, []) // Solo al mount
  
  // 🔄 CONVERSIONE LOCAL → WORLD quando entrambi modelRef E spawnPosition sono pronti
  const [spawnWorldPosition, setSpawnWorldPosition] = useState(null)
  
  useEffect(() => {
    console.log('[KitchenScene] 🔍 DIAGNOSTIC A - useEffect conversione triggered')
    console.log('[KitchenScene] 🔍 DIAGNOSTIC A - Condizioni:', {
      modelRef: !!modelRef?.current,
      spawnPosition: !!spawnPosition,
      worldReady
    })
    
    // ✅ GUARD: Aspetta che ENTRAMBI siano pronti
    if (!modelRef?.current || !spawnPosition || !worldReady) {
      console.log('[KitchenScene] 🔍 DIAGNOSTIC B1 - Guard: Aspettando prerequisiti per conversione')
      return
    }
    
    console.log('[KitchenScene] 🔍 DIAGNOSTIC B2 - Guard PASSED - Inizio conversione')
    
    // 🔬 CONVERSIONE LOCAL → WORLD (FIX CONTRATTO DATI)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[KitchenScene] 🔄 CONVERSIONE LOCAL → WORLD')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const spawnLocal = new THREE.Vector3(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    )
    
    console.log('[KitchenScene] 🔍 DIAGNOSTIC B3 - INPUT RAW/LOCAL:', {
      x: spawnLocal.x.toFixed(3),
      y: spawnLocal.y.toFixed(3),
      z: spawnLocal.z.toFixed(3)
    })
    
    // 🎯 APPLICA CONVERSIONE
    const spawnWorld = modelRef.current.localToWorld(spawnLocal.clone())
    
    console.log('[KitchenScene] 🔍 DIAGNOSTIC C - OUTPUT WORLD (dopo localToWorld):', {
      x: spawnWorld.x.toFixed(3),
      y: spawnWorld.y.toFixed(3),
      z: spawnWorld.z.toFixed(3)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 🎯 SALVA COORDINATE WORLD (pronte per FPSController)
    setSpawnWorldPosition({
      x: spawnWorld.x,
      y: spawnWorld.y,
      z: spawnWorld.z
    })
    
  }, [modelRef?.current, spawnPosition, worldReady])
  
  // ✅ FIX DEADLOCK: Usa spawnPosition (RAW) per Canvas render, non spawnWorldPosition
  const safeSpawnPosition = spawnPosition
  
  // State per yaw (caricato async insieme a spawn position)
  const [initialYaw, setInitialYaw] = useState(1.57) // Default: 90 gradi
  
  // Carica yaw async insieme a spawn position
  useEffect(() => {
    const loadYaw = async () => {
      try {
        const captured = await getCapturedPosition('cucina')
        if (captured && captured.yaw !== undefined) {
          console.log('[Kitchen] ✅ Usando yaw da API:', captured.yaw, 'radianti (', (captured.yaw * 180 / Math.PI).toFixed(1), 'gradi)')
          setInitialYaw(captured.yaw)
        } else {
          console.log('[Kitchen] Using default yaw: 1.57 radians (90 degrees)')
        }
      } catch (error) {
        console.error('[Kitchen] Errore caricamento yaw:', error)
      }
    }
    
    loadYaw()
  }, [])
  
  // Handler per il click sull'anta del mobile smart cucina
  const handleMobileSmartAntaClick = (objectName) => {
    // ✅ FIX: Verifica che objectName sia una stringa
    if (typeof objectName !== 'string') {
      console.warn('[KitchenScene] objectName non è una stringa:', typeof objectName)
      return
    }
    
    const name = objectName.toLowerCase()
    // Check if clicked on mobile smart cucina anta
    if (name.includes('mobile smart cucina anta') || 
        name.includes('sweethome3d_opening_on_hinge_1_door_511')) {
      console.log('[KitchenScene] Mobile smart anta clicked, toggling:', !mobileSmartAntaAperta)
      setMobileSmartAntaAperta(prev => !prev)
    }
  }
  
  // 🎯 SISTEMA INDIZI CUCINA - Click handler con controllo stati sequenziali
  const handleKitchenPuzzleClick = (objectName) => {
    if (typeof objectName !== 'string') return
    
    const name = objectName.toLowerCase()
    console.log('[KitchenScene] 🎯 Click puzzle handler:', name, 'Stati:', puzzleStates)
    
    // 🔴 INDIZIO 1: FORNELLI (sempre accessibile - parte come 'active')
    // Pattern: "forno", "fornelli", "feu" (fuoco FR), "corps" (corpo FR), "_32_" (ID modello)
    if (name.includes('forno') || name.includes('fornelli') || name.includes('feu') || name.includes('corps') || name.includes('cooktop') || name.includes('piano_cottura') || name.includes('_32_')) {
      console.log('[KitchenScene] 🍳 Click su FORNELLI, stato:', puzzleStates.fornelli, 'objectName:', objectName)
      
      if (puzzleStates.fornelli === 'active') {
        // ✅ Attivo - mostra sequenza iniziale → obiettivo (come camera)
        setMessaggioFornelli(true)
        setTimeout(() => {
          setMessaggioFornelli(false)
          setMessaggioObiettivoFornelli(true)
          // Obiettivo sparisce dopo 5 secondi
          setTimeout(() => setMessaggioObiettivoFornelli(false), 5000)
        }, 3000)
      }
      // Se già 'solved', non mostrare nulla (già completato)
    }
    
    // 🔵 INDIZIO 2: FRIGO (accessibile solo se 'active', bloccato se 'locked')
    // Pattern: "frigo", "sportello", + UUIDs specifici
    const isFrigoObject = name.includes('frigo') || 
                          name.includes('sportello') || 
                          name.includes('_472') ||  // Corps_472 UUID pattern
                          name.includes('36222976') ||  // Corps_472 full UUID
                          name.includes('ee25165a') ||  // SPORTELLO FRIGO UUID
                          name.includes('942812a9');    // SPORTELLO_FRIGO_INFERIORE UUID
    
    if (isFrigoObject && fridgeDoorOpen) {
      console.log('[KitchenScene] 🧊 Click su FRIGO, stato:', puzzleStates.frigo, 'objectName:', objectName)
      
      if (puzzleStates.frigo === 'locked') {
        // 🚫 BLOCCATO - mostra messaggio errore
        console.log('[KitchenScene] 🚫 Frigo bloccato! Mostra messaggio')
        setMessaggioBloccoFrigo(true)
        setTimeout(() => setMessaggioBloccoFrigo(false), 3000)
      } else if (puzzleStates.frigo === 'active') {
        // ✅ Attivo - mostra sequenza iniziale → obiettivo → conferma SI/NO
        setMessaggioFrigo(true)
        setTimeout(() => {
          setMessaggioFrigo(false)
          setMessaggioObiettivoFrigo(true)
          // Dopo 5 secondi mostra il messaggio conferma (SOLO se non già mostrato)
          setTimeout(() => {
            setMessaggioObiettivoFrigo(false)
            // 🚫 GUARD: Mostra conferma SOLO se non già fatto
            if (!confermaFrigoMostrata.current) {
              console.log('[KitchenScene] 🧊 Mostro conferma frigo (PRIMA VOLTA)')
              setMessaggioConfermeFrigo(true)
              confermaFrigoMostrata.current = true  // ← MARCA COME MOSTRATO
            } else {
              console.log('[KitchenScene] 🚫 Conferma frigo GIÀ MOSTRATA - skip')
            }
          }, 5000)
        }, 3000)
      }
      // Se già 'solved', non mostrare nulla
    }
    
    // 🟢 INDIZIO 3: SERRA (accessibile solo se 'active', bloccato se 'locked')
    // Pattern: QUALSIASI "grass" + VASO SERRA + TERRA_ORTO (simulano tasto Z)
    const isSerraObject = name.includes('grass') ||  // ✅ QUALSIASI grass (non solo _20)
                          name.includes('30aac4ce') ||  // UUID specifico Grass_20
                          name.includes('2ff365de') ||  // VASO SERRA 1 → simula tasto Z
                          name.includes('68ceedc2') ||  // VASO SERRA 2 → simula tasto Z
                          name.includes('bef37c51') ||  // TERRA_ORTO 1 → simula tasto Z
                          name.includes('18af9042');    // TERRA_ORTO 2 → simula tasto Z
    
    if (isSerraObject) {
      console.log('[KitchenScene] 🌿 Click su SERRA/VASO, stato:', puzzleStates.serra, 'objectName:', objectName)
      
      if (puzzleStates.serra === 'locked') {
        // 🚫 BLOCCATO - mostra messaggio errore
        console.log('[KitchenScene] 🚫 Serra bloccata! Mostra messaggio')
        setMessaggioBloccoSerra(true)
        setTimeout(() => setMessaggioBloccoSerra(false), 3000)
      } else if (puzzleStates.serra === 'active') {
        // ✅ Attivo - mostra sequenza iniziale → obiettivo (come camera)
        setMessaggioSerra(true)
        setTimeout(() => {
          setMessaggioSerra(false)
          setMessaggioObiettivoSerra(true)
          // Obiettivo sparisce dopo 5 secondi
          setTimeout(() => setMessaggioObiettivoSerra(false), 5000)
        }, 3000)
      }
      // Se già 'solved', non mostrare nulla
    }
  }
  
  // 🎯 Handler per onLookAtChange - Salva cosa sto guardando con il mirino
  const handleLookAtChange = (targetName) => {
    setCurrentLookTarget(targetName)
    // Chiama anche il parent handler se fornito
    if (onLookAtChange) {
      onLookAtChange(targetName, targetName)
    }
  }
  
  // Wrapper per onObjectClick che gestisce tutta la logica
  const handleObjectClick = (objectName) => {
    // 🎯 Se objectName è null/undefined, usa quello che sto guardando con il mirino!
    const targetObject = objectName || currentLookTarget
    
    if (!targetObject) {
      console.log('[KitchenScene] Click senza target (né mouse né mirino)')
      return
    }
    
    console.log('[KitchenScene] 🎯 Click ricevuto:', {
      fromMouse: objectName,
      fromCrosshair: currentLookTarget,
      used: targetObject
    })
    
    handleMobileSmartAntaClick(targetObject)
    handleKitchenPuzzleClick(targetObject) // ← Usa target corretto
    // Chiama anche il parent handler se fornito
    if (onObjectClick) {
      onObjectClick(targetObject)
    }
  }
  
  // 🚧 Esponi setCollisionData globalmente per il callback di FPSController
  useEffect(() => {
    window.setCollisionData = setCollisionData
    return () => {
      delete window.setCollisionData
    }
  }, [])
  
  // 🎯 1️⃣ AVVIO AUTOMATICO PRIMO ENIGMA - All'inizio della scena (come bagno)
  useEffect(() => {
    console.log('[KitchenScene] 🔍 Check avvio primo enigma - isLoading:', isLoading, 'spawnPosition:', spawnPosition, 'enigma1Avviato:', enigma1Avviato)
    
    if (!isLoading && safeSpawnPosition && puzzleStates.fornelli && !enigma1Avviato) {
      // Aspetta che la scena sia caricata, poi avvia primo enigma
      console.log('[KitchenScene] ✅ Condizioni soddisfatte! Avvio timer per primo enigma...')
      
      const timer = setTimeout(() => {
        console.log('[KitchenScene] 🎯 ⏰ TIMER SCADUTO - Avvio automatico PRIMO ENIGMA (Fornelli)')
        setEnigma1Avviato(true)  // ← GUARD: Impedisce re-esecuzioni (dentro timer!)
        setMessaggioFornelli(true)
        console.log('[KitchenScene] 📢 Messaggio iniziale fornelli ATTIVATO')
        setTimeout(() => {
          console.log('[KitchenScene] 📢 Nascondo messaggio iniziale, mostro obiettivo')
          setMessaggioFornelli(false)
          setMessaggioObiettivoFornelli(true)
          setTimeout(() => {
            console.log('[KitchenScene] 📢 Nascondo messaggio obiettivo')
            setMessaggioObiettivoFornelli(false)
          }, 5000)
        }, 3000)
      }, 1000) // 1 secondo dopo il caricamento
      
      return () => clearTimeout(timer)
    } else {
      console.log('[KitchenScene] ⚠️ Condizioni NON soddisfatte per avvio primo enigma')
    }
  }, [isLoading, safeSpawnPosition, puzzleStates.fornelli, enigma1Avviato])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 1 (Fornelli)
  const [fornelliRepeatStarted, setFornelliRepeatStarted] = useState(false)
  
  useEffect(() => {
    if (messaggioObiettivoFornelli && !fornelliRepeatStarted && !enigma1Completato) {
      console.log('[KitchenScene] 🔄 Avvio ripetizione messaggio fornelli (ogni 15s)')
      setFornelliRepeatStarted(true)
      
      fornelliRepeatIntervalRef.current = setInterval(() => {
        console.log('[KitchenScene] 🔄 Ripeto messaggio obiettivo fornelli')
        setMessaggioObiettivoFornelli(true)
        setTimeout(() => setMessaggioObiettivoFornelli(false), 5000)
      }, 15000)
    }
  }, [messaggioObiettivoFornelli, fornelliRepeatStarted, enigma1Completato])
  
  useEffect(() => {
    if (enigma1Completato && fornelliRepeatIntervalRef.current) {
      console.log('[KitchenScene] 🛑 Stop ripetizione messaggio fornelli (enigma completato)')
      clearInterval(fornelliRepeatIntervalRef.current)
      fornelliRepeatIntervalRef.current = null
      setFornelliRepeatStarted(false)
      setMessaggioObiettivoFornelli(false) // ← Nasconde anche il messaggio corrente!
    }
  }, [enigma1Completato])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 2 (Frigo)
  const [frigoRepeatStarted, setFrigoRepeatStarted] = useState(false)
  
  useEffect(() => {
    if (messaggioObiettivoFrigo && !frigoRepeatStarted && !enigma2Completato) {
      console.log('[KitchenScene] 🔄 Avvio ripetizione messaggio frigo (ogni 15s)')
      setFrigoRepeatStarted(true)
      
      frigoRepeatIntervalRef.current = setInterval(() => {
        console.log('[KitchenScene] 🔄 Ripeto messaggio obiettivo frigo')
        setMessaggioObiettivoFrigo(true)
        setTimeout(() => setMessaggioObiettivoFrigo(false), 5000)
      }, 15000)
    }
  }, [messaggioObiettivoFrigo, frigoRepeatStarted, enigma2Completato])
  
  useEffect(() => {
    if (enigma2Completato && frigoRepeatIntervalRef.current) {
      console.log('[KitchenScene] 🛑 Stop ripetizione messaggio frigo (enigma completato)')
      clearInterval(frigoRepeatIntervalRef.current)
      frigoRepeatIntervalRef.current = null
      setFrigoRepeatStarted(false)
      setMessaggioObiettivoFrigo(false) // ← Nasconde anche il messaggio corrente!
    }
  }, [enigma2Completato])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 3 (Serra)
  const [serraRepeatStarted, setSerraRepeatStarted] = useState(false)
  
  useEffect(() => {
    if (messaggioObiettivoSerra && !serraRepeatStarted && !enigma3Completato) {
      console.log('[KitchenScene] 🔄 Avvio ripetizione messaggio serra (ogni 15s)')
      setSerraRepeatStarted(true)
      
      serraRepeatIntervalRef.current = setInterval(() => {
        console.log('[KitchenScene] 🔄 Ripeto messaggio obiettivo serra')
        setMessaggioObiettivoSerra(true)
        setTimeout(() => setMessaggioObiettivoSerra(false), 5000)
      }, 15000)
    }
  }, [messaggioObiettivoSerra, serraRepeatStarted, enigma3Completato])
  
  useEffect(() => {
    if (enigma3Completato && serraRepeatIntervalRef.current) {
      console.log('[KitchenScene] 🛑 Stop ripetizione messaggio serra (enigma completato)')
      clearInterval(serraRepeatIntervalRef.current)
      serraRepeatIntervalRef.current = null
      setSerraRepeatStarted(false)
      setMessaggioObiettivoSerra(false) // ← Nasconde anche il messaggio corrente!
    }
  }, [enigma3Completato])
  
  // 🎯 2️⃣ MONITORA COMPLETAMENTO PRIMO ENIGMA → Avvia secondo dopo 5 secondi
  useEffect(() => {
    if (puzzleStates.fornelli === 'solved' && !enigma1Completato) {
      console.log('[KitchenScene] ✅ PRIMO ENIGMA COMPLETATO (fornelli solved)')
      setEnigma1Completato(true)
    }
  }, [puzzleStates.fornelli, enigma1Completato])
  
  // 🎯 2️⃣-bis AVVIO SECONDO ENIGMA
  useEffect(() => {
    if (enigma1Completato && !enigma2Avviato) {
      console.log('[KitchenScene] ⏱️ Enigma 1 completato → Avvio timer per secondo enigma')
      
      const timer = setTimeout(() => {
        console.log('[KitchenScene] ⏱️ Timer scaduto → Avvio SECONDO ENIGMA (Frigo)')
        setEnigma2Avviato(true)  // ← SPOSTATO QUI dentro il timer!
        setMessaggioFrigo(true)
        setTimeout(() => {
          setMessaggioFrigo(false)
          setMessaggioObiettivoFrigo(true)
          setTimeout(() => setMessaggioObiettivoFrigo(false), 5000)
        }, 3000)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma1Completato, enigma2Avviato])
  
  // 🎯 3️⃣ MONITORA COMPLETAMENTO SECONDO ENIGMA → Avvia terzo dopo 5 secondi
  useEffect(() => {
    if (puzzleStates.frigo === 'solved' && enigma1Completato && !enigma2Completato) {
      console.log('[KitchenScene] ✅ SECONDO ENIGMA COMPLETATO (frigo solved)')
      setEnigma2Completato(true)
    }
  }, [puzzleStates.frigo, enigma1Completato, enigma2Completato])
  
  // 🎯 3️⃣-bis AVVIO TERZO ENIGMA
  useEffect(() => {
    if (enigma2Completato && !enigma3Avviato) {
      console.log('[KitchenScene] ⏱️ Enigma 2 completato → Avvio timer per terzo enigma')
      
      const timer = setTimeout(() => {
        console.log('[KitchenScene] ⏱️ Timer scaduto → Avvio TERZO ENIGMA (Serra)')
        setEnigma3Avviato(true)  // ← SPOSTATO QUI dentro il timer!
        setMessaggioSerra(true)
        setTimeout(() => {
          setMessaggioSerra(false)
          setMessaggioObiettivoSerra(true)
          setTimeout(() => setMessaggioObiettivoSerra(false), 5000)
        }, 3000)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma2Completato, enigma3Avviato])
  
  // 🎯 4️⃣ MONITORA COMPLETAMENTO TERZO ENIGMA (con messaggio finale!)
  useEffect(() => {
    if (neonSerraAcceso && enigma2Completato && !enigma3Completato) {
      console.log('[KitchenScene] ✅ TERZO ENIGMA COMPLETATO (serra accesa)')
      setEnigma3Completato(true)
      
      // ✅ MOSTRA MESSAGGIO FINALE SUCCESSO (come bagno!)
      console.log('[KitchenScene] 🎉 Mostrando messaggio finale completamento!')
      setMessaggioSuccessoSerra(true)
      setTimeout(() => setMessaggioSuccessoSerra(false), 5000)
    }
  }, [neonSerraAcceso, enigma2Completato, enigma3Completato])
  
  // 🖱️ FIX POINTER LOCK - Rilascia mouse quando appare overlay conferma frigo
  useEffect(() => {
    if (messaggioConfermeFrigo) {
      // Rilascia pointer lock per permettere click sui pulsanti
      document.exitPointerLock()
      console.log('[KitchenScene] 🖱️ Pointer lock RILASCIATO per overlay frigo')
    }
    // Il pointer lock verrà automaticamente riattivato al prossimo click sulla scena
  }, [messaggioConfermeFrigo])
  

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading Overlay - SEMPRE visibile finché spawn non è caricato */}
      <LoadingOverlay 
        isVisible={isLoading || !safeSpawnPosition}
        progress={loadingProgress}
        message="Caricamento Cucina"
      />
      
      {/* 🎯 Debug overlay - nascosto se hideAllPanels è true */}
      {!hideAllPanels && <LivePositionDebug debugInfo={liveDebugInfo} />}
      
      {/* 🎯 Overlay UI per cattura posizioni - nascosto se hideAllPanels è true */}
      {!hideAllPanels && captureReady && positionCaptureRef.current && (
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
      
      {/* 🎯 Animation Editor UI - nascosto se hideAllPanels è true */}
      {!hideAllPanels && showEditorUI && (
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
            console.log('[KitchenScene] Test animazione avviato')
            setIsAnimationPlaying(true)
          }}
          isAnimationPlaying={isAnimationPlaying}
          onPickDestinationStart={() => {
            console.log('[KitchenScene] Pick destination mode ATTIVATO')
            setPickDestinationMode(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[KitchenScene] Pick destination mode DISATTIVATO')
            setPickDestinationMode(false)
          }}
        />
      )}
      
      {/* 🎯 Indicatore stato editor - nascosto se hideAllPanels è true */}
      {!hideAllPanels && editorEnabled && (
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
      
      {/* 🚧 Collision Debug Overlay */}
      <CollisionDebugOverlay 
        collisionData={collisionData}
        isEnabled={collisionDebugEnabled}
      />
      
      {/* ✅ FIX DEADLOCK: Canvas render usa RAW coordinates, non aspetta conversione WORLD */}
      {spawnPosition && (
        <Canvas
          shadows={!isMobile}
          dpr={isMobile ? [1, 1.2] : [1, 2]}
          gl={{ antialias: !isMobile, powerPreference: isMobile ? 'low-power' : 'high-performance' }}
        >
        {/* 🎯 FIX CAMERA: PerspectiveCamera esplicita con makeDefault */}
        <PerspectiveCamera
          makeDefault
          fov={75}
          near={0.1}
          position={[safeSpawnPosition.x, eyeHeight, safeSpawnPosition.z]}
        />
        
        <ambientLight intensity={isMobile ? 0.7 : 0.6} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={0.8} 
          castShadow={!isMobile} 
          shadow-bias={-0.0005} 
        />
        
        {/* Debug Overlay - Mostra coordinate in tempo reale - nascosto se hideAllPanels è true */}
        {!hideAllPanels && <DebugOverlay />}
        
        {/* Reader interno - legge posizione/rotazione e aggiorna lo state */}
        <LivePositionReader onUpdate={setLiveDebugInfo} />
        
        {/* DebugExpose - Espone variabili Three.js in window.__DEBUG per console debugging */}
        <DebugExpose />
        
        {/* Griglia di riferimento per vedere il livello del terreno */}
        <gridHelper args={[100, 100]} position={[0, 0.01, 0]} />
        
        {/* 🔄 GUARD: Spawn SOLO quando mondo è stabile (worldReady) E coordinate caricate */}
        {worldReady && safeSpawnPosition && (
          <FPSController 
            modelRef={modelRef}
            mobileInput={mobileInput}
            onLookAtChange={handleLookAtChange}
            groundPlaneMesh={groundPlaneRef}
            isMobile={isMobile}
            boundaryLimits={boundaryLimits}
            initialPosition={safeSpawnPosition}
            initialYaw={initialYaw}
            eyeHeight={eyeHeight}
            modelScale={MODEL_SCALE}
            positionCaptureRef={positionCaptureRef}
            onLoadingStateChange={handleLoadingStateChange}
            portaCucinaOpen={portaCucinaOpen}
          />
        )}
        
        <Suspense fallback={<LoadingIndicator />}>
          {/* 🔍 DEBUG: Log sceneType prima di passarlo a CasaModel */}
          {(() => {
            console.log('🔍 [KitchenScene] 🎨 PASSANDO sceneType a CasaModel:', 'cucina')
            console.log('🔍 [KitchenScene] 📊 Timestamp:', new Date().toISOString())
            return null
          })()}
          
          <CasaModel 
            sceneType="cucina"
            spawnNodeName="INIZIO_CUCINA"
            onObjectClick={handleObjectClick} 
            modelRef={setModelRef}
            onReady={handleWorldReady}
            enableShadows={!isMobile}
            mobileSmartAntaAperta={mobileSmartAntaAperta}
            pentolaSuiFornelli={pentolaSuiFornelli}
            modelYOffset={modelYOffset}
            animatedDoorOpen={animatedDoorOpen}
            animatedDoorConfig={animatedDoorConfig}
            fridgeDoorOpen={fridgeDoorOpen}
            fridgeDoorConfig={fridgeDoorConfig}
            portaCucinaOpen={portaCucinaOpen}
            portaCucinaConfig={portaCucinaConfig}
            neonSerraAcceso={neonSerraAcceso}
            disableTeleport={hasCapturedPosition}
            disablePentolaAnimation={true}
          />
          
          {/* 🌿 Sistema Serra - Solo Luce Pulsante */}
          {neonSerraAcceso && (
            <SerraLight 
              state={serraState} 
              enabled={true} 
            />
          )}
          
          <GroundPlane onGroundReady={setGroundPlaneRef} />
          
          {/* 🔴 KITCHEN PUZZLE LED SYSTEM */}
          {/* 🏆 LED PORTA: usa game completion globale invece di stato locale */}
          <PuzzleLED ledUuid={LED_UUIDS.PORTA} state={gameCompletion.getDoorLEDColor('cucina')} />
          <PuzzleLED ledUuid={LED_UUIDS.FORNELLI} state={ledStates.fornelli} />
          <PuzzleLED ledUuid={LED_UUIDS.FRIGO} state={ledStates.frigo} />
          <PuzzleLED ledUuid={LED_UUIDS.SERRA} state={ledStates.serra} />
          
          {/* 🍳 FIX PENTOLA - Forza visibilità */}
          {modelRef.current && <PentolaFix modelRef={modelRef} />}
          
          {/* Sistema di selezione oggetti e helper visuali */}
          {editorEnabled && modelRef.current && (
            <AnimationEditorScene
              modelRef={modelRef}
              selectedObject={selectedObject}
              onSelect={setSelectedObject}
              animationConfig={animationConfig}
              isAnimationPlaying={isAnimationPlaying}
              onAnimationComplete={() => {
                console.log('[KitchenScene] Animazione completata')
                setIsAnimationPlaying(false)
              }}
              pickDestinationMode={pickDestinationMode}
              onDestinationPicked={(worldPos) => {
                console.log('[KitchenScene] ✅ Destinazione picked (raw):', worldPos)
                // Aggiorna animationConfig con le nuove coordinate
                if (animationConfig?.mode === 'position' && selectedObject) {
                  // 🔑 FIX 4: Rileggi Punto A dal nodo movibile (ROOT se esiste)
                  const movable = getMovableNode(selectedObject)
                  const currentWorldPos = new THREE.Vector3()
                  movable.getWorldPosition(currentWorldPos)
                  
                  // 🔧 FIX OFFSET: Calcola centro visivo reale della mesh
                  const box = new THREE.Box3().setFromObject(selectedObject)
                  const visualCenter = new THREE.Vector3()
                  box.getCenter(visualCenter)
                  
                  // Calcola offset tra pivot (movable) e centro visivo (mesh)
                  const offset = new THREE.Vector3().subVectors(visualCenter, currentWorldPos)
                  
                  console.log('[KitchenScene] 📊 Offset calcolato (visivo - pivot):', {
                    x: offset.x.toFixed(3),
                    y: offset.y.toFixed(3),
                    z: offset.z.toFixed(3),
                    magnitude: offset.length().toFixed(3) + 'm'
                  })
                  
                  // CORREGGI il target sottraendo l'offset
                  // Così quando il PIVOT va al punto corretto, il CENTRO VISIVO sarà dove hai cliccato!
                  const correctedTarget = new THREE.Vector3().subVectors(worldPos, offset)
                  
                  console.log('[KitchenScene] 🔄 Rilettura Punto A da:', movable.name)
                  console.log('[KitchenScene] 🔄 Punto A (pivot):', currentWorldPos)
                  console.log('[KitchenScene] 👁️  Centro visivo attuale:', visualCenter)
                  console.log('[KitchenScene] 🎯 Punto B cliccato:', worldPos)
                  console.log('[KitchenScene] ✅ Punto B corretto (per pivot):', correctedTarget)
                  
                  const newConfig = {
                    ...animationConfig,
                    startX: currentWorldPos.x,
                    startY: currentWorldPos.y,
                    startZ: currentWorldPos.z,
                    endX: correctedTarget.x,  // ✅ Usa coordinate corrette
                    endY: correctedTarget.y,
                    endZ: correctedTarget.z
                  }
                  console.log('[KitchenScene] Nuovo animationConfig:', newConfig)
                  setAnimationConfig(newConfig)
                }
                setPickDestinationMode(false)
              }}
            />
          )}
          
          {!isMobile && <Environment preset="apartment" />}
        </Suspense>
        </Canvas>
      )}
      
      {/* 🎯 DEBUG: Model Position Control Panel - nascosto se hideAllPanels è true */}
      {!hideAllPanels && showDebugPanel && (
        <div style={{
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
              onClick={() => setShowDebugPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff4444',
                fontSize: '20px',
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
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 68, 68, 0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
              title="Chiudi pannello"
            >
              ×
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
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>3</kbd> Reset (2.0m)</div>
          
          <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', color: '#0ff' }}>Altezza Occhi:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>7</kbd> Alza occhi (+0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>8</kbd> Abbassa occhi (-0.1m)</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>9</kbd> Reset (1.4m)</div>
          
          <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', color: '#ff0' }}>Animazioni:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>E</kbd> Toggle Animation Editor</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>1</kbd> Apri sportello configurato</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>2</kbd> Chiudi sportello configurato</div>
          
          <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', color: '#0f0' }}>Pannelli:</div>
          <div><kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#fff' }}>P</kbd> Toggle Pannello Debug</div>
        </div>
        </div>
      )}
      
      {/* Pulsante per riaprire il pannello debug se chiuso */}
      {false && !showDebugPanel && (
        <button
          onClick={() => setShowDebugPanel(true)}
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
            transition: 'all 0.2s'
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
          🔧 Debug
        </button>
      )}
      
      {/* 🎯 SISTEMA INDIZI CUCINA - Overlay UI Messaggi */}
      
      {/* 🍳 INDIZIO 1: Click su Fornelli */}
      {messaggioFornelli && (
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
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '450px',
          zIndex: 2001,
          border: '3px solid #ff6600',
          boxShadow: '0 0 30px rgba(255, 102, 0, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>🍳</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            Posiziona la pentola per accenderlo!
          </p>
        </div>
      )}
      
      {/* 🧊 INDIZIO 2: Click su Frigo (quando aperto e active) */}
      {messaggioFrigo && (
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
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '450px',
          zIndex: 2001,
          border: '3px solid #ff4444',
          boxShadow: '0 0 30px rgba(255, 68, 68, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>⚠️</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#ffaa00' }}>
            Così sprechi energia!
          </p>
        </div>
      )}
      
      {/* 🌿 INDIZIO 3: Click su Serra (quando active) */}
      {messaggioSerra && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 40, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff44',
          boxShadow: '0 0 35px rgba(0, 255, 68, 0.7)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '52px' }}>🌱</div>
          <p style={{ margin: 0, lineHeight: '1.6', fontWeight: 'bold', color: '#88ff88', fontSize: '22px' }}>
            Parola d'ordine per<br/>accendere la serra!
          </p>
        </div>
      )}
      
      {/* 🎯 OBIETTIVO 1: FORNELLI */}
      {messaggioObiettivoFornelli && (
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
            Trova e posiziona la <strong>pentola</strong> sul piatto a induzione libero
          </p>
        </div>
      )}
      
      {/* 🎯 OBIETTIVO 2: FRIGO */}
      {messaggioObiettivoFrigo && (
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
            Avvicinati al <strong>frigo</strong> e cliccaci!<br/>Chiudi fresco!
          </p>
        </div>
      )}
      
      {/* 🎯 OBIETTIVO 3: SERRA */}
      {messaggioObiettivoSerra && (
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
            "Grida <strong>Verde</strong> o <strong>Luce</strong> vicino al plastico"
          </p>
        </div>
      )}
      
      {/* 🚫 BLOCCO: Click su Frigo quando locked */}
      {messaggioBloccoFrigo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(30, 0, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #ff0000',
          boxShadow: '0 0 40px rgba(255, 0, 0, 0.7)',
          animation: 'shake 0.5s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🔒</div>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontWeight: 'bold', fontSize: '24px', color: '#ff4444' }}>
            Enigma bloccato!
          </p>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '18px', color: '#ffaa00' }}>
            Completa prima l'enigma dei <strong>FORNELLI</strong>
          </p>
        </div>
      )}
      
      {/* 🧊 CONFERMA FRIGO: Chiudi freezer? SI o NO */}
      {messaggioConfermeFrigo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 80, 0.98)',
          padding: '40px 50px',
          borderRadius: '16px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2001,
          border: '4px solid #00ccff',
          boxShadow: '0 0 50px rgba(0, 204, 255, 0.8)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '72px' }}>🧊</div>
          <p style={{ margin: '0 0 30px 0', lineHeight: '1.5', fontWeight: 'bold', fontSize: '26px', color: '#00ddff' }}>
            Chiudi freezer?
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            {/* Pulsante SI - collegato al tasto 4 */}
            <button
              onClick={() => {
                console.log('[KitchenScene] 👍 Pulsante SI cliccato - Chiudo frigo (tasto 4)')
                setFridgeDoorOpen(false)  // ← CHIUDI FRIGO (tasto 4)
                setMessaggioConfermeFrigo(false)  // Chiudi messaggio
              }}
              style={{
                padding: '18px 50px',
                fontSize: '28px',
                fontWeight: 'bold',
                backgroundColor: '#00ff88',
                color: '#003300',
                border: '3px solid #00ffaa',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 255, 136, 0.6)',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.backgroundColor = '#00ffaa'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.backgroundColor = '#00ff88'
              }}
            >
              ✅ SI
            </button>
            
            {/* Pulsante NO - chiude solo il messaggio */}
            <button
              onClick={() => {
                console.log('[KitchenScene] 👎 Pulsante NO cliccato - Annullo')
                setMessaggioConfermeFrigo(false)  // Chiudi solo il messaggio
              }}
              style={{
                padding: '18px 50px',
                fontSize: '28px',
                fontWeight: 'bold',
                backgroundColor: '#ff4444',
                color: 'white',
                border: '3px solid #ff6666',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(255, 68, 68, 0.6)',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.backgroundColor = '#ff6666'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.backgroundColor = '#ff4444'
              }}
            >
              ❌ NO
            </button>
          </div>
        </div>
      )}
      
      {/* ✅ SUCCESSO 1: Fornelli completato */}
      {messaggioSuccessoFornelli && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 0, 0.95)',
          padding: '40px 50px',
          borderRadius: '16px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '26px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '4px solid #00ff88',
          boxShadow: '0 0 40px rgba(0, 255, 136, 0.8)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px', animation: 'bounce 1s ease-in-out infinite' }}>🔥</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ff88' }}>
            Ora puoi cucinare!
          </p>
        </div>
      )}
      
      {/* ✅ SUCCESSO 2: Frigo completato */}
      {messaggioSuccessoFrigo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 40, 60, 0.95)',
          padding: '40px 50px',
          borderRadius: '16px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '4px solid #00ccff',
          boxShadow: '0 0 40px rgba(0, 204, 255, 0.8)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px', animation: 'bounce 1s ease-in-out infinite' }}>❄️</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ccff' }}>
            Ottimo lavoro,<br/>così conservi il cibo!
          </p>
        </div>
      )}
      
      {/* ✅ SUCCESSO 3: Serra completata - FINALE! */}
      {messaggioSuccessoSerra && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 60, 20, 0.98)',
          padding: '50px 60px',
          borderRadius: '20px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '600px',
          zIndex: 2001,
          border: '5px solid #00ff00',
          boxShadow: '0 0 60px rgba(0, 255, 0, 0.9)',
          animation: 'pulse 1s ease-in-out infinite'
        }}>
          <div style={{ marginBottom: '25px', fontSize: '80px', animation: 'spin 2s linear infinite' }}>🌿</div>
          <p style={{ margin: '0 0 20px 0', lineHeight: '1.6', fontWeight: 'bold', fontSize: '28px', color: '#00ff88' }}>
            Hai acceso la serra!
          </p>
          <p style={{ margin: 0, lineHeight: '1.6', fontSize: '20px', color: '#88ff88' }}>
            Tutti gli enigmi della cucina<br/>sono stati completati! ✅
          </p>
        </div>
      )}
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-50%, -50%) rotate(-5deg); }
          75% { transform: translate(-50%, -50%) rotate(5deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// 🚪 Componente per gestire il varco dinamico della porta cucina
function DoorwayManager({ portaCucinaOpen, collisionObjects }) {
  useEffect(() => {
    // Aspetta che le collision objects siano disponibili
    if (!collisionObjects || collisionObjects.length === 0) {
      console.log('[DoorwayManager] ⏳ Aspettando collision objects...')
      return
    }
    
    // 🔑 CERCA PER NOME invece che per UUID (gli UUID Three.js cambiano al runtime!)
    const MURO_CUCINA_NAME_PATTERN = '5FE64B15-9772-4066-B54C-5B4D89B71E42'
    const INGRESSO_NAME_PATTERN = 'CA00578C-C19E-445F-8AB8-F1095DB440C5'
    let muroCucina = null
    let ingresso = null
    
    console.log('[DoorwayManager] 🔍 Cercando nelle collision objects:', collisionObjects.length, 'oggetti')
    
    // 🔑 Helper: risali l'albero dei parent cercando pattern nel nome
    const findByNameInParents = (startObj, namePattern) => {
      let current = startObj
      while (current) {
        if (current.name && current.name.includes(namePattern)) {
          return current
        }
        current = current.parent
      }
      return null
    }
    
    // Cerca nelle collision objects E nei loro parent
    collisionObjects.forEach((obj) => {
      // Cerca MURO_CUCINA nell'oggetto stesso o nei parent
      if (!muroCucina) {
        const found = findByNameInParents(obj, MURO_CUCINA_NAME_PATTERN)
        if (found) {
          muroCucina = obj  // ← Salva la MESH (collision object), non il parent!
          console.log('[DoorwayManager] ✅ MURO_CUCINA trovato tramite parent:', found.name, '→ mesh:', obj.name)
        }
      }
      
      // Cerca INGRESSO nell'oggetto stesso o nei parent
      if (!ingresso) {
        const found = findByNameInParents(obj, INGRESSO_NAME_PATTERN)
        if (found) {
          ingresso = obj  // ← Salva la MESH (collision object), non il parent!
          console.log('[DoorwayManager] ✅ INGRESSO trovato tramite parent:', found.name, '→ mesh:', obj.name)
        }
      }
    })
    
    // Log dei risultati ricerca
    if (!muroCucina) {
      console.warn('[DoorwayManager] ⚠️ MURO_CUCINA non trovato con pattern:', MURO_CUCINA_NAME_PATTERN)
    }
    if (!ingresso) {
      console.warn('[DoorwayManager] ⚠️ INGRESSO non trovato con pattern:', INGRESSO_NAME_PATTERN)
    }
    
    // Modifica collisione in base allo stato della porta
    if (portaCucinaOpen) {
      // PORTA APERTA - Disattiva collisioni per permettere il passaggio
      if (muroCucina) {
        muroCucina.userData.collidable = false
        console.log('[DoorwayManager] 🚪 VARCO APERTO - MURO_CUCINA ora fantasma (no collisione)')
      }
      if (ingresso) {
        ingresso.userData.collidable = false
        console.log('[DoorwayManager] 🚪 VARCO APERTO - INGRESSO ora fantasma (no collisione)')
      }
    } else {
      // PORTA CHIUSA - Riattiva collisioni per bloccare il passaggio
      if (muroCucina) {
        muroCucina.userData.collidable = true
        console.log('[DoorwayManager] 🚪 VARCO CHIUSO - MURO_CUCINA ora solido (con collisione)')
      }
      if (ingresso) {
        ingresso.userData.collidable = true
        console.log('[DoorwayManager] 🚪 VARCO CHIUSO - INGRESSO ora solido (con collisione)')
      }
    }
  }, [portaCucinaOpen, collisionObjects])
  
  return null // Componente invisibile, gestisce solo la logica
}

// 🍳 COMPONENTE FIX PENTOLA - Forza visibilità pentola + Camera Sync + DIAGNOSTICA COMPLETA
function PentolaFix({ modelRef }) {
  const { scene, camera, gl } = useThree()
  const pentolaRef = useRef(null)
  
  useEffect(() => {
    if (!modelRef.current) return

    const PENTOLA_ID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0'

    const fixPentola = () => {
      let found = null

      modelRef.current.traverse((child) => {
        // 🔍 Cerca sia per name che per uuid
        const matchesName = typeof child.name === 'string' && child.name.includes(PENTOLA_ID)
        const matchesUuid = child.uuid === PENTOLA_ID
        
        if (matchesName || matchesUuid) {
          found = child
          console.log('🍳 Pentola trovata!', {
            matchedBy: matchesName ? 'name' : 'uuid',
            name: child.name,
            uuid: child.uuid
          })
        }
      })

      if (!found) {
        console.warn('❌ Pentola NON trovata - UUID ricercato:', PENTOLA_ID)
        console.warn('❌ Provo ricerca alternativa per nome contenente "pentola"...')
        
        // FALLBACK: cerca per nome contenente "pentola"
        modelRef.current.traverse((child) => {
          if (child.name && typeof child.name === 'string') {
            const lowerName = child.name.toLowerCase()
            if (lowerName.includes('pentola') || lowerName.includes('pot')) {
              console.log('🔍 Trovato oggetto simile:', child.name, child.uuid)
              if (!found) found = child  // Prende il primo match
            }
          }
        })
        
        if (!found) {
          console.error('❌ Pentola NON trovata nemmeno con fallback')
          return
        } else {
          console.log('✅ Usando pentola trovata con fallback:', found.name)
        }
      }

      // 🔑 RISALI AL NODO MOVIBILE (ROOT)
      const movable = getMovableNode(found)
      pentolaRef.current = movable

      // 🔍 ESPONI IN window.__DEBUG per test DevTools
      window.__DEBUG.pentola = movable
      console.log('[DEBUG] Pentola esposta su window.__DEBUG.pentola')

      console.log('🔥 FIX PENTOLA (name-based):', {
        foundName: found.name,
        movableName: movable.name,
        sameNode: movable === found
      })

      // 🔥 ATTACCA ALLA SCENA (world-space stabile)
      scene.attach(movable)

      // 🔥 RESET TRASFORMAZIONI - DAVANTI AL GIOCATORE all'altezza degli occhi
      movable.position.set(-1.5, 1.0, 0.8)  // ← Y a 1.0m (sotto occhi)
      movable.rotation.set(0, 0, 0)
      movable.scale.setScalar(1.0)  // ← Scala NORMALE per visibilità

      // 🔥 CENTRA GEOMETRIA + RENDI VISIBILE PENTOLA
      movable.traverse((n) => {
        if (n.isMesh) {
          // 🔑 CENTRA GEOMETRIA ALL'ORIGINE LOCALE!
          if (n.geometry) {
            n.geometry.center()
            console.log(`✅ Geometria centrata per: ${n.name}`)
          }
          
          // ✅ MANTIENI MATERIALE ORIGINALE - NON forza visibilità (CasaModel decide)
          // n.visible = true  // ← COMMENTATO: CasaModel.jsx rende la pentola invisibile
          n.frustumCulled = false
          n.renderOrder = 9999
          // ✅ depthTest su materiale esistente
          if (n.material) {
            n.material.depthTest = true  // ← Mantieni depth normale
          }
        }
      })

      movable.updateMatrixWorld(true)
      console.log('✅ PENTOLA FORZATA VISIBILE (via name)')
      
      // 🎥 DIAGNOSTICA CAMERA
      console.log('🎥 CAMERA DIAGNOSTICS:', {
        type: camera.type,
        position: {
          x: camera.position.x.toFixed(2),
          y: camera.position.y.toFixed(2),
          z: camera.position.z.toFixed(2)
        },
        isActiveCamera: gl.xr.getCamera() === camera || true
      })
      
      // 🔍 DIAGNOSTICA COMPLETA PENTOLA - Log iniziale dettagliato
      logPentolaDiagnostics(movable, camera, '🔥 SETUP INIZIALE')
    }

    // ⏱️ aspetta che CasaModel abbia finito TUTTO
    const t = setTimeout(fixPentola, 6000)

    return () => clearTimeout(t)
  }, [modelRef.current, scene, camera, gl])
  
  // 🔇 LOG DISABILITATO (Opzione A - Zero log in produzione)
  // 🎥 FIX CAMERA SYNC - Forza aggiornamento ogni frame con camera corrente
  useFrame(({ camera: currentCamera }) => {
    if (!pentolaRef.current) return
    
    // Aggiorna matrice world ogni frame per assicurare rendering corretto
    pentolaRef.current.updateMatrixWorld(true)
    
    // Log periodico DISABILITATO per performance
    // const now = Date.now()
    // if (!pentolaRef.lastLog || now - pentolaRef.lastLog > 2000) {
    //   pentolaRef.lastLog = now
    //   logPentolaDiagnostics(pentolaRef.current, currentCamera, '🎥 FRAME UPDATE')
    // }
  })
  
  return null
}

// 🔇 FUNZIONE DIAGNOSTICA DISABILITATA (Opzione A - Zero log in produzione)
// Questa funzione stampava 40+ linee di log ogni 2 secondi causando 3000+ log in 10 secondi
/*
function logPentolaDiagnostics(pentola, camera, label) {
  const pentolaPosWorld = new THREE.Vector3()
  pentola.getWorldPosition(pentolaPosWorld)
  
  const pentolaScale = new THREE.Vector3()
  pentola.getWorldScale(pentolaScale)
  
  // Calcola BoundingBox
  const bbox = new THREE.Box3().setFromObject(pentola)
  const bboxSize = new THREE.Vector3()
  bbox.getSize(bboxSize)
  const bboxCenter = new THREE.Vector3()
  bbox.getCenter(bboxCenter)
  
  // Calcola distanza dalla camera
  const distance = camera.position.distanceTo(pentolaPosWorld)
  
  // Verifica frustum culling
  const frustum = new THREE.Frustum()
  const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  frustum.setFromProjectionMatrix(matrix)
  const insideFrustum = frustum.intersectsBox(bbox)
  
  // Conta mesh visibili
  let meshCount = 0
  let visibleMeshCount = 0
  let totalVertices = 0
  let totalTriangles = 0
  
  pentola.traverse((node) => {
    if (node.isMesh) {
      meshCount++
      if (node.visible) visibleMeshCount++
      if (node.geometry) {
        const posAttr = node.geometry.getAttribute('position')
        if (posAttr) totalVertices += posAttr.count
        if (node.geometry.index) {
          totalTriangles += node.geometry.index.count / 3
        } else if (posAttr) {
          totalTriangles += posAttr.count / 3
        }
      }
    }
  })
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`${label} - DIAGNOSTICA PENTOLA COMPLETA`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📍 POSIZIONE WORLD:`)
  console.log(`   X: ${pentolaPosWorld.x.toFixed(3)}m`)
  console.log(`   Y: ${pentolaPosWorld.y.toFixed(3)}m`)
  console.log(`   Z: ${pentolaPosWorld.z.toFixed(3)}m`)
  console.log(`📏 SCALA WORLD:`)
  console.log(`   X: ${pentolaScale.x.toFixed(3)}`)
  console.log(`   Y: ${pentolaScale.y.toFixed(3)}`)
  console.log(`   Z: ${pentolaScale.z.toFixed(3)}`)
  console.log(`📦 BOUNDING BOX:`)
  console.log(`   Centro: (${bboxCenter.x.toFixed(2)}, ${bboxCenter.y.toFixed(2)}, ${bboxCenter.z.toFixed(2)})`)
  console.log(`   Dimensioni: ${bboxSize.x.toFixed(2)}m x ${bboxSize.y.toFixed(2)}m x ${bboxSize.z.toFixed(2)}m`)
  console.log(`   Volume: ${(bboxSize.x * bboxSize.y * bboxSize.z).toFixed(3)}m³`)
  console.log(`📷 CAMERA:`)
  console.log(`   Posizione: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
  console.log(`   Distanza dalla pentola: ${distance.toFixed(2)}m`)
  console.log(`   Near plane: ${camera.near}m`)
  console.log(`   Far plane: ${camera.far}m`)
  console.log(`   FOV: ${camera.fov}°`)
  console.log(`👁️  VISIBILITÀ:`)
  console.log(`   Oggetto .visible: ${pentola.visible ? '✅ TRUE' : '❌ FALSE'}`)
  console.log(`   Dentro frustum: ${insideFrustum ? '✅ SI' : '❌ NO'}`)
  console.log(`   Distanza OK (near-far): ${distance >= camera.near && distance <= camera.far ? '✅ SI' : '❌ NO'}`)
  console.log(`   frustumCulled: ${pentola.frustumCulled ? '⚠️  ATTIVO' : '✅ DISABILITATO'}`)
  console.log(`🎨 GEOMETRIA:`)
  console.log(`   Mesh totali: ${meshCount}`)
  console.log(`   Mesh visibili: ${visibleMeshCount}`)
  console.log(`   Vertici totali: ${totalVertices}`)
  console.log(`   Triangoli totali: ${Math.floor(totalTriangles)}`)
  console.log(`🔧 MATERIALE (prima mesh):`)
  
  let firstMesh = null
  pentola.traverse((node) => {
    if (node.isMesh && !firstMesh) firstMesh = node
  })
  
  if (firstMesh && firstMesh.material) {
    const mat = firstMesh.material
    console.log(`   Tipo: ${mat.type}`)
    console.log(`   visible: ${mat.visible !== false ? '✅ TRUE' : '❌ FALSE'}`)
    console.log(`   opacity: ${mat.opacity !== undefined ? mat.opacity.toFixed(2) : 'N/A'}`)
    console.log(`   transparent: ${mat.transparent ? '⚠️  TRUE' : '✅ FALSE'}`)
    console.log(`   depthTest: ${mat.depthTest ? '✅ TRUE' : '❌ FALSE'}`)
    console.log(`   depthWrite: ${mat.depthWrite ? '✅ TRUE' : '❌ FALSE'}`)
    console.log(`   side: ${mat.side === THREE.FrontSide ? 'FrontSide' : mat.side === THREE.BackSide ? 'BackSide' : 'DoubleSide'}`)
  }
  
  console.log(`🌲 HIERARCHY:`)
  console.log(`   Nome nodo: "${pentola.name}"`)
  console.log(`   Parent: ${pentola.parent ? pentola.parent.name : 'NESSUNO (root scene)'}`)
  console.log(`   Children: ${pentola.children.length}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}
*/

// Componente per gestire la selezione e i visual helper nell'editor
function AnimationEditorScene({ modelRef, selectedObject, onSelect, animationConfig, isAnimationPlaying, onAnimationComplete, pickDestinationMode, onDestinationPicked }) {
  const { scene } = useThree()
  const pentolaRef = useRef(null)
  const [pentolaTrackingEnabled, setPentolaTrackingEnabled] = useState(false)
  
  // Cerca la PENTOLA nel modello al mount
  useEffect(() => {
    if (!modelRef.current) return
    
    const PENTOLA_UUID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0'
    
    let found = null
    modelRef.current.traverse((child) => {
      if (child.uuid === PENTOLA_UUID) {
        found = child
      }
    })
    
    if (found) {
      // 🔑 FIX: Risolvi al nodo movibile (ROOT se esiste)
      const movable = getMovableNode(found)
      pentolaRef.current = movable
      
      console.log('🍳 [AnimationEditorScene] PENTOLA trovata:', found.name, found.uuid)
      console.log('🍳 [AnimationEditorScene] Nodo movibile:', movable.name)
      console.log('🍳 [AnimationEditorScene] Ha ROOT?', movable !== found)
      
      if (movable !== found) {
        console.log('✅ [AnimationEditorScene] Pattern ROOT rilevato - pentolaRef punta a', movable.name)
      }
    } else {
      console.warn('⚠️  [AnimationEditorScene] PENTOLA non trovata con UUID:', PENTOLA_UUID)
    }
  }, [modelRef])
  
  // Attiva tracking quando:
  // 1. La pentola è selezionata
  // 2. L'animazione è in corso
  useEffect(() => {
    const isPentolaSelected = selectedObject && selectedObject.uuid === 'FC640F14-10EB-486E-8AED-5773C59DA9E0'
    const shouldTrack = isPentolaSelected && isAnimationPlaying
    
    if (shouldTrack && !pentolaTrackingEnabled) {
      console.log('🔍 [AnimationEditorScene] ⚡ ATTIVAZIONE TRACKING PENTOLA')
      setPentolaTrackingEnabled(true)
    } else if (!shouldTrack && pentolaTrackingEnabled) {
      console.log('🔍 [AnimationEditorScene] 🛑 DISATTIVAZIONE TRACKING PENTOLA')
      setPentolaTrackingEnabled(false)
    }
  }, [selectedObject, isAnimationPlaying, pentolaTrackingEnabled])
  
  // Hook di tracking PENTOLA - SEMPRE ATTIVO per catturare OGNI movimento
  // usePentolaTracker(pentolaRef, pentolaTrackingEnabled)
  
  // Hook di selezione oggetti - DISABILITATO quando in pick destination mode
  useObjectSelection({
    enabled: !pickDestinationMode,
    selectableObjects: modelRef.current ? [modelRef.current] : [],
    onSelect: (obj) => {
      // 🔑 FIX 3: Risolvi al nodo movibile PRIMA di passare al parent
      const movable = getMovableNode(obj)
      
      console.log('[AnimationEditorScene] Oggetto cliccato:', obj.name)
      console.log('[AnimationEditorScene] Nodo movibile selezionato:', movable.name)
      
      if (movable !== obj) {
        console.log('✅ [AnimationEditorScene] Pattern ROOT rilevato - usando parent')
      }
      
      onSelect(movable)  // ← passa ROOT se esiste!
    },
    onDeselect: () => {
      console.log('[AnimationEditorScene] Deselezione')
      onSelect(null)
    }
  })
  
  // Hook per pick destination - ATTIVO solo quando pickDestinationMode è true
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
      // Il parent component gestisce il reset di pickDestinationMode
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
      
      {/* Helper per rotazione - mostra il cardine */}
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
      
      {/* Helper per posizione - mostra il percorso */}
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
      
      {/* 🔴 GHOST TARGET - Sfera rossa GRANDE e BRILLANTE sul Punto B */}
      {animationConfig?.mode === 'position' && 
       animationConfig.endX !== undefined && 
       animationConfig.endY !== undefined && 
       animationConfig.endZ !== undefined && (
        <group>
          {/* Log per debug */}
          {(() => {
            console.log('🔴 [PUNTO B] Rendering sfera rossa:', {
              x: animationConfig.endX,
              y: animationConfig.endY,
              z: animationConfig.endZ
            })
            return null
          })()}
          
          {/* Sfera rossa GRANDE sempre visibile */}
          <mesh position={[animationConfig.endX, animationConfig.endY, animationConfig.endZ]}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial 
              color="red" 
              emissive="red"
              emissiveIntensity={2}
              transparent 
              opacity={0.8}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          
          {/* Cilindro verticale per indicatore */}
          <mesh 
            position={[animationConfig.endX, animationConfig.endY + 0.5, animationConfig.endZ]}
            rotation={[0, 0, 0]}
          >
            <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
            <meshStandardMaterial 
              color="red" 
              emissive="red"
              emissiveIntensity={1.5}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}