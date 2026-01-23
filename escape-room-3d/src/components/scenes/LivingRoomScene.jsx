import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, Html, useProgress } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import CasaModel from '../3D/CasaModel'
import { useFPSControls } from '../../hooks/useFPSControls'
import { usePositionCapture } from '../../hooks/usePositionCapture'
import { getCapturedPosition } from '../../utils/cameraPositioning'
import PositionCaptureOverlay from '../UI/PositionCaptureOverlay'
import LivePositionDebug, { LivePositionReader } from '../debug/LivePositionDebug'
import LoadingOverlay from '../UI/LoadingOverlay'
import AnimationEditor from '../UI/AnimationEditor'
import { useObjectSelection } from '../../hooks/useObjectSelection'
import { usePositionPicker } from '../../hooks/usePositionPicker'
import ObjectHighlighter from '../debug/ObjectHighlighter'
import PivotHelper from '../debug/PivotHelper'
import PathHelper from '../debug/PathHelper'
import { useAnimationPreview } from '../../hooks/useAnimationPreview'
import { useMultiObjectAnimationPreview } from '../../hooks/useMultiObjectAnimationPreview'
import { getMovableNode } from '../../utils/movableNodeHelper'
import { useLivingRoomAnimation } from '../../hooks/useLivingRoomAnimation'
import { useLivingRoomPuzzle } from '../../hooks/useLivingRoomPuzzle'
import { PuzzleLED } from '../3D/PuzzleLED'
import { useGameCompletion } from '../../hooks/useGameCompletion'
import useWebSocket from '../../hooks/useWebSocket'

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
          Caricamento soggiorno...
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

function FPSController({ modelRef, mobileInput, onLookAtChange, groundPlaneMesh, isMobile = false, boundaryLimits, initialPosition, initialYaw = 0, eyeHeight = 1.6, modelScale = 1, positionCaptureRef, porteSoggiornoAngolo = 0, controlsEnabled = true }) {
  const { camera } = useThree()
  const [collisionObjects, setCollisionObjects] = useState([])
  const [groundObjects, setGroundObjects] = useState([])
  const [interactiveObjects, setInteractiveObjects] = useState([])
  const raycasterRef = useRef(new THREE.Raycaster())
  const lastTargetRef = useRef(null)
  const timeSinceLastRaycastRef = useRef(0)
  const RAYCAST_INTERVAL = isMobile ? 0.1 : 0
  
  // Hook per cattura posizioni (tasto N)
  const captureSystem = usePositionCapture()
  
  // Esponi il sistema di cattura al componente parent tramite ref
  useEffect(() => {
    if (positionCaptureRef) {
      positionCaptureRef.current = captureSystem
    }
  }, [captureSystem])
  
  // Scala collision parameters, ma mantieni velocità fissa a 1.35 u/s
  const scaledCollisionRadius = 0.22 * modelScale  // ← AUMENTATO da 0.15 a 0.22 (miglior bilanciamento)
  const scaledPlayerHeight = 1.8 * modelScale
  const MOVE_SPEED = 1.35 // Fixed speed - NON scalare con modelScale!
  
  useEffect(() => {
    // === CASO 1: LISTE FORZATE DA CASAMODEL (Sincronizzazione perfetta!) ===
    if (modelRef && (modelRef.forcedCollidables || modelRef.forcedGrounds)) {
      console.log('[LivingRoomScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL');
      
      let cols = modelRef.forcedCollidables || [];
      let grnds = modelRef.forcedGrounds || [];
      const interactives = [];

      // Aggiungi ground plane artificiale se c'è
      if (groundPlaneMesh) {
        grnds = [...grnds, groundPlaneMesh];
        groundPlaneMesh.userData.ground = true;
      }

      // Cerca oggetti interattivi nelle collidables E NON-collidables (TV!)
      cols.forEach(child => {
        const name = child.name ? child.name.toLowerCase() : '';
        
        // Interactive objects specifici per soggiorno
        if (name.startsWith('test') || 
            name.includes('soggiorno') || 
            name.includes('divano') || 
            name.includes('couch') || 
            name.includes('tv') ||
            name.includes('vetrata')) {
          interactives.push(child);
          child.userData.interactive = true;
        }
      });
      
      // 📺 IMPORTANTE: TV potrebbe NON essere nelle collidables, cercala esplicitamente!
      if (modelRef && modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child.isMesh && child.name) {
            const name = child.name.toLowerCase()
            // Cerca TV per UUID o nome
            if (name.includes('fb17d86e-ad44-4e91-9ad1-4923b740e36b') || 
                name.includes('3342cf3c-b2a4-4d72-8dc5-91727206c91e') ||
                name.includes('858ff8a2-8c80-42f4-8bba-c412313e2832') ||
                name.includes('tv_soggiorno')) {
              // Controlla se già presente
              const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
              if (!alreadyAdded) {
                console.log('[LivingRoomScene] ✅ TV aggiunta esplicitamente agli interattivi:', child.name)
                interactives.push(child)
                child.userData.interactive = true
              }
            }
          }
        })
      }
      
      // 🛋️ IMPORTANTE: CouchSet potrebbe non essere nelle collidables, cercalo esplicitamente!
      if (modelRef && modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child.isMesh && child.name) {
            const name = child.name.toLowerCase()
            // Cerca esplicitamente il divano per UUID
            if (name.includes('dfbb52b8-5818-4301-aa60-e98ce42cb71a') || 
                name.includes('couchset')) {
              // Controlla se già presente
              const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
              if (!alreadyAdded) {
                console.log('[LivingRoomScene] ✅ CouchSet aggiunto esplicitamente agli interattivi:', child.name)
                interactives.push(child)
                child.userData.interactive = true
              }
            }
          }
        })
      }
      
      // 🚫 VETRATA_SOGGIORNO RIMOSSA - Non deve essere interattiva

      setCollisionObjects(cols);
      setGroundObjects(grnds);
      setInteractiveObjects(interactives);
      
      console.log(`[LivingRoomScene] ✅ Configurazione: ${cols.length} collision, ${grnds.length} grounds, ${interactives.length} interattivi`);
      return;
    }

    // === CASO 2: FALLBACK (Codice vecchio se CasaModel non manda liste) ===
    if (!modelRef || !modelRef.current) return;
    
    const collidables = []
    const grounds = []
    const interactives = []
    
    console.log('[LivingRoomScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)');
    
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
        
        // Interactive objects
        if (name.startsWith('test') || name.includes('soggiorno') || name.includes('divano') || name.includes('couch') || name.includes('tv')) {
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
    
    console.log(`[LivingRoomScene] Ground objects (${grounds.length}):`, grounds.map(o => o.name))
    console.log(`[LivingRoomScene] Collidable objects (${collidables.length}):`, collidables.map(o => o.name))
    console.log(`[LivingRoomScene] Eye height:`, eyeHeight)
    
    setCollisionObjects(collidables)
    setGroundObjects(grounds)
    setInteractiveObjects(interactives)
  }, [modelRef, groundPlaneMesh, eyeHeight])
  
  // Log camera distance from ground periodically
  const logTimerRef = useRef(0)
  const LOG_INTERVAL = 2.0 // Log every 2 seconds
  
  useFrame((_, delta) => {
    // Log camera position and distance from ground
    logTimerRef.current += delta
    if (logTimerRef.current >= LOG_INTERVAL) {
      logTimerRef.current = 0
      
      // Get WORLD position of camera
      const worldPos = new THREE.Vector3()
      camera.getWorldPosition(worldPos)
      const cameraY = worldPos.y
      let minGroundDistance = Infinity
      
      // Find closest ground mesh
      groundObjects.forEach(ground => {
        const groundBox = new THREE.Box3().setFromObject(ground)
        const groundY = groundBox.max.y // Top of ground mesh
        const distance = Math.abs(cameraY - groundY)
        if (distance < minGroundDistance) {
          minGroundDistance = distance
        }
      })
      
      console.log(`[LivingRoomScene] 📷 Camera WORLD Y: ${worldPos.y.toFixed(2)} | Distance from ground: ${minGroundDistance.toFixed(2)} | WORLD Position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`)
    }
  })
  
  useFrame((_, delta) => {
    if (!onLookAtChange || interactiveObjects.length === 0) return
    
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
      const targetName = intersects[0].object.name
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
  
  // Usa parametri scalati (identici a EsternoScene)
  useFPSControls(
    collisionObjects,
    mobileInput,
    groundObjects,
    boundaryLimits,
    initialPosition,
    initialYaw,
    eyeHeight,
    scaledCollisionRadius,
    scaledPlayerHeight,
    MOVE_SPEED,
    false, // disableGravity
    null, // onCollision
    controlsEnabled // ← AGGIUNTO: passa controlsEnabled all'hook
  )
  
  return (
    <>
      {/* 🚪 Gestione Varco Dinamico Porte Soggiorno */}
      <DoorwayManagerLivingRoom porteSoggiornoAngolo={porteSoggiornoAngolo} collisionObjects={collisionObjects} />
    </>
  )
}

// 🚪 Componente per gestire il varco dinamico delle porte soggiorno
function DoorwayManagerLivingRoom({ porteSoggiornoAngolo, collisionObjects }) {
  useEffect(() => {
    // Aspetta che le collision objects siano disponibili
    if (!collisionObjects || collisionObjects.length === 0) {
      console.log('[DoorwayManagerLivingRoom] ⏳ Aspettando collision objects...')
      return
    }
    
    // 🔑 CERCA PER NOME invece che per UUID (gli UUID Three.js cambiano al runtime!)
    const MURO_SOGGIORNO_NAME_PATTERN = '0986CD91-D742-4D1B-8D6E-FE9733369FDC'
    const INGRESSO_NAME_PATTERN = 'CA00578C-C19E-445F-8AB8-F1095DB440C5'
    let muroSoggiorno = null
    let ingresso = null
    
    console.log('[DoorwayManagerLivingRoom] 🔍 Cercando nelle collision objects:', collisionObjects.length, 'oggetti')
    
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
      // Cerca MURO_SOGGIORNO nell'oggetto stesso o nei parent
      if (!muroSoggiorno) {
        const found = findByNameInParents(obj, MURO_SOGGIORNO_NAME_PATTERN)
        if (found) {
          muroSoggiorno = obj  // ← Salva la MESH (collision object), non il parent!
          console.log('[DoorwayManagerLivingRoom] ✅ MURO_SOGGIORNO trovato tramite parent:', found.name, '→ mesh:', obj.name)
        }
      }
      
      // Cerca INGRESSO nell'oggetto stesso o nei parent
      if (!ingresso) {
        const found = findByNameInParents(obj, INGRESSO_NAME_PATTERN)
        if (found) {
          ingresso = obj  // ← Salva la MESH (collision object), non il parent!
          console.log('[DoorwayManagerLivingRoom] ✅ INGRESSO trovato tramite parent:', found.name, '→ mesh:', obj.name)
        }
      }
    })
    
    // Log dei risultati ricerca
    if (!muroSoggiorno) {
      console.warn('[DoorwayManagerLivingRoom] ⚠️ MURO_SOGGIORNO non trovato con pattern:', MURO_SOGGIORNO_NAME_PATTERN)
    }
    if (!ingresso) {
      console.warn('[DoorwayManagerLivingRoom] ⚠️ INGRESSO non trovato con pattern:', INGRESSO_NAME_PATTERN)
    }
    
    // ✅ CONDIZIONE: Solo a 90° il varco è libero
    const porteCompletamenteAperte = porteSoggiornoAngolo === 90
    
    // Modifica collisione in base allo stato della porta
    if (porteCompletamenteAperte) {
      // PORTE A 90° - Disattiva collisioni per permettere il passaggio
      if (muroSoggiorno) {
        muroSoggiorno.userData.collidable = false
        console.log('[DoorwayManagerLivingRoom] 🚪 VARCO APERTO (90°) - MURO_SOGGIORNO ora fantasma (no collisione)')
      }
      if (ingresso) {
        ingresso.userData.collidable = false
        console.log('[DoorwayManagerLivingRoom] 🚪 VARCO APERTO (90°) - INGRESSO ora fantasma (no collisione)')
      }
    } else {
      // PORTE CHIUSE/SEMI-APERTE (0°/30°/60°) - Riattiva collisioni per bloccare il passaggio
      if (muroSoggiorno) {
        muroSoggiorno.userData.collidable = true
        console.log('[DoorwayManagerLivingRoom] 🚫 VARCO BLOCCATO (' + porteSoggiornoAngolo + '°) - MURO_SOGGIORNO ora solido (con collisione)')
      }
      if (ingresso) {
        ingresso.userData.collidable = true
        console.log('[DoorwayManagerLivingRoom] 🚫 VARCO BLOCCATO (' + porteSoggiornoAngolo + '°) - INGRESSO ora solido (con collisione)')
      }
    }
  }, [porteSoggiornoAngolo, collisionObjects])
  
  return null // Componente invisibile, gestisce solo la logica
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

export default function LivingRoomScene({ onObjectClick, onLookAtChange, mobileInput, isMobile = false, sessionId = 999 }) {
  const [modelRef, setModelRef] = useState({ current: null })
  const [groundPlaneRef, setGroundPlaneRef] = useState(null)
  const [boundaryLimits, setBoundaryLimits] = useState(null)
  const positionCaptureRef = useRef(null)
  const [captureReady, setCaptureReady] = useState(false)
  const [liveDebugInfo, setLiveDebugInfo] = useState(null)
  
  // 🔄 WORLD READY STATE - Guard per sincronizzare spawn con trasformazioni CasaModel
  const [worldReady, setWorldReady] = useState(false)
  
  // 🚀 EVENT-DRIVEN: Callback invocato da CasaModel quando il mondo è pronto
  const handleWorldReady = useCallback(() => {
    console.log('[LivingRoomScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn')
    setWorldReady(true)
  }, [])
  
  // Stato per il loading overlay - INIZIA SUBITO COME TRUE
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // State per spawn position (caricato async da API)
  const [spawnPosition, setSpawnPosition] = useState(null)
  const [initialYaw, setInitialYaw] = useState(1.57) // Default: 90 gradi
  
  // DEBUG: Offset Y del modello (controllabile con tastiera)
  const [modelYOffset, setModelYOffset] = useState(2.0) // Default: 2.0m (scene interne)
  
  // DEBUG: EyeHeight (altezza occhi camera) controllabile in tempo reale
  const [eyeHeight, setEyeHeight] = useState(1.4) // Default: 1.4m (soggiorno)
  
  // Sistema di editing animazioni (tasto E)
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)
  const [animationConfig, setAnimationConfig] = useState(null)
  const [showEditorUI, setShowEditorUI] = useState(false)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [pickDestinationMode, setPickDestinationMode] = useState(false)
  
  // 🔄 Sistema Multi-Object
  const [multiObjectMode, setMultiObjectMode] = useState(false)
  const [slots, setSlots] = useState([])
  const [objectsLocked, setObjectsLocked] = useState(false)
  
  // 🎯 Posizione VISIVA del marker (dove l'utente ha cliccato)
  const [visualMarkerPosition, setVisualMarkerPosition] = useState(null)
  
  // State per visibilità pannello debug
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  
  // 🎯 State per nascondere TUTTI i debug UI (tasto \)
  const [hideAllDebugUI, setHideAllDebugUI] = useState(true)
  
  // 🚪 State per porte soggiorno - SOLO l'angolo corrente (non stati simbolici)
  const [porteSoggiornoAngolo, setPorteSoggiornoAngolo] = useState(30) // Inizia a 30° (aperta)
  
  // 🎭 Stati per animazione Humano + CouchSet (tasto M)
  const [livingRoomAnimConfig, setLivingRoomAnimConfig] = useState(null)
  const [isLivingRoomAnimPlaying, setIsLivingRoomAnimPlaying] = useState(false)
  const [livingRoomAnimState, setLivingRoomAnimState] = useState('closed') // 'closed' o 'open'
  
  // 📺 Stati per sistema TV
  const [messaggioCompletamento, setMessaggioCompletamento] = useState(false)
  const [tvAccesa, setTvAccesa] = useState(false)
  const [currentLookTarget, setCurrentLookTarget] = useState(null)
  
  // 💬 SISTEMA MESSAGGI AUTOMATICI - 3 ENIGMI SEQUENZIALI (pattern cucina)
  // Guard per evitare ri-esecuzioni
  const enigma1AvviatoRef = useRef(false)
  const enigma1CompletatoRef = useRef(false)
  const enigma2AvviatoRef = useRef(false)
  const enigma2CompletatoRef = useRef(false)
  const enigma3AvviatoRef = useRef(false)
  const enigma3CompletatoRef = useRef(false)
  
  // 🎭 Ref per tracking transizione TV status (MAG1 WebSocket auto-trigger)
  const prevTvStatusRef = useRef(null)
  
  // 🌱 Ref per tracking transizione Pianta status (MAG2 WebSocket auto-trigger)
  const prevPiantaStatusRef = useRef(null)
  
  // 🔄 Stati reattivi per tracciare completamento (necessari per proximity trigger)
  const [enigma1Completato, setEnigma1Completato] = useState(false)
  const [enigma2Completato, setEnigma2Completato] = useState(false)
  const [enigma3Completato, setEnigma3Completato] = useState(false)
  
  // Ref per interval ripetizioni
  const intervalEnigma1Ref = useRef(null)
  const intervalEnigma2Ref = useRef(null)
  const intervalEnigma3Ref = useRef(null)
  
  // Stati per overlay UI
  const [messaggioInizialeEnigma1, setMessaggioInizialeEnigma1] = useState(false)
  const [messaggioObiettivoEnigma1, setMessaggioObiettivoEnigma1] = useState(false)
  const [messaggioSuccessoEnigma1, setMessaggioSuccessoEnigma1] = useState(false)
  
  const [messaggioInizialeEnigma2, setMessaggioInizialeEnigma2] = useState(false)
  const [messaggioObiettivoEnigma2, setMessaggioObiettivoEnigma2] = useState(false)
  const [messaggioSuccessoEnigma2, setMessaggioSuccessoEnigma2] = useState(false)
  
  const [messaggioInizialeEnigma3, setMessaggioInizialeEnigma3] = useState(false)
  const [messaggioObiettivoEnigma3, setMessaggioObiettivoEnigma3] = useState(false)
  const [messaggioSuccessoEnigma3, setMessaggioSuccessoEnigma3] = useState(false)
  
  const [messaggioFinaleStanza, setMessaggioFinaleStanza] = useState(false)
  
  // 🌱 Stati per messaggio completamento pianta
  const [messaggioCompletamentoPianta, setMessaggioCompletamentoPianta] = useState(false)
  
  // 🌱 Stati per animazione Pianta (tasto G)
  const [plantAnimConfig, setPlantAnimConfig] = useState(null)
  const [isPlantAnimPlaying, setIsPlantAnimPlaying] = useState(false)
  const [plantAnimState, setPlantAnimState] = useState('closed') // 'closed' o 'open'
  
  // ❄️ Stati per sistema Condizionatore + Dialog
  const [messaggioCondizionatore, setMessaggioCondizionatore] = useState(false)
  const [dialogChiudiPorta, setDialogChiudiPorta] = useState(false)
  
  // 🚫 Stati per messaggi blocco (styled come cucina)
  const [messaggioBloccoTV, setMessaggioBloccoTV] = useState(false)
  const [messaggioBloccoPianta, setMessaggioBloccoPianta] = useState(false)
  const [messaggioBloccoCondizionatore, setMessaggioBloccoCondizionatore] = useState(false)
  
  // 🎮 WebSocket e LivingRoom Puzzle System
  const { socket } = useWebSocket(sessionId, 'soggiorno', 'DevPlayer')
  const livingRoomPuzzle = useLivingRoomPuzzle(sessionId, socket)
  
  // 🏆 Game Completion System (gestisce LED porte globali)
  const gameCompletion = useGameCompletion(sessionId, socket)
  
  // Monitora quando il sistema di cattura è pronto
  useEffect(() => {
    if (positionCaptureRef.current && !captureReady) {
      setCaptureReady(true)
    }
  }, [positionCaptureRef.current, captureReady])
  
  // Quando un oggetto viene selezionato, mostra l'UI
  useEffect(() => {
    if (selectedObject && editorEnabled) {
      setShowEditorUI(true)
    } else {
      setShowEditorUI(false)
    }
  }, [selectedObject, editorEnabled])
  
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
        console.log('⏱️ [LivingRoomScene] Loading overlay nascosto dopo 5 secondi')
      }
    }, 100)
    
    return () => clearInterval(progressInterval)
  }, []) // Solo al mount
  
  // Carica spawn position async all'avvio (pattern KitchenScene)
  useEffect(() => {
    const loadSpawnPosition = async () => {
      console.log('🔍 [LivingRoomScene] CARICAMENTO spawn position async - START')
      
      try {
        const captured = await getCapturedPosition('soggiorno')
        console.log('🔍 [LivingRoomScene] getCapturedPosition("soggiorno") returned:', captured)
        
        if (captured) {
          // 🔬 SALVA COORDINATE RAW (LOCAL) - conversione dopo che modelRef è pronto
          const result = {
            x: captured.position.x,
            y: captured.position.y,
            z: captured.position.z
          }
          console.log('✅ [LivingRoomScene] Coordinate RAW (LOCAL space) caricate:', result)
          setSpawnPosition(result)
        } else {
          // Fallback se API non disponibile
          const FALLBACK_SPAWN = { x: 0, y: 0, z: 0 }
          console.warn('⚠️ [LivingRoomScene] NESSUNA coordinata trovata! Usando fallback:', FALLBACK_SPAWN)
          setSpawnPosition(FALLBACK_SPAWN)
        }
      } catch (error) {
        console.error('❌ [LivingRoomScene] Errore caricamento spawn:', error)
        setSpawnPosition({ x: 0, y: 0, z: 0 })
      }
      
      console.log('🔍 [LivingRoomScene] CARICAMENTO spawn position - END')
    }
    
    loadSpawnPosition()
  }, [])
  
  // Carica yaw async separatamente (pattern KitchenScene)
  useEffect(() => {
    const loadYaw = async () => {
      try {
        const captured = await getCapturedPosition('soggiorno')
        if (captured && captured.yaw !== undefined) {
          console.log('[LivingRoom] ✅ Usando yaw da API:', captured.yaw, 'radianti (', (captured.yaw * 180 / Math.PI).toFixed(1), 'gradi)')
          setInitialYaw(captured.yaw)
        } else {
          console.log('[LivingRoom] Using default yaw: 1.57 radians (90 degrees)')
        }
      } catch (error) {
        console.error('[LivingRoom] Errore caricamento yaw:', error)
      }
    }
    
    loadYaw()
  }, [])
  
  // 🔄 CONVERSIONE LOCAL → WORLD quando entrambi modelRef E spawnPosition sono pronti
  const [spawnWorldPosition, setSpawnWorldPosition] = useState(null)
  
  useEffect(() => {
    console.log('🔍 [DIAGNOSTIC A] useEffect TRIGGERED - Dependencies check:', {
      hasModelRef: !!modelRef,
      hasModelRefCurrent: !!modelRef?.current,
      hasSpawnPosition: !!spawnPosition,
      worldReady,
      spawnPositionValue: spawnPosition
    })
    
    // ✅ GUARD: Aspetta che ENTRAMBI siano pronti
    if (!modelRef?.current || !spawnPosition || !worldReady) {
      console.log('[LivingRoomScene] ⏳ Aspettando per conversione spawn:', {
        modelRef: !!modelRef?.current,
        spawnPosition: !!spawnPosition,
        worldReady
      })
      return
    }
    
    // 🔬 CONVERSIONE LOCAL → WORLD (FIX CONTRATTO DATI)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DIAGNOSTIC B] CONVERSIONE LOCAL → WORLD STARTING')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const spawnLocal = new THREE.Vector3(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    )
    
    console.log('📥 [DIAGNOSTIC B1] INPUT (LOCAL da DB):', {
      x: spawnLocal.x.toFixed(3),
      y: spawnLocal.y.toFixed(3),
      z: spawnLocal.z.toFixed(3)
    })
    
    // 🎯 APPLICA CONVERSIONE
    const spawnWorld = modelRef.current.localToWorld(spawnLocal.clone())
    
    console.log('📤 [DIAGNOSTIC B2] OUTPUT (WORLD per FPSController):', {
      x: spawnWorld.x.toFixed(3),
      y: spawnWorld.y.toFixed(3),
      z: spawnWorld.z.toFixed(3)
    })
    
    console.log('\n🎯 [DIAGNOSTIC B3] VERIFICA vs GROUND TRUTH:')
    console.log('  Ground Truth misurato:', { x: 0.41, y: 0.04, z: -0.31 })
    console.log('  Spawn convertito:', {
      x: spawnWorld.x.toFixed(2),
      y: spawnWorld.y.toFixed(2),
      z: spawnWorld.z.toFixed(2)
    })
    
    const deltaX = Math.abs(spawnWorld.x - 0.41)
    const deltaZ = Math.abs(spawnWorld.z - (-0.31))
    console.log('  Delta X:', deltaX.toFixed(2) + 'm', deltaX < 0.1 ? '✅ MATCH!' : '❌ MISMATCH')
    console.log('  Delta Z:', deltaZ.toFixed(2) + 'm', deltaZ < 0.1 ? '✅ MATCH!' : '❌ MISMATCH')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 🎯 SALVA COORDINATE WORLD (pronte per FPSController)
    setSpawnWorldPosition({
      x: spawnWorld.x,
      y: spawnWorld.y,
      z: spawnWorld.z
    })
    
    console.log('🔍 [DIAGNOSTIC C] spawnWorldPosition UPDATED - Conversione completata!')
    
  }, [modelRef, spawnPosition, worldReady])
  
  // 🔄 FIX DEADLOCK: Separa rendering Canvas da spawn FPSController
  const canRenderCanvas = spawnPosition !== null // Canvas si rende appena DB carica coordinate
  const safeSpawnPosition = spawnWorldPosition   // FPSController aspetta conversione LOCAL→WORLD
  
  // === CONFIGURAZIONE FISICA AGGIORNATA ===
  const MODEL_SCALE = 1
  
  // ALTEZZA OCCHI: 1.6 per una prospettiva naturale
  const EYE_HEIGHT = 1.6 * MODEL_SCALE
  
  const COLLISION_RADIUS = 0.3 * MODEL_SCALE
  const PLAYER_HEIGHT = 1.8 * MODEL_SCALE // Il corpo resta alto per le collisioni
  const MOVE_SPEED = 1.35 * MODEL_SCALE  // Camminata normale (target: 1.35 u/s horizontal speed)
  
  // 🚪 Configurazione porte soggiorno - usa direttamente l'angolo corrente
  const porteSoggiornoConfig = useMemo(() => {
    return [
      {
        objectName: "PORTA_SOGGIORNO(B4B3C2EF-4864-43B4-B31D-E61D253C4F55)",
        mode: "rotation",
        pivotX: 0.838,
        pivotY: 0.543,
        pivotZ: -0.527,
        axis: "z",  // ✅ Asse Z per rotazione orizzontale
        angle: porteSoggiornoAngolo, // Usa direttamente l'angolo
        speed: 45,
        direction: 1
      },
      {
        objectName: "PORTA_SOGGIORNO(079FD9A0-116F-42A9-965F-53B7A490C976)",
        mode: "rotation",
        pivotX: 0.838,
        pivotY: 0.543,
        pivotZ: -0.527,
        axis: "z",  // ✅ Asse Z per rotazione orizzontale
        angle: porteSoggiornoAngolo,
        speed: 45,
        direction: 1
      },
      {
        objectName: "PORTA_SOGGIORNO(B3801606-5CB8-4DAE-BF91-9744F6A508FE)",
        mode: "rotation",
        pivotX: 0.838,
        pivotY: 0.543,
        pivotZ: -0.527,
        axis: "z",  // ✅ Asse Z per rotazione orizzontale
        angle: porteSoggiornoAngolo,
        speed: 45,
        direction: 1
      }
    ]
  }, [porteSoggiornoAngolo])
  
  // Determina se le porte sono "aperte" per CasaModel (qualsiasi angolo > 0)
  const porteSoggiornoAperte = useMemo(() => 
    porteSoggiornoAngolo > 0,
    [porteSoggiornoAngolo]
  )
  
  // 🎭 Carica configurazioni JSON per animazione soggiorno
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/humano_soggiorno_sequence.json')
        const config = await response.json()
        setLivingRoomAnimConfig(config)
        console.log('[LivingRoomScene] ✅ Configurazione animazione caricata:', config)
      } catch (error) {
        console.error('[LivingRoomScene] ❌ Errore caricamento config:', error)
      }
    }
    loadConfig()
  }, [])
  
  // 🌱 Carica configurazione JSON per animazione pianta
  useEffect(() => {
    const loadPlantConfig = async () => {
      try {
        const response = await fetch('/pianta_soggiorno_sequence.json')
        const config = await response.json()
        setPlantAnimConfig(config)
        console.log('[LivingRoomScene] ✅ Configurazione pianta caricata:', config)
      } catch (error) {
        console.error('[LivingRoomScene] ❌ Errore caricamento config pianta:', error)
      }
    }
    loadPlantConfig()
  }, [])
  
  // 🔄 AUTO-RESET al caricamento scena (pattern cucina/camera)
  useEffect(() => {
    if (livingRoomPuzzle.resetPuzzles) {
      console.log('[LivingRoomScene] 🔄 Auto-reset al mount')
      livingRoomPuzzle.resetPuzzles('full')
      
      // Reset anche stati locali React
      setTvAccesa(false)
      setLivingRoomAnimState('closed')
      setPlantAnimState('closed')
      setPorteSoggiornoAngolo(30)  // Porte aperte inizialmente
      
      console.log('[LivingRoomScene] ✅ Stati locali resettati')
    }
  }, []) // Solo al mount
  
  // 💬 SISTEMA MESSAGGI AUTOMATICI - PATTERN CUCINA COMPLETO
  
  // 🎯 1️⃣ AVVIO AUTOMATICO PRIMO ENIGMA - All'inizio della scena (timer 1s)
  useEffect(() => {
    console.log('[LivingRoomScene] 🔍 Check avvio primo enigma - isLoading:', isLoading, 'spawnPosition:', spawnPosition, 'enigma1Avviato:', enigma1AvviatoRef.current)
    
    // ✅ GUARD: Controlla che pianta sia OFF (enigma non completato)
    if (!isLoading && safeSpawnPosition && livingRoomPuzzle.ledStates && !enigma1AvviatoRef.current && livingRoomPuzzle.ledStates.pianta === 'off') {
      console.log('[LivingRoomScene] ✅ Condizioni soddisfatte! Avvio timer per primo enigma...')
      
      const timer = setTimeout(() => {
        console.log('[LivingRoomScene] 🎯 ⏰ TIMER SCADUTO - Avvio automatico PRIMO ENIGMA (TV/Couch)')
        enigma1AvviatoRef.current = true  // ← GUARD: Impedisce re-esecuzioni
        setMessaggioInizialeEnigma1(true)
        console.log('[LivingRoomScene] 📢 Messaggio iniziale enigma1 ATTIVATO')
        setTimeout(() => {
          console.log('[LivingRoomScene] 📢 Nascondo messaggio iniziale, mostro obiettivo')
          setMessaggioInizialeEnigma1(false)
          setMessaggioObiettivoEnigma1(true)
          setTimeout(() => {
            console.log('[LivingRoomScene] 📢 Nascondo messaggio obiettivo')
            setMessaggioObiettivoEnigma1(false)
          }, 5000)
        }, 3000)
      }, 1000) // 1 secondo dopo il caricamento
      
      return () => clearTimeout(timer)
    } else {
      console.log('[LivingRoomScene] ⚠️ Condizioni NON soddisfatte per avvio primo enigma')
    }
  }, [isLoading, safeSpawnPosition, livingRoomPuzzle.ledStates])
  
  // 🎯 2️⃣ MONITORA COMPLETAMENTO PRIMO ENIGMA → Avvia secondo dopo 5 secondi
  useEffect(() => {
    if (livingRoomPuzzle.ledStates?.pianta === 'red' && !enigma1CompletatoRef.current) {
      console.log('[LivingRoomScene] ✅ PRIMO ENIGMA COMPLETATO (TV solved)')
      enigma1CompletatoRef.current = true
      setEnigma1Completato(true) // ← STATO REATTIVO per proximity trigger
      
      // 📺 MOSTRA MESSAGGIO SUCCESSO IMMEDIATAMENTE
      console.log('[LivingRoomScene] 📢 Mostrando messaggio successo TV')
      setMessaggioSuccessoEnigma1(true)
      setTimeout(() => setMessaggioSuccessoEnigma1(false), 3000)
    }
  }, [livingRoomPuzzle.ledStates?.pianta])
  
  // 🎯 2️⃣-bis AVVIO SECONDO ENIGMA (timer 5s dopo completamento primo)
  useEffect(() => {
    // ✅ FIX: Rimuovo guard condizionatore (pattern corretto da Bagno/Cucina)
    if (enigma1Completato && !enigma2AvviatoRef.current) {
      console.log('[LivingRoomScene] ⏱️ Enigma 1 completato → Avvio timer per secondo enigma')
      enigma2AvviatoRef.current = true  // ← GUARD: SUBITO per bloccare ri-esecuzioni!
      
      const timer = setTimeout(() => {
        console.log('[LivingRoomScene] ⏱️ Timer scaduto → Avvio SECONDO ENIGMA (Pianta)')
        setMessaggioInizialeEnigma2(true)
        setTimeout(() => {
          setMessaggioInizialeEnigma2(false)
          setMessaggioObiettivoEnigma2(true)
          setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
        }, 3000)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma1Completato])
  
  // 🎯 3️⃣ MONITORA COMPLETAMENTO SECONDO ENIGMA → Avvia terzo dopo 5 secondi
  useEffect(() => {
    if (livingRoomPuzzle.ledStates?.condizionatore === 'red' && enigma1CompletatoRef.current && !enigma2CompletatoRef.current) {
      console.log('[LivingRoomScene] ✅ SECONDO ENIGMA COMPLETATO (Pianta solved)')
      enigma2CompletatoRef.current = true
      setEnigma2Completato(true) // ← STATO REATTIVO per proximity trigger
      
      // 🌱 MOSTRA MESSAGGIO SUCCESSO IMMEDIATAMENTE
      console.log('[LivingRoomScene] 📢 Mostrando messaggio successo Pianta')
      setMessaggioSuccessoEnigma2(true)
      setTimeout(() => setMessaggioSuccessoEnigma2(false), 3000)
    }
  }, [livingRoomPuzzle.ledStates?.condizionatore])
  
  // 🎯 3️⃣-bis AVVIO TERZO ENIGMA (timer 5s dopo completamento secondo) + MESSAGGIO CONDIZIONATORE AUTOMATICO
  useEffect(() => {
    if (enigma2CompletatoRef.current && !enigma3AvviatoRef.current) {
      console.log('[LivingRoomScene] ⏱️ Enigma 2 completato → Avvio timer per terzo enigma + messaggio condizionatore')
      enigma3AvviatoRef.current = true  // ← GUARD: SUBITO per bloccare ri-esecuzioni!
      
      const timer = setTimeout(() => {
        console.log('[LivingRoomScene] ⏱️ Timer scaduto → Avvio TERZO ENIGMA (Condizionatore)')
        
        // ❄️ MESSAGGIO CONDIZIONATORE AUTOMATICO (Opzione B)
        setMessaggioCondizionatore(true)
        setTimeout(() => {
          setMessaggioCondizionatore(false)
          
          // Dopo messaggio condizionatore → messaggio iniziale enigma 3
          setMessaggioInizialeEnigma3(true)
          setTimeout(() => {
            setMessaggioInizialeEnigma3(false)
            setMessaggioObiettivoEnigma3(true)
            setTimeout(() => setMessaggioObiettivoEnigma3(false), 5000)
          }, 3000)
        }, 3000) // Messaggio condizionatore dura 3 secondi
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma2CompletatoRef.current])
  
  // 🎯 4️⃣ MONITORA COMPLETAMENTO TERZO ENIGMA (con messaggio finale!)
  useEffect(() => {
    if (livingRoomPuzzle.ledStates?.condizionatore === 'green' && enigma2CompletatoRef.current && !enigma3CompletatoRef.current) {
      console.log('[LivingRoomScene] ✅ TERZO ENIGMA COMPLETATO (Condizionatore solved)')
      enigma3CompletatoRef.current = true
      setEnigma3Completato(true) // ← STATO REATTIVO per proximity trigger
      
      // ❄️ MOSTRA MESSAGGIO SUCCESSO CONDIZIONATORE PRIMA DEL FINALE
      console.log('[LivingRoomScene] 📢 Mostrando messaggio successo Condizionatore')
      setMessaggioSuccessoEnigma3(true)
      setTimeout(() => {
        setMessaggioSuccessoEnigma3(false)
        
        // ✅ POI MOSTRA MESSAGGIO FINALE COMPLETAMENTO
        console.log('[LivingRoomScene] 🎉 Mostrando messaggio finale completamento!')
        setMessaggioFinaleStanza(true)
        setTimeout(() => setMessaggioFinaleStanza(false), 5000)
      }, 3000) // Attendi che finisca il messaggio successo
    }
  }, [livingRoomPuzzle.ledStates?.condizionatore])
  
  // 📥 LISTENER WebSocket - Sincronizzazione TV/Divano da altri giocatori
  useEffect(() => {
    if (!socket) return
    
    const handleAnimationSync = (data) => {
      // Filtra solo eventi per questo room
      if (data.room !== 'soggiorno') return
      
      // 🎭 TV/Divano sync
      if (data.objectName === 'tv_divano') {
        console.log('[LivingRoomScene] 📥 Sync TV/Divano ricevuto da:', data.triggeredBy, '→', data.animationState)
        
        // Aggiorna stato React locale
        setLivingRoomAnimState(data.animationState)
        setTvAccesa(data.additionalData?.tvOn || false)
        
        // Avvia animazione se necessario
        if (data.animationState === 'opening' || data.animationState === 'closing') {
          setIsLivingRoomAnimPlaying(true)
        }
        
        console.log('[LivingRoomScene] ✅ TV/Divano aggiornati da sync remoto')
      }
      
      // 🌱 Pianta sync
      if (data.objectName === 'pianta') {
        console.log('[LivingRoomScene] 📥 Sync Pianta ricevuto da:', data.triggeredBy, '→', data.animationState)
        
        // Aggiorna stato React locale
        setPlantAnimState(data.animationState)
        
        // Avvia animazione se necessario
        if (data.animationState === 'opening') {
          setIsPlantAnimPlaying(true)
        }
        
        console.log('[LivingRoomScene] ✅ Pianta aggiornata da sync remoto')
      }
      
      // 🚪 Porte sync
      if (data.objectName === 'porte') {
        console.log('[LivingRoomScene] 📥 Sync Porte ricevuto da:', data.triggeredBy, '→ angolo:', data.additionalData?.angle)
        
        // Aggiorna angolo porte
        const newAngle = data.additionalData?.angle
        if (newAngle !== undefined) {
          setPorteSoggiornoAngolo(newAngle)
          console.log('[LivingRoomScene] ✅ Porte aggiornate da sync remoto:', newAngle + '°')
        }
      }
    }
    
    socket.on('animationStateChanged', handleAnimationSync)
    
    return () => {
      socket.off('animationStateChanged', handleAnimationSync)
    }
  }, [socket])
  
  // 🎭 AUTO-TRIGGER ANIMAZIONE - MAG1 WebSocket listener (rileva transizione "locked/active" → "completed")
  useEffect(() => {
    const currentTvStatus = livingRoomPuzzle.tvStatus
    
    // 🔍 DEBUG: Log dettagliato per capire quando MAG1 triggera
    console.log('[LivingRoomScene] 🔍 MAG1 Debug - TV Status Check:', {
      prevStatus: prevTvStatusRef.current,
      currentStatus: currentTvStatus,
      animState: livingRoomAnimState,
      willTrigger: (prevTvStatusRef.current === 'locked' || prevTvStatusRef.current === 'active') && currentTvStatus === 'completed'
    })
    
  // Rileva TRANSIZIONE → completed (MAG1 ha completato TV)
  // ✅ FIX: Accetta QUALSIASI transizione verso 'completed' (risolve timing auto-reset)
  if (prevTvStatusRef.current !== 'completed' && currentTvStatus === 'completed') {
      
      console.log('[LivingRoomScene] 🧲 MAG1 TRIGGER DETECTED! TV completata! Avvio animazione automatica...')
      console.log('[LivingRoomScene] 🎬 Simulando tutto quello che fa il tasto M:')
      console.log('[LivingRoomScene]    1️⃣ setLivingRoomAnimState("opening")')
      console.log('[LivingRoomScene]    2️⃣ setIsLivingRoomAnimPlaying(true)')
      console.log('[LivingRoomScene]    3️⃣ setTvAccesa(true)')
      console.log('[LivingRoomScene]    4️⃣ Mostra messaggio completamento')
      console.log('[LivingRoomScene]    ℹ️ Stato corrente animazione:', livingRoomAnimState)
      
      // 🎭 TRIGGERA ANIMAZIONE (identico al tasto M) - anche se già aperta!
      setLivingRoomAnimState('opening')
      setIsLivingRoomAnimPlaying(true)
      
      // 📺 ACCENDI TV
      setTvAccesa(true)
      
      // 📺 MOSTRA MESSAGGIO COMPLETAMENTO
      setMessaggioCompletamento(true)
      setTimeout(() => setMessaggioCompletamento(false), 4000)
      
      console.log('[LivingRoomScene] ✅ Animazione + TV avviati automaticamente da MAG1!')
    }
    
    // Aggiorna ref per prossimo confronto
    prevTvStatusRef.current = currentTvStatus
    
  }, [livingRoomPuzzle.tvStatus, livingRoomAnimState])
  
  // 🌱 AUTO-TRIGGER ANIMAZIONE - MAG2 WebSocket listener (rileva transizione → "completed" per Pianta)
  useEffect(() => {
    const currentPiantaStatus = livingRoomPuzzle.piantaStatus
    
    // 🔍 DEBUG: Log dettagliato per capire quando MAG2 triggera
    console.log('[LivingRoomScene MAG2] 🔍 Pianta Status Check:', {
      prevStatus: prevPiantaStatusRef.current,
      currentStatus: currentPiantaStatus,
      plantAnimState: plantAnimState,
      willTrigger: prevPiantaStatusRef.current !== 'completed' && currentPiantaStatus === 'completed'
    })
    
    // Rileva TRANSIZIONE → completed (MAG2 ha completato Pianta)
    // ✅ FIX: Accetta QUALSIASI transizione verso 'completed' (stesso pattern MAG1)
    if (prevPiantaStatusRef.current !== 'completed' && currentPiantaStatus === 'completed') {
      
      console.log('[LivingRoomScene] 🧲 MAG2 TRIGGER DETECTED! Pianta completata! Avvio animazione automatica...')
      console.log('[LivingRoomScene] 🎬 Simulando tutto quello che fa il tasto G:')
      console.log('[LivingRoomScene]    1️⃣ setPlantAnimState("opening")')
      console.log('[LivingRoomScene]    2️⃣ setIsPlantAnimPlaying(true)')
      console.log('[LivingRoomScene]    ℹ️ Stato corrente animazione pianta:', plantAnimState)
      
      // 🌱 TRIGGERA ANIMAZIONE (identico al tasto G) - anche se già aperta!
      setPlantAnimState('opening')
      setIsPlantAnimPlaying(true)
      
      console.log('[LivingRoomScene] ✅ Animazione pianta avviata automaticamente da MAG2!')
    }
    
    // Aggiorna ref per prossimo confronto
    prevPiantaStatusRef.current = currentPiantaStatus
    
  }, [livingRoomPuzzle.piantaStatus, plantAnimState])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 1 (TV)
  const [enigma1RepeatStarted, setEnigma1RepeatStarted] = useState(false)
  
  useEffect(() => {
    if (messaggioObiettivoEnigma1 && !enigma1RepeatStarted && !enigma1CompletatoRef.current) {
      console.log('[LivingRoomScene] 🔄 Avvio ripetizione messaggio TV (ogni 15s)')
      setEnigma1RepeatStarted(true)
      
      intervalEnigma1Ref.current = setInterval(() => {
        console.log('[LivingRoomScene] 🔄 Ripeto messaggio obiettivo TV')
        setMessaggioObiettivoEnigma1(true)
        setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
      }, 15000)
    }
    
    return () => {
      if (intervalEnigma1Ref.current) {
        clearInterval(intervalEnigma1Ref.current)
        intervalEnigma1Ref.current = null
      }
    }
  }, [messaggioObiettivoEnigma1, enigma1RepeatStarted])
  
  // 🛑 Stop ripetizione Enigma 1
  useEffect(() => {
    if (enigma1CompletatoRef.current && intervalEnigma1Ref.current) {
      console.log('[LivingRoomScene] 🛑 Stop ripetizione messaggio TV (enigma completato)')
      clearInterval(intervalEnigma1Ref.current)
      intervalEnigma1Ref.current = null
      setMessaggioObiettivoEnigma1(false)
    }
  }, [enigma1CompletatoRef.current])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 2 (Pianta)
  const [enigma2RepeatStarted, setEnigma2RepeatStarted] = useState(false)
  
  useEffect(() => {
    if (messaggioObiettivoEnigma2 && !enigma2RepeatStarted && !enigma2CompletatoRef.current) {
      console.log('[LivingRoomScene] 🔄 Avvio ripetizione messaggio Pianta (ogni 15s)')
      setEnigma2RepeatStarted(true)
      
      intervalEnigma2Ref.current = setInterval(() => {
        console.log('[LivingRoomScene] 🔄 Ripeto messaggio obiettivo Pianta')
        setMessaggioObiettivoEnigma2(true)
        setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
      }, 15000)
    }
    
    return () => {
      if (intervalEnigma2Ref.current) {
        clearInterval(intervalEnigma2Ref.current)
        intervalEnigma2Ref.current = null
      }
    }
  }, [messaggioObiettivoEnigma2, enigma2RepeatStarted])
  
  // 🛑 Stop ripetizione Enigma 2
  useEffect(() => {
    if (enigma2CompletatoRef.current && intervalEnigma2Ref.current) {
      console.log('[LivingRoomScene] 🛑 Stop ripetizione messaggio Pianta (enigma completato)')
      clearInterval(intervalEnigma2Ref.current)
      intervalEnigma2Ref.current = null
      setMessaggioObiettivoEnigma2(false)
    }
  }, [enigma2CompletatoRef.current])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 3 (Condizionatore)
  useEffect(() => {
    if (messaggioObiettivoEnigma3 && !enigma3CompletatoRef.current) {
      console.log('[LivingRoomScene] 🔄 Avvio ripetizione messaggio Condizionatore (ogni 15s)')
      
      intervalEnigma3Ref.current = setInterval(() => {
        console.log('[LivingRoomScene] 🔄 Ripeto messaggio obiettivo Condizionatore')
        setMessaggioObiettivoEnigma3(true)
        setTimeout(() => setMessaggioObiettivoEnigma3(false), 5000)
      }, 15000)
    }
    
    return () => {
      if (intervalEnigma3Ref.current) {
        clearInterval(intervalEnigma3Ref.current)
        intervalEnigma3Ref.current = null
      }
    }
  }, [messaggioObiettivoEnigma3])
  
  // 🛑 Stop ripetizione Enigma 3
  useEffect(() => {
    if (enigma3CompletatoRef.current && intervalEnigma3Ref.current) {
      console.log('[LivingRoomScene] 🛑 Stop ripetizione messaggio Condizionatore (enigma completato)')
      clearInterval(intervalEnigma3Ref.current)
      intervalEnigma3Ref.current = null
      setMessaggioObiettivoEnigma3(false)
    }
  }, [enigma3CompletatoRef.current])
  
  // Keyboard listener per DEBUG tasti numerici E TASTO E E TASTO \
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      
      // 🎯 Tasto \ - Toggle nascondere tutti i debug UI
      if (key === '\\') {
        event.preventDefault()
        event.stopPropagation()
        setHideAllDebugUI(prev => {
          const newState = !prev
          console.log('[LivingRoomScene] 🎯 Toggle Debug UI:', newState ? 'NASCOSTO' : 'VISIBILE')
          return newState
        })
        return
      }
      
      // 🌱 Tasto G - Animazione Pianta
      if (key === 'g') {
        event.preventDefault()
        event.stopPropagation()
        
        if (!plantAnimConfig) {
          console.warn('[LivingRoomScene] ⚠️ Config pianta non caricata')
          return
        }
        
        // 🔒 PREREQUISITI: Controlla se pianta è disponibile (LED rosso)
        if (livingRoomPuzzle.ledStates?.pianta === 'off') {
          console.warn('[LivingRoomScene] 🔒 Pianta bloccata - completa prima la TV!')
          setMessaggioBloccoPianta(true)
          setTimeout(() => setMessaggioBloccoPianta(false), 3000)
          return
        }
        
        if (plantAnimState === 'closed') {
          console.log('[LivingRoomScene] 🌱 Tasto G - Animazione pianta START')
          const newState = 'opening'
          setPlantAnimState(newState)
          setIsPlantAnimPlaying(true)
          
          // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
          if (socket && sessionId) {
            socket.emit('syncAnimation', {
              sessionId,
              room: 'soggiorno',
              objectName: 'pianta',
              animationState: newState,
              playerName: 'DevPlayer',
              additionalData: {}
            })
            console.log('[LivingRoomScene] 📤 Sync emit: pianta → opening')
          }
        }
        return
      }
      
      // 🎭 Tasto M - Toggle animazione Humano + CouchSet + TV
      if (key === 'm') {
        event.preventDefault()
        event.stopPropagation()
        
        if (!livingRoomAnimConfig) {
          console.warn('[LivingRoomScene] ⚠️ Config non caricata, impossibile avviare animazione')
          return
        }
        
        if (livingRoomAnimState === 'closed') {
          // Apri: ruota a 22° + ACCENDI TV
          console.log('[LivingRoomScene] 🎭 Tasto M - Apertura (0° → 22°) + TV ON')
          const newState = 'opening'
          setLivingRoomAnimState(newState)
          setIsLivingRoomAnimPlaying(true)
          
          // 📺 ACCENDI TV con animazione realistica
          setTvAccesa(true)
          
          // 🎯 CHIAMA API BACKEND PER COMPLETARE TV
          livingRoomPuzzle.completeTV().then(() => {
            console.log('[LivingRoomScene] ✅ API completeTV chiamata - LED pianta ora ROSSO')
          }).catch(err => {
            console.error('[LivingRoomScene] ❌ Errore API completeTV:', err)
          })
          
          // 📺 MOSTRA MESSAGGIO COMPLETAMENTO
          setMessaggioCompletamento(true)
          setTimeout(() => setMessaggioCompletamento(false), 4000) // 4 secondi
          
          // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
          if (socket && sessionId) {
            socket.emit('syncAnimation', {
              sessionId,
              room: 'soggiorno',
              objectName: 'tv_divano',
              animationState: newState,
              playerName: 'DevPlayer',
              additionalData: { tvOn: true }
            })
            console.log('[LivingRoomScene] 📤 Sync emit: tv_divano → opening')
          }
        } else if (livingRoomAnimState === 'open') {
          // Chiudi: torna a 0° + SPEGNI TV
          console.log('[LivingRoomScene] 🎭 Tasto M - Chiusura (22° → 0°) + TV OFF')
          const newState = 'closing'
          setLivingRoomAnimState(newState)
          setIsLivingRoomAnimPlaying(true)
          // 📺 SPEGNI TV
          setTvAccesa(false)
          
          // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
          if (socket && sessionId) {
            socket.emit('syncAnimation', {
              sessionId,
              room: 'soggiorno',
              objectName: 'tv_divano',
              animationState: newState,
              playerName: 'DevPlayer',
              additionalData: { tvOn: false }
            })
            console.log('[LivingRoomScene] 📤 Sync emit: tv_divano → closing')
          }
        }
        return
      }
      
      // Tasto P - Toggle pannello debug
      if (key === 'p') {
        event.preventDefault()
        event.stopPropagation()
        setShowDebugPanel(prev => !prev)
        console.log('[LivingRoomScene] Pannello debug:', !showDebugPanel ? 'APERTO' : 'CHIUSO')
        return
      }
      
      // 🚪 Tasto O - Porta va a 30° (aperta)
      if (key === 'o') {
        event.preventDefault()
        event.stopPropagation()
        const newAngle = 30
        setPorteSoggiornoAngolo(newAngle)
        console.log('[LivingRoomScene] 🚪 Tasto O - Porte Soggiorno: 30° (APERTA)')
        
        // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'soggiorno',
            objectName: 'porte',
            animationState: 'angle_change',
            playerName: 'DevPlayer',
            additionalData: { angle: newAngle }
          })
          console.log('[LivingRoomScene] 📤 Sync emit: porte → 30°')
        }
        return
      }
      
      // 🚪 Tasto I - Porta va a 0° (chiusa) + completa condizionatore
      if (key === 'i') {
        event.preventDefault()
        event.stopPropagation()
        const newAngle = 0
        setPorteSoggiornoAngolo(newAngle)
        console.log('[LivingRoomScene] 🚪 Tasto I - Porte Soggiorno: 0° (CHIUSA)')
        
        // 🎯 Se enigma 2 è completato → completa puzzle condizionatore
        if (livingRoomPuzzle.ledStates?.condizionatore === 'red') {
          console.log('[LivingRoomScene] ❄️ LED condizionatore ROSSO → Completo puzzle!')
          livingRoomPuzzle.completeCondizionatore().then(() => {
            console.log('[LivingRoomScene] ✅ API completeCondizionatore chiamata - LED verde + porta blinking')
          }).catch(err => {
            console.error('[LivingRoomScene] ❌ Errore API completeCondizionatore:', err)
          })
        }
        
        // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'soggiorno',
            objectName: 'porte',
            animationState: 'angle_change',
            playerName: 'DevPlayer',
            additionalData: { angle: newAngle }
          })
          console.log('[LivingRoomScene] 📤 Sync emit: porte → 0°')
        }
        return
      }
      
      // 🚪 Tasto L - CONDIZIONALE basato su angolo CORRENTE
      if (key === 'l') {
        event.preventDefault()
        event.stopPropagation()
        setPorteSoggiornoAngolo(prev => {
          // Se è aperta (30°) → va a 60°
          // Se è chiusa (0°) → va a 90°
          const nuovoAngolo = prev === 30 ? 60 : 90
          console.log(`[LivingRoomScene] 🚪 Tasto L - Porte Soggiorno: ${prev}° → ${nuovoAngolo}°`)
          
          // 📤 SYNC WebSocket - Emetti evento per sincronizzare altri giocatori
          if (socket && sessionId) {
            socket.emit('syncAnimation', {
              sessionId,
              room: 'soggiorno',
              objectName: 'porte',
              animationState: 'angle_change',
              playerName: 'DevPlayer',
              additionalData: { angle: nuovoAngolo }
            })
            console.log(`[LivingRoomScene] 📤 Sync emit: porte → ${nuovoAngolo}°`)
          }
          
          return nuovoAngolo
        })
        return
      }
      
      // 🔄 Tasto R - RESET completo puzzle soggiorno
      if (key === 'r') {
        event.preventDefault()
        event.stopPropagation()
        console.log('[LivingRoomScene] 🔄 Tasto R - Reset puzzle soggiorno...')
        
        livingRoomPuzzle.resetPuzzles('full').then(() => {
          console.log('[LivingRoomScene] ✅ Reset completato - ricarico pagina per applicare modifiche')
          // Ricarica la pagina per resettare anche gli stati React locali
          window.location.reload()
        }).catch(err => {
          console.error('[LivingRoomScene] ❌ Errore reset:', err)
          alert('⚠️ Errore durante il reset!')
        })
        return
      }
      
      // Tasto E - Toggle Animation Editor
      if (key === 'e') {
        event.preventDefault()
        event.stopPropagation()
        setEditorEnabled(prev => {
          const newState = !prev
          console.log('[LivingRoomScene] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
          if (!newState) {
            setSelectedObject(null)
            setShowEditorUI(false)
            setIsAnimationPlaying(false)
            setPickDestinationMode(false)
            setMultiObjectMode(false)
            setSlots([])
            setObjectsLocked(false)
          }
          return newState
        })
        return
      }
      
      // DEBUG: Controlli per offset Y del modello (tasti numerici 1/2/3)
      if (event.key === '1') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev + 0.1) * 10) / 10
          console.log(`[LivingRoomScene] 📈 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '2') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev - 0.1) * 10) / 10
          console.log(`[LivingRoomScene] 📉 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '3') {
        setModelYOffset(2.0)
        console.log('[LivingRoomScene] 🔄 Model Y offset reset to default: 2.0m')
      }
      
      // DEBUG: Controlli per eyeHeight (altezza occhi) (tasti numerici 7/8/9)
      if (event.key === '7') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev + 0.1) * 10) / 10
          console.log(`[LivingRoomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '8') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev - 0.1) * 10) / 10
          console.log(`[LivingRoomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '9') {
        setEyeHeight(1.4)
        console.log('[LivingRoomScene] 🔄 EyeHeight reset to default: 1.4m')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [livingRoomAnimConfig, livingRoomAnimState, plantAnimConfig, plantAnimState, showDebugPanel])
  
  // 🎭 Callback completamento animazione
  useEffect(() => {
    if (!isLivingRoomAnimPlaying) return
    
    // Gestisci il completamento in base allo stato
    const timer = setTimeout(() => {
      if (livingRoomAnimState === 'opening') {
        console.log('[LivingRoomScene] ✅ Animazione apertura completata')
        setLivingRoomAnimState('open')
        setIsLivingRoomAnimPlaying(false)
      } else if (livingRoomAnimState === 'closing') {
        console.log('[LivingRoomScene] ✅ Animazione chiusura completata')
        setLivingRoomAnimState('closed')
        setIsLivingRoomAnimPlaying(false)
      }
    }, 1000) // Tempo stimato dell'animazione
    
    return () => clearTimeout(timer)
  }, [isLivingRoomAnimPlaying, livingRoomAnimState])
  
  // ✅ Handler conferma chiusura porta (click SI nel dialog)
  const handleConfermaChiusuraPorta = async () => {
    console.log('[LivingRoomScene] ✅ Confermato - Chiudo porta e completo puzzle')
    
    try {
      // 1. Chiudi porta (equivalente a Tasto I)
      setPorteSoggiornoAngolo(0)
      console.log('[LivingRoomScene] 🚪 Porta chiusa (0°)')
      
      // 2. Chiama API backend per completare puzzle condizionatore
      await livingRoomPuzzle.completeCondizionatore()
      console.log('[LivingRoomScene] 🎯 API completeCondizionatore chiamata')
      
      // 3. Chiudi dialog
      setDialogChiudiPorta(false)
      
      console.log('[LivingRoomScene] ✅ Puzzle condizionatore completato!')
    } catch (error) {
      console.error('[LivingRoomScene] ❌ Errore completamento puzzle:', error)
      alert('⚠️ Errore durante il completamento del puzzle!')
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
  
  // 🎯 Wrapper per onObjectClick che gestisce parent handler
  const handleObjectClick = (objectName) => {
    // 🎯 Se objectName è null/undefined, usa quello che sto guardando con il mirino!
    const targetObject = objectName || currentLookTarget
    
    if (!targetObject) {
      console.log('[LivingRoomScene] Click senza target (né mouse né mirino)')
      return
    }
    
    console.log('[LivingRoomScene] 🎯 Click ricevuto:', {
      fromMouse: objectName,
      fromCrosshair: currentLookTarget,
      used: targetObject
    })
    
    // Chiama il parent handler se fornito
    if (onObjectClick) {
      onObjectClick(targetObject)
    }
  }
  
  // Calcola boundary limits
  useEffect(() => {
    if (!modelRef.current) return
    
    modelRef.current.updateWorldMatrix(true, true)
    
    const box = new THREE.Box3().setFromObject(modelRef.current)
    
    const limits = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z
    }
    
    console.log('[LivingRoom] Bounding box limits:', limits)
    console.log('[LivingRoom] Using FIXED params: eyeHeight=', EYE_HEIGHT, 'moveSpeed=', MOVE_SPEED, 'collisionRadius=', COLLISION_RADIUS)
    
    setBoundaryLimits(limits)
  }, [modelRef])

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      cursor: dialogChiudiPorta ? 'default' : 'inherit'
    }}>
      {/* Loading Overlay - SEMPRE visibile finché spawn non è caricato */}
      <LoadingOverlay 
        isVisible={isLoading || !safeSpawnPosition}
        progress={loadingProgress}
        message="Caricamento Soggiorno"
      />
      
      {/* Debug overlay - mostra posizione e rotazione in tempo reale */}
      {!hideAllDebugUI && <LivePositionDebug debugInfo={liveDebugInfo} />}
      
      {/* 🎯 Animation Editor UI - nascosto se hideAllPanels è true */}
      {showEditorUI && (
        <AnimationEditor
          selectedObject={selectedObject}
          initialConfig={animationConfig}
          pickDestinationMode={pickDestinationMode}
          modelRef={modelRef}
          onClose={() => {
            setSelectedObject(null)
            setShowEditorUI(false)
            setIsAnimationPlaying(false)
            setPickDestinationMode(false)
            setMultiObjectMode(false)
            setSlots([])
            setObjectsLocked(false)
          }}
          onConfigChange={setAnimationConfig}
          onTestAnimation={() => {
            console.log('[LivingRoomScene] Test animazione avviato')
            setIsAnimationPlaying(true)
          }}
          isAnimationPlaying={isAnimationPlaying}
          onPickDestinationStart={() => {
            console.log('[LivingRoomScene] Pick destination mode ATTIVATO')
            setPickDestinationMode(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[LivingRoomScene] Pick destination mode DISATTIVATO')
            setPickDestinationMode(false)
          }}
          slots={slots}
          onSlotsChange={setSlots}
          multiObjectMode={multiObjectMode}
          onMultiObjectModeChange={setMultiObjectMode}
          objectsLocked={objectsLocked}
          onObjectsLockedChange={setObjectsLocked}
        />
      )}
      
      {/* 🎯 Indicatore stato editor */}
      {editorEnabled && (
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
      
      {/* Overlay UI per cattura posizioni */}
      {!hideAllDebugUI && captureReady && positionCaptureRef.current && (
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
      
      {/* 🔄 FIX DEADLOCK: Renderizza Canvas appena coordinate DB sono caricate (RAW) */}
      {canRenderCanvas && (
        <Canvas
          camera={{ 
            position: [spawnPosition.x, eyeHeight, spawnPosition.z],
            fov: 75, 
            near: 0.1 
          }} 
          shadows={!isMobile}
          dpr={isMobile ? [1, 1.2] : [1, 2]}
          gl={{ antialias: !isMobile, powerPreference: isMobile ? 'low-power' : 'high-performance' }}
          style={{ 
            pointerEvents: dialogChiudiPorta ? 'none' : 'auto' 
          }}
        >
        <ambientLight intensity={isMobile ? 0.7 : 0.6} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={0.8} 
          castShadow={!isMobile} 
          shadow-bias={-0.0005} 
        />
        
        {/* Reader interno - legge posizione/rotazione e aggiorna lo state */}
        <LivePositionReader onUpdate={setLiveDebugInfo} />
        
        {/* 🔄 GUARD: Spawn SOLO quando mondo è stabile (worldReady) E coordinate caricate */}
        {worldReady && spawnPosition && (
          <FPSController
            modelRef={modelRef}
            mobileInput={mobileInput}
            onLookAtChange={handleLookAtChange}
            groundPlaneMesh={groundPlaneRef}
            isMobile={isMobile}
            boundaryLimits={boundaryLimits}
            initialPosition={spawnPosition}
            initialYaw={initialYaw}
            eyeHeight={eyeHeight}
            modelScale={MODEL_SCALE}
            positionCaptureRef={positionCaptureRef}
            porteSoggiornoAngolo={porteSoggiornoAngolo}
            controlsEnabled={!dialogChiudiPorta}
          />
        )}
        
        {/* 🚪 Proximity Trigger per Dialog Porta */}
        <DoorProximityTrigger
          doorPosition={new THREE.Vector3(0.4, 0, 1.62)}
          triggerRadius={1.5}
          enigma2Completato={enigma2Completato}
          enigma3Completato={enigma3Completato}
          onTrigger={() => {
            if (!dialogChiudiPorta) {
              console.log('[LivingRoomScene] 🚪 Proximity trigger - Mostra dialog chiudi porta')
              setDialogChiudiPorta(true)
            }
          }}
        />
        
        <Suspense fallback={<LoadingIndicator />}>
          <CasaModel 
            sceneType="soggiorno"
            porteSoggiornoAperte={porteSoggiornoAperte}
            porteSoggiornoConfig={porteSoggiornoConfig}
            onObjectClick={handleObjectClick} 
            modelRef={setModelRef}
            onReady={handleWorldReady}
            enableShadows={!isMobile}
            modelYOffset={modelYOffset}
          />
          
          <GroundPlane onGroundReady={setGroundPlaneRef} />
          
          {/* 🎭 Sistema animazione Humano + CouchSet (tasto M) */}
          {modelRef.current && livingRoomAnimConfig && (
            <LivingRoomAnimationController
              modelRef={modelRef}
              config={livingRoomAnimConfig}
              isPlaying={isLivingRoomAnimPlaying}
              animState={livingRoomAnimState}
              onComplete={() => {
                console.log('[LivingRoomScene] Animazione soggiorno completata')
                // Il completamento è gestito dall'useEffect basato su timer
              }}
            />
          )}
          
          {/* 🌱 Sistema animazione Pianta (tasto G) */}
          {modelRef.current && plantAnimConfig && (
            <PlantAnimationController
              modelRef={modelRef}
              config={plantAnimConfig}
              isPlaying={isPlantAnimPlaying}
              onComplete={() => {
                console.log('[LivingRoomScene] 🌱 Animazione pianta completata')
                setPlantAnimState('open')
                setIsPlantAnimPlaying(false)
                
                // 🎯 CHIAMA API BACKEND PER COMPLETARE PIANTA
                livingRoomPuzzle.completePianta().then(() => {
                  console.log('[LivingRoomScene] ✅ API completePianta chiamata - LED condizionatore ora ROSSO')
                }).catch(err => {
                  console.error('[LivingRoomScene] ❌ Errore API completePianta:', err)
                })
                
                // 🌱 MOSTRA MESSAGGIO COMPLETAMENTO PIANTA
                setMessaggioCompletamentoPianta(true)
                setTimeout(() => setMessaggioCompletamentoPianta(false), 4000) // 4 secondi
              }}
            />
          )}
          
          {/* 💡 LED Dinamici gestiti dal backend */}
          {livingRoomPuzzle.ledStates && (
            <>
              {/* 🏆 LED PORTA usa Game Completion (sistema globale) */}
              <PuzzleLED
                ledUuid="ED75C7E6-2B25-4FAE-853F-D7CB43B374AF"
                state={gameCompletion.getDoorLEDColor('soggiorno')}
              />
              <PuzzleLED
                ledUuid="768647C9-916F-451D-A728-DFA085C7B9B6"
                state={livingRoomPuzzle.ledStates.pianta}
              />
              <PuzzleLED
                ledUuid="C715B901-3B65-4D33-8F01-9548A"
                state={livingRoomPuzzle.ledStates.condizionatore}
              />
            </>
          )}
          
          {/* Sistema di editing animazioni - SOLO quando editorEnabled è true */}
          {editorEnabled && modelRef.current && (
            <AnimationEditorScene
              modelRef={modelRef}
              selectedObject={selectedObject}
              onSelect={setSelectedObject}
              animationConfig={animationConfig}
              isAnimationPlaying={isAnimationPlaying}
              onAnimationComplete={() => {
                console.log('[LivingRoomScene] Animazione completata')
                setIsAnimationPlaying(false)
              }}
              pickDestinationMode={pickDestinationMode}
              multiObjectMode={multiObjectMode}
              objectsLocked={objectsLocked}
              slots={slots}
              onSlotsChange={setSlots}
              visualMarkerPosition={visualMarkerPosition}
              onDestinationPicked={(worldPos) => {
                console.log('[LivingRoomScene] ✅ Destinazione picked (raw):', worldPos)
                
                // 🎯 Salva posizione VISIVA per il marker (dove l'utente ha cliccato)
                setVisualMarkerPosition({
                  x: worldPos.x,
                  y: worldPos.y,
                  z: worldPos.z
                })
                console.log('[LivingRoomScene] 🔴 Marker VISIVO salvato a:', worldPos)
                
                // Aggiorna animationConfig con le nuove coordinate
                if (animationConfig?.mode === 'position' && selectedObject) {
                  // Rileggi Punto A dal nodo movibile (ROOT se esiste)
                  const movable = getMovableNode(selectedObject)
                  const currentWorldPos = new THREE.Vector3()
                  movable.getWorldPosition(currentWorldPos)
                  
                  // Calcola centro visivo reale della mesh
                  const box = new THREE.Box3().setFromObject(selectedObject)
                  const visualCenter = new THREE.Vector3()
                  box.getCenter(visualCenter)
                  
                  // Calcola offset tra pivot (movable) e centro visivo (mesh)
                  const offset = new THREE.Vector3().subVectors(visualCenter, currentWorldPos)
                  
                  // Correggi il target sottraendo l'offset
                  const correctedTarget = new THREE.Vector3().subVectors(worldPos, offset)
                  
                  console.log('[LivingRoomScene] 🔄 Rilettura Punto A da:', movable.name)
                  console.log('[LivingRoomScene] ✅ Punto B corretto (ANIMAZIONE):', correctedTarget)
                  
                  const newConfig = {
                    ...animationConfig,
                    startX: currentWorldPos.x,
                    startY: currentWorldPos.y,
                    startZ: currentWorldPos.z,
                    endX: correctedTarget.x,
                    endY: correctedTarget.y,
                    endZ: correctedTarget.z
                  }
                  console.log('[LivingRoomScene] Nuovo animationConfig:', newConfig)
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
      
      {/* DEBUG: Model Position Control Panel */}
      {!hideAllDebugUI && showDebugPanel && (
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold', 
            marginBottom: '10px', 
            fontSize: '14px',
            color: '#00aaff',
            borderBottom: '1px solid #00aaff',
            paddingBottom: '8px'
          }}>
            <span>🔧 DEBUG: Posizione Modello</span>
            <button
              onClick={() => setShowDebugPanel(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff6b6b',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 5px',
                lineHeight: '1'
              }}
              title="Minimizza pannello"
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
        </div>
        </div>
      )}
      
      {/* Pulsante per riaprire il pannello debug se chiuso */}
      {false && !hideAllDebugUI && !showDebugPanel && (
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
      
      {/* 💬 OVERLAY MESSAGGI AUTOMATICI - PATTERN CUCINA COMPLETO */}
      
      {/* 📺 ENIGMA 1: TV/COUCH - Messaggio Iniziale */}
      {messaggioInizialeEnigma1 && (
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
          border: '3px solid #00aaff',
          boxShadow: '0 0 30px rgba(0, 170, 255, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>📺</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            Mettiti comodo
          </p>
        </div>
      )}
      
      {/* 📺 ENIGMA 1: TV - Messaggio Obiettivo */}
      {messaggioObiettivoEnigma1 && (
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
          maxWidth: '550px',
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
            Posiziona il <strong>divano</strong> con lo schienale a ridosso della vetrata
          </p>
        </div>
      )}
      
      {/* 📺 ENIGMA 1: TV - Successo */}
      {messaggioSuccessoEnigma1 && (
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
          <div style={{ marginBottom: '20px', fontSize: '64px', animation: 'bounce 1s ease-in-out infinite' }}>📺</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ff88' }}>
            Ottimo lavoro!<br/>Ora puoi guardare la TV
          </p>
        </div>
      )}
      
      {/* 🌱 ENIGMA 2: PIANTA - Messaggio Iniziale */}
      {messaggioInizialeEnigma2 && (
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
            Facilita la fotosintesi!
          </p>
        </div>
      )}
      
      {/* 🌱 ENIGMA 2: PIANTA - Messaggio Obiettivo */}
      {messaggioObiettivoEnigma2 && (
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
          maxWidth: '550px',
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
            Posiziona la <strong>pianta</strong> nell'area selezionata che vedi nel virtuale
          </p>
        </div>
      )}
      
      {/* 🌱 ENIGMA 2: PIANTA - Successo */}
      {messaggioSuccessoEnigma2 && (
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
          fontSize: '24px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '4px solid #00ff88',
          boxShadow: '0 0 40px rgba(0, 255, 136, 0.8)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px', animation: 'bounce 1s ease-in-out infinite' }}>🌿</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ff88' }}>
            Perfetto!<br/>La pianta crescerà più veloce
          </p>
        </div>
      )}
      
      {/* ❄️ ENIGMA 3: CONDIZIONATORE - Messaggio Iniziale */}
      {messaggioInizialeEnigma3 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 40, 60, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ccff',
          boxShadow: '0 0 35px rgba(0, 204, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '52px' }}>❄️</div>
          <p style={{ margin: 0, lineHeight: '1.6', fontWeight: 'bold', color: '#00ddff', fontSize: '22px' }}>
            Rinfresca l'ambiente!
          </p>
        </div>
      )}
      
      {/* ❄️ ENIGMA 3: CONDIZIONATORE/PORTA - Messaggio Obiettivo */}
      {messaggioObiettivoEnigma3 && (
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
          maxWidth: '550px',
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
            Avvicinati alla <strong>porta</strong> e clicca il tasto '<strong>Chiudi Porta</strong>'
          </p>
        </div>
      )}
      
      {/* ❄️ ENIGMA 3: CONDIZIONATORE - Successo */}
      {messaggioSuccessoEnigma3 && (
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
            Eccellente!<br/>L'aria è più fresca
          </p>
        </div>
      )}
      
      {/* 🎉 MESSAGGIO FINALE STANZA */}
      {messaggioFinaleStanza && (
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
          <div style={{ marginBottom: '25px', fontSize: '80px', animation: 'spin 2s linear infinite' }}>🎉</div>
          <p style={{ margin: '0 0 20px 0', lineHeight: '1.6', fontWeight: 'bold', fontSize: '28px', color: '#00ff88' }}>
            Complimenti!
          </p>
          <p style={{ margin: 0, lineHeight: '1.6', fontSize: '20px', color: '#88ff88' }}>
            Hai completato tutti gli enigmi<br/>del soggiorno! ✅
          </p>
        </div>
      )}
      
      
      {/* ✅ MESSAGGIO COMPLETAMENTO - Overlay animato (dopo tasto M) */}
      {messaggioCompletamento && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 170, 0, 0.95)',
          padding: '30px 40px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff00',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>✅</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            Ottimo, hai posizionato correttamente il divano, ora puoi guardare la TV
          </p>
        </div>
      )}
      
      {/* 🌱 MESSAGGIO COMPLETAMENTO PIANTA - Overlay animato (dopo tasto G) */}
      {messaggioCompletamentoPianta && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 170, 0, 0.95)',
          padding: '30px 40px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff00',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>🌱</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            Complimenti, così la tua pianta crescerà più velocemente!
          </p>
        </div>
      )}
      
      {/* ❄️ MESSAGGIO CONDIZIONATORE - Overlay animato (click su condizionatore) */}
      {messaggioCondizionatore && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 170, 255, 0.95)',
          padding: '30px 40px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00aaff',
          boxShadow: '0 0 30px rgba(0, 170, 255, 0.6)',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>❄️</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
            Se vuoi rinfrescare l'ambiente chiudi la porta
          </p>
        </div>
      )}
      
      {/* 🚫 BLOCCO PIANTA - Styled overlay (come cucina) */}
      {messaggioBloccoPianta && (
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
            Completa prima la <strong>TV</strong>
          </p>
        </div>
      )}
      
      {/* 🚫 BLOCCO CONDIZIONATORE - Styled overlay (come cucina) */}
      {messaggioBloccoCondizionatore && (
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
            Completa prima la <strong>PIANTA</strong>
          </p>
        </div>
      )}
      
      {/* 🚪 DIALOG CHIUDI PORTA - Modal con bottoni SI/NO */}
      {dialogChiudiPorta && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          animation: 'fadeIn 0.2s ease-in'
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            padding: '40px 50px',
            borderRadius: '15px',
            border: '3px solid #00aaff',
            boxShadow: '0 0 40px rgba(0, 170, 255, 0.8)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              fontSize: '32px',
              marginBottom: '30px',
              fontWeight: 'bold'
            }}>
              🚪 CHIUDERE LA PORTA?
            </h2>
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleConfermaChiusuraPorta}
                style={{
                  backgroundColor: '#00aa00',
                  color: 'white',
                  border: '2px solid #00ff00',
                  padding: '15px 40px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 4px 15px rgba(0, 255, 0, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#00ff00'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#00aa00'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                SI
              </button>
              <button
                onClick={() => setDialogChiudiPorta(false)}
                style={{
                  backgroundColor: '#aa0000',
                  color: 'white',
                  border: '2px solid #ff0000',
                  padding: '15px 40px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 4px 15px rgba(255, 0, 0, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ff0000'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#aa0000'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Animations per messaggi - PATTERN CUCINA COMPLETO */}
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
      
      {/* 📺 Sistema Accensione TV Realistica */}
      {modelRef.current && (
        <TVScreenController
          modelRef={modelRef}
          tvAccesa={tvAccesa}
          logoPath="/logo.jpg"
        />
      )}
    </div>
  )
}

// 🚪 Componente per proximity trigger della porta
function DoorProximityTrigger({ doorPosition, triggerRadius, enigma2Completato, enigma3Completato, onTrigger }) {
  const { camera } = useThree()
  const hasTriggeredRef = useRef(false)
  const logCounterRef = useRef(0)
  
  useFrame(() => {
    // ✅ PREREQUISITI: Solo se enigma 2 completato ed enigma 3 NON completato
    if (!enigma2Completato || enigma3Completato) {
      hasTriggeredRef.current = false // Reset quando non soddisfa prerequisiti
      return
    }
    
    // 🎯 FIX: Usa WORLD coordinates per entrambe le posizioni
    const playerWorldPos = new THREE.Vector3()
    camera.getWorldPosition(playerWorldPos)
    const distance = playerWorldPos.distanceTo(doorPosition)
    
    // 🔍 DEBUG: Log ogni 60 frame (circa 1 secondo a 60fps)
    logCounterRef.current++
    if (logCounterRef.current >= 60) {
      console.log('[DoorProximityTrigger] 🔍 DEBUG (WORLD coords):', {
        playerPos: { x: playerWorldPos.x.toFixed(2), y: playerWorldPos.y.toFixed(2), z: playerWorldPos.z.toFixed(2) },
        doorPos: { x: doorPosition.x.toFixed(2), y: doorPosition.y.toFixed(2), z: doorPosition.z.toFixed(2) },
        distance: distance.toFixed(2) + 'm',
        triggerRadius: triggerRadius + 'm',
        isWithinRange: distance < triggerRadius,
        hasTriggered: hasTriggeredRef.current
      })
      logCounterRef.current = 0
    }
    
    // Se dentro il raggio E non ha ancora triggerato
    if (distance < triggerRadius && !hasTriggeredRef.current) {
      console.log('[DoorProximityTrigger] 🚪 Player vicino alla porta (distanza WORLD:', distance.toFixed(2), 'm) - Trigger dialog!')
      hasTriggeredRef.current = true // Evita trigger multipli
      onTrigger()
    }
    
    // Reset se si allontana troppo (per permettere re-trigger se necessario)
    if (distance > triggerRadius * 1.2) {
      if (hasTriggeredRef.current) {
        console.log('[DoorProximityTrigger] ↩️ Player si è allontanato - reset trigger (distanza WORLD:', distance.toFixed(2), 'm)')
      }
      hasTriggeredRef.current = false
    }
  })
  
  return null // Componente invisibile
}

// 🎭 Componente controller per animazione Humano + CouchSet
function LivingRoomAnimationController({ modelRef, config, isPlaying, animState, onComplete }) {
  const [humanObject, setHumanObject] = useState(null)
  const [couchObject, setCouchObject] = useState(null)
  
  // Trova gli oggetti nel modello
  useEffect(() => {
    if (!modelRef || !modelRef.current) return
    
    console.log('[LivingRoomAnimationController] 🔍 Cercando oggetti nel modello...')
    
    let human = null
    let couch = null
    
    // Pattern UUID da cercare
    const HUMANO_UUID = 'DD8B908D-EA31-4441-8A46-382EB50A15B3'
    const COUCH_UUID = 'DFBB52B8-5818-4301-AA60-E98CE42CB71A'
    
    modelRef.current.traverse((child) => {
      if (child.name && child.name.includes(HUMANO_UUID)) {
        human = child
        console.log('[LivingRoomAnimationController] ✅ Humano trovato:', child.name)
      }
      if (child.name && child.name.includes(COUCH_UUID)) {
        couch = child
        console.log('[LivingRoomAnimationController] ✅ CouchSet trovato:', child.name)
      }
    })
    
    if (human && couch) {
      setHumanObject(human)
      setCouchObject(couch)
      console.log('[LivingRoomAnimationController] ✅ Entrambi gli oggetti trovati!')
    } else {
      console.warn('[LivingRoomAnimationController] ⚠️ Oggetti non trovati:', { human: !!human, couch: !!couch })
    }
  }, [modelRef])
  
  // Chiama SEMPRE l'hook (regola React) - lui gestisce i null internamente
  useLivingRoomAnimation(
    humanObject,
    couchObject,
    config,
    isPlaying,
    onComplete
  )
  
  return null // Componente invisibile
}

// 📺 Componente per gestire l'accensione realistica della TV
function TVScreenController({ modelRef, tvAccesa, logoPath }) {
  const [tvDisplayMesh, setTvDisplayMesh] = useState(null)
  const [logoTexture, setLogoTexture] = useState(null)
  const animationProgressRef = useRef(0)
  const animationFrameRef = useRef(null)
  
  // Trova il mesh dello schermo TV
  useEffect(() => {
    if (!modelRef || !modelRef.current) return
    
    console.log('[TVScreenController] 🔍 Cercando schermo TV nel modello...')
    
    // Pattern possibili per lo schermo TV
    const TV_SCREEN_PATTERNS = [
      'fb17d86e-ad44-4e91-9ad1-4923b740e36b', // UUID TV
      'tv_display',
      'screen',
      'display'
    ]
    
    let foundScreen = null
    
    modelRef.current.traverse((child) => {
      if (child.isMesh && child.name) {
        const name = child.name.toLowerCase()
        
        // Cerca pattern TV nell'oggetto
        for (const pattern of TV_SCREEN_PATTERNS) {
          if (name.includes(pattern)) {
            // Potenziale candidato - verifica che sia planare (schermo)
            const box = new THREE.Box3().setFromObject(child)
            const size = new THREE.Vector3()
            box.getSize(size)
            
            // Uno schermo dovrebbe essere sottile in una dimensione
            const minDim = Math.min(size.x, size.y, size.z)
            if (minDim < 0.1) { // Schermo piatto
              foundScreen = child
              console.log('[TVScreenController] ✅ Schermo TV trovato:', child.name)
              break
            }
          }
        }
      }
    })
    
    if (foundScreen) {
      setTvDisplayMesh(foundScreen)
      
      // Prepara materiale per animazione
      if (foundScreen.material) {
        foundScreen.material = foundScreen.material.clone() // Clone per non modificare l'originale
        foundScreen.material.transparent = true
        foundScreen.material.opacity = 0
        foundScreen.material.needsUpdate = true
      }
    } else {
      console.warn('[TVScreenController] ⚠️ Schermo TV non trovato!')
    }
  }, [modelRef])
  
  // Carica texture logo
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(
      logoPath,
      (texture) => {
        console.log('[TVScreenController] ✅ Texture logo caricata')
        
        // 🎯 Centra l'immagine sulla TV
        texture.center.set(0.5, 0.5) // Imposta centro di rotazione/scala al centro
        
        // 🎯 Scala per "contain" (immagine intera visibile, centrata)
        // Se l'immagine è più larga che alta o viceversa, scala proporzionalmente
        const imgAspect = texture.image.width / texture.image.height
        const screenAspect = 16 / 9 // Aspect ratio tipico TV
        
        if (imgAspect > screenAspect) {
          // Immagine più larga → scala per larghezza
          texture.repeat.set(1, screenAspect / imgAspect)
          texture.offset.set(0, (1 - screenAspect / imgAspect) / 2)
        } else {
          // Immagine più alta → scala per altezza  
          texture.repeat.set(imgAspect / screenAspect, 1)
          texture.offset.set((1 - imgAspect / screenAspect) / 2, 0)
        }
        
        texture.needsUpdate = true
        setLogoTexture(texture)
      },
      undefined,
      (error) => {
        console.error('[TVScreenController] ❌ Errore caricamento logo:', error)
      }
    )
  }, [logoPath])
  
  // Animazione accensione/spegnimento
  useEffect(() => {
    if (!tvDisplayMesh || !logoTexture) return
    
    // Cancella animazione precedente se esiste
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (tvAccesa) {
      // 📺 ACCENSIONE - VERDE ITI SOLIDO (senza logo per ora)
      console.log('[TVScreenController] 📺 TV ACCESA - Verde ITI')
      
      // Imposta direttamente verde ITI
      tvDisplayMesh.material.map = null // Nessuna texture
      tvDisplayMesh.material.color = new THREE.Color(0x00ff00) // Verde brillante
      tvDisplayMesh.material.emissive = new THREE.Color(0x00ff00) // Verde emissivo
      tvDisplayMesh.material.emissiveIntensity = 1.5 // Molto luminoso
      tvDisplayMesh.material.opacity = 1.0 // Opacità piena
      tvDisplayMesh.material.needsUpdate = true
      
      console.log('[TVScreenController] ✅ TV verde accesa!')
      
    } else {
      // 📺 SPEGNIMENTO - Rapido fade-out
      console.log('[TVScreenController] 📺 Spegnimento TV')
      animationProgressRef.current = 1
      
      const animate = () => {
        animationProgressRef.current -= 0.05 // Spegnimento più rapido
        const progress = Math.max(0, animationProgressRef.current)
        
        tvDisplayMesh.material.opacity = progress
        tvDisplayMesh.material.emissiveIntensity = progress * 1.5
        tvDisplayMesh.material.needsUpdate = true
        
        if (progress > 0) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          // Reset completo
          tvDisplayMesh.material.map = null
          tvDisplayMesh.material.opacity = 0
          tvDisplayMesh.material.emissiveIntensity = 0
          tvDisplayMesh.material.needsUpdate = true
          console.log('[TVScreenController] ✅ TV spenta')
          animationFrameRef.current = null
        }
      }
      
      animate()
    }
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [tvAccesa, tvDisplayMesh, logoTexture])
  
  return null // Componente invisibile
}

// 🌱 Componente controller per animazione Pianta (4 oggetti insieme)
function PlantAnimationController({ modelRef, config, isPlaying, onComplete }) {
  const [plantObjects, setPlantObjects] = useState([])
  
  // Trova TUTTI i 4 oggetti che compongono la pianta
  useEffect(() => {
    if (!modelRef || !modelRef.current) return
    
    console.log('[PlantAnimationController] 🔍 Cercando tutti i componenti della pianta...')
    
    // 4 UUID da cercare (forniti dall'utente)
    const PLANT_UUIDS = [
      '59C82E89-705B-40B0-8BD7-3BBF4897BC4D', // Pianta 1
      '57D3AAE9-AC40-4EAF-B0A6-D88D9BB00B1C', // Pianta 2  
      '9AC0D035-3A94-414C-B813-221BEB0717EC', // Pianta 3
      'BCA4619A-D027-405A-8A0F-B69D299EA6E7'  // TERRA_VASO
    ]
    
    const foundObjects = []
    
    modelRef.current.traverse((child) => {
      if (child.name) {
        // 🎯 FILTRO: Solo piante del SOGGIORNO (non PIANTA_CUCINA)
        const name = child.name.toLowerCase()
        if (name.includes('pianta_cucina') || name.includes('terra_vaso_cucina')) {
          return // Skip piante cucina
        }
        
        // Cerca ogni UUID
        for (const uuid of PLANT_UUIDS) {
          if (child.name.includes(uuid)) {
            // Usa getMovableNode per risalire al nodo movibile
            const movableNode = getMovableNode(child)
            
            // Evita duplicati
            const alreadyAdded = foundObjects.some(obj => obj.uuid === movableNode.uuid)
            if (!alreadyAdded) {
              foundObjects.push(movableNode)
              console.log('[PlantAnimationController] ✅ Trovato:', child.name, '→ movable:', movableNode.name)
            }
            break // Evita duplicati UUID
          }
        }
      }
    })
    
    if (foundObjects.length === 4) {
      setPlantObjects(foundObjects)
      console.log('[PlantAnimationController] ✅ Tutti i 4 componenti trovati! Pronti per animazione multi-object')
    } else {
      console.warn(`[PlantAnimationController] ⚠️ Trovati solo ${foundObjects.length}/4 componenti:`)
      foundObjects.forEach((obj, idx) => {
        console.log(`  ${idx + 1}. ${obj.name}`)
      })
    }
  }, [modelRef])
  
  // Usa l'hook MULTI-OBJECT per animare tutti e 4 insieme
  useMultiObjectAnimationPreview(
    plantObjects,
    config,
    isPlaying,
    onComplete
  )
  
  return null // Componente invisibile
}

// Componente per gestire la selezione e i visual helper nell'editor
function AnimationEditorScene({ modelRef, selectedObject, onSelect, animationConfig, isAnimationPlaying, onAnimationComplete, pickDestinationMode, onDestinationPicked, multiObjectMode, objectsLocked, slots, onSlotsChange, visualMarkerPosition }) {
  // Hook di selezione oggetti - DISABILITATO quando in pick destination mode
  useObjectSelection({
    enabled: !pickDestinationMode,
    selectableObjects: modelRef.current ? [modelRef.current] : [],
    onSelect: (obj) => {
      // Risolvi al nodo movibile PRIMA di passare al parent
      const movable = getMovableNode(obj)
      
      console.log('[AnimationEditorScene] Oggetto cliccato:', obj.name)
      console.log('[AnimationEditorScene] Nodo movibile selezionato:', movable.name)
      
      if (movable !== obj) {
        console.log('✅ [AnimationEditorScene] Pattern ROOT rilevato - usando parent')
      }
      
      // 🔄 MULTI-OBJECT MODE: Riempi slot invece di selezionare
      if (multiObjectMode && !objectsLocked) {
        console.log('[AnimationEditorScene] 🔄 Multi-Object Mode attivo - tentativo riempimento slot')
        
        // Controlla duplicati
        const isDuplicate = slots.some(s => s.object?.uuid === movable.uuid)
        
        if (isDuplicate) {
          console.log('[AnimationEditorScene] ⚠️ Oggetto già selezionato:', movable.name)
          alert('⚠️ Oggetto già selezionato!')
          return
        }
        
        // Trova primo slot vuoto
        const emptySlotIndex = slots.findIndex(s => s.object === null)
        
        if (emptySlotIndex >= 0) {
          // Riempi slot vuoto
          const newSlots = [...slots]
          newSlots[emptySlotIndex].object = movable
          
          console.log('[AnimationEditorScene] ✅ Slot', emptySlotIndex + 1, 'riempito con:', movable.name)
          console.log('[AnimationEditorScene] UUID:', movable.uuid)
          
          if (onSlotsChange) {
            onSlotsChange(newSlots)
          }
        } else {
          console.log('[AnimationEditorScene] ❌ Nessuno slot vuoto disponibile')
          alert('⚠️ Nessuno slot vuoto! Usa il button "➕ Aggiungi Slot" per creare nuovi slot.')
        }
      } else {
        // Modalità normale: seleziona singolo oggetto
        console.log('[AnimationEditorScene] Modalità normale - seleziono oggetto')
        onSelect(movable)
      }
    },
    onDeselect: () => {
      console.log('[AnimationEditorScene] Deselezione')
      if (!multiObjectMode) {
        onSelect(null)
      }
    }
  })
  
  // Hook per pick destination AnimationEditor - ATTIVO solo quando pickDestinationMode è true
  usePositionPicker(
    pickDestinationMode,
    (worldPos) => {
      console.log('[LivingRoomScene] ✅ Coordinate picked:', worldPos)
      if (onDestinationPicked) {
        onDestinationPicked(worldPos)
      }
    },
    () => {
      console.log('[LivingRoomScene] Pick annullato')
    }
  )
  
  // 🔄 Hook per animazione preview - CONDIZIONALE basato su multi-object mode
  // ✅ FIX LOOP: Memoizza filledSlots per evitare ricreazione array ogni render
  const filledSlots = useMemo(() => 
    slots ? slots.filter(s => s.object !== null) : [],
    [slots]
  )
  
  // ✅ FIX LOOP: Memoizza variabili derivate
  const isMultiObjectActive = useMemo(() => 
    objectsLocked && filledSlots.length > 0,
    [objectsLocked, filledSlots]
  )
  
  // Hook singolo oggetto (modalità normale)
  useAnimationPreview(
    isMultiObjectActive ? null : selectedObject, // Disabilita se multi
    animationConfig,
    isAnimationPlaying && !isMultiObjectActive, // Play solo se non multi
    onAnimationComplete
  )
  
  // Hook multi-object generico
  useMultiObjectAnimationPreview(
    isMultiObjectActive ? filledSlots.map(s => s.object) : [], // Solo se multi
    animationConfig,
    isAnimationPlaying && isMultiObjectActive, // Play solo se multi
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
      {animationConfig?.mode === 'rotation' && (
        (selectedObject && !multiObjectMode) || (multiObjectMode && objectsLocked)
      ) && (
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
      
      {/* Helper per posizione - mostra il percorso (SOLO in modalità singolo oggetto O multi-object locked) */}
      {animationConfig?.mode === 'position' && (
        (selectedObject && !multiObjectMode) || (multiObjectMode && objectsLocked)
      ) && (
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
      
      {/* 🔴 MARKER VISIVO - Mostra dove hai CLICCATO (non dove andrà il pivot) */}
      {animationConfig?.mode === 'position' && visualMarkerPosition && (
        <group>
          {/* Sfera rossa dove l'utente ha cliccato */}
          <mesh position={[visualMarkerPosition.x, visualMarkerPosition.y, visualMarkerPosition.z]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color="red" 
              emissive="red"
              emissiveIntensity={2}
              transparent 
              opacity={0.9}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          
          {/* Cilindro verticale per indicatore */}
          <mesh 
            position={[visualMarkerPosition.x, visualMarkerPosition.y + 0.5, visualMarkerPosition.z]}
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