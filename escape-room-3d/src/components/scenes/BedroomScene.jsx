import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, Html, useProgress } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { multiRaycast } from '../../utils/multiRaycast'
import CasaModel from '../3D/CasaModel'
import { PuzzleLED } from '../3D/PuzzleLED'
import { useBedroomPuzzle } from '../../hooks/useBedroomPuzzle'
import { useGameCompletion } from '../../hooks/useGameCompletion'
import useWebSocket from '../../hooks/useWebSocket'
import HotAirEffectLive from '../3D/HotAirEffectLive'
import HeatHazeEffect from '../effects/HeatHazeEffect'
import ParticleEditor from '../UI/ParticleEditor'
import ParticleTargetPicker from '../3D/ParticleTargetPicker'
import useParticleEditor from '../../hooks/useParticleEditor'
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
import PositionPathVisualizer from '../3D/PositionPathVisualizer'
import { useAnimationPreview } from '../../hooks/useAnimationPreview'
import { useMultiObjectAnimationPreview } from '../../hooks/useMultiObjectAnimationPreview'
import { useComodinoAnimation } from '../../hooks/useComodinoAnimation'
import { useMaterassoAnimation } from '../../hooks/useMaterassoAnimation'
import { getMovableNode } from '../../utils/movableNodeHelper'
import CollisionDebugOverlay from '../UI/CollisionDebugOverlay'
import ComodinoTargetMarker from '../3D/ComodinoTargetMarker'

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
          Caricamento camera da letto...
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

function FPSController({ modelRef, mobileInput, onLookAtChange, groundPlaneMesh, isMobile = false, boundaryLimits, initialPosition, initialYaw = 0, eyeHeight = 1.6, modelScale = 1, positionCaptureRef, enabled = true, ventolaHitboxRef }) {
  const { camera } = useThree()
  const [collisionObjects, setCollisionObjects] = useState([])
  const [groundObjects, setGroundObjects] = useState([])
  const [interactiveObjects, setInteractiveObjects] = useState([])
  const lastTargetRef = useRef(null)
  const lastHitTimeRef = useRef(0)  // ⭐ STICKY TARGETING
  const timeSinceLastRaycastRef = useRef(0)
  const RAYCAST_INTERVAL = isMobile ? 0.1 : 0
  const STICKY_TIME = 0.25  // ⭐ 250ms persistenza target
  
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
      console.log('[BedroomScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL');
      
      let cols = modelRef.forcedCollidables || [];
      let grnds = modelRef.forcedGrounds || [];
      const interactives = [];

      // Aggiungi ground plane artificiale se c'è
      if (groundPlaneMesh) {
        grnds = [...grnds, groundPlaneMesh];
        groundPlaneMesh.userData.ground = true;
      }

      // 🎯 STEP 4: Ricerca ESPLICITA di TUTTI gli oggetti interattivi nel modello
      // CRITICAL: Molti oggetti NON sono nelle collidables, quindi serve ricerca globale!
      if (modelRef && modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child.isMesh && child.name) {
            const name = child.name.toLowerCase()
            
            // 🚫 BLACKLIST: Oggetti NON cliccabili
            if (name.includes('15c95788-9be1-47fc-8da1-6eab09e37661') ||  // MURO_LETTO
                name.includes('4ab866eb-b6bf-4f8c-ac8e-29193cb6b156') ||  // VETRO_GRANDE_SERRA
                name.includes('65a21db2-50e6-4962-88e5-cf692da592b1') ||  // MURO_CON_SERVO_LETTO
                name.includes('3ec149f1-35e6-4a43-aac7-3af8e8ba76d6')) {  // piano_casa
              return; // SKIP - Non aggiungere agli interattivi
            }
            
            // ✅ WHITELIST: Oggetti cliccabili (UUID specifici)
            const uuids = [
              '403e9b77-5c62-4454-a917-50cad8c77fc4',  // Poltrona/Humano
              '04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea',  // Griglia ventola
              'aef53e75-6065-4383-9c2a-ab787bae1516',  // LED ventola
              'b1e6a326-9fef-48e1-9368-60bc0465b81d',  // Vetro porta finestra
              '592f5061-beac-4db8-996c-4f71102704dd',  // Lampada
              'ea4bde19-a636-4dd9-b32e-c34ba0d37b14',  // Materasso
              'e1b6ef4b-4b5a-442e-ab58-ee0c2a044b3c'   // Body1 ventola
            ]
            
            const isInteractive = uuids.some(uuid => name.includes(uuid))
            
            if (isInteractive) {
              // ✅ Controlla se già presente (evita duplicati)
              const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
              
              if (!alreadyAdded) {
                console.log('[BedroomScene] ✅ Oggetto interattivo trovato:', child.name)
                interactives.push(child)
                child.userData.interactive = true
              }
            }
          }
        })
      }
      
      // 🌬️ STEP 6: Aggiungi hitbox ventola dall'esterno (se fornita)
      if (ventolaHitboxRef && ventolaHitboxRef.current) {
        interactives.push(ventolaHitboxRef.current)
        ventolaHitboxRef.current.userData.interactive = true
        console.log('[BedroomScene] ✅ HITBOX VENTOLA aggiunta agli interattivi')
      }

      setCollisionObjects(cols);
      setGroundObjects(grnds);
      setInteractiveObjects(interactives);
      
      console.log(`[BedroomScene] ✅ Configurazione: ${cols.length} collision, ${grnds.length} grounds, ${interactives.length} interattivi`);
      return;
    }
    
    // 🎯 STEP 3: Ricerca ESPLICITA per griglia ventola (oggetto piccolo non-collidable)
    // CRITICAL: La griglia ventola NON è nelle collidables, quindi serve ricerca dedicata!
    if (modelRef && modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.name) {
          const name = child.name.toLowerCase()
          
          // UUID griglia ventola: 04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA
          if (name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea')) {
            // ✅ Controlla se già presente (evita duplicati)
            const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
            
            if (!alreadyAdded) {
              console.log('[BedroomScene] ✅ GRIGLIA VENTOLA aggiunta esplicitamente agli interattivi:', child.name)
              interactives.push(child)
              child.userData.interactive = true
            }
          }
        }
      })
    }

    // === CASO 2: FALLBACK (Codice vecchio se CasaModel non manda liste) ===
    if (!modelRef || !modelRef.current) return;
    
    const collidables = []
    const grounds = []
    const interactives = []
    
    console.log('[BedroomScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)');
    
    // Usa i tag userData impostati da CasaModel
    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        // CasaModel ha già taggato ground e collidable objects
        if (child.userData.ground === true) {
          grounds.push(child)
        } else if (child.userData.collidable === true) {
          collidables.push(child)
        }
        
        // Interactive objects
        const name = child.name.toLowerCase()
        
        // 🚫 BLACKLIST: Oggetti NON cliccabili
        if (name.includes('15c95788-9be1-47fc-8da1-6eab09e37661') ||  // MURO_LETTO
            name.includes('4ab866eb-b6bf-4f8c-ac8e-29193cb6b156') ||  // VETRO_GRANDE_SERRA
            name.includes('65a21db2-50e6-4962-88e5-cf692da592b1') ||  // MURO_CON_SERVO_LETTO
            name.includes('3ec149f1-35e6-4a43-aac7-3af8e8ba76d6')) {  // piano_casa (interferisce con poltrona)
          // SKIP - Non aggiungere agli interattivi
        } else if (name.startsWith('test') || name.includes('letto') || name.includes('armadio') ||
            name.includes('ventola') || name.includes('griglia') || name.includes('porta_finestra')) {
          interactives.push(child)
          child.userData.interactive = true
        }
      }
    })
    
    // ✅ Aggiungi il piano programmatico come ground
    if (groundPlaneMesh) {
      grounds.push(groundPlaneMesh)
      groundPlaneMesh.userData.ground = true
    }
    
    console.log(`[BedroomScene] Ground objects (${grounds.length}):`, grounds.map(o => o.name))
    console.log(`[BedroomScene] Collidable objects (${collidables.length}):`, collidables.map(o => o.name))
    console.log(`[BedroomScene] Eye height:`, eyeHeight)
    
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
      
      const cameraY = camera.position.y
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
      
      console.log(`[BedroomScene] 📷 Camera Y: ${cameraY.toFixed(2)} | Distance from ground: ${minGroundDistance.toFixed(2)} | Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
    }
  })
  
  useFrame((_, delta) => {
    if (!onLookAtChange || interactiveObjects.length === 0) return
    
    if (RAYCAST_INTERVAL > 0) {
      timeSinceLastRaycastRef.current += delta
      if (timeSinceLastRaycastRef.current < RAYCAST_INTERVAL) return
      timeSinceLastRaycastRef.current = 0
    }
    
    // 🎯 MULTI-RAY RAYCASTING POTENZIATO (9 raggi + spread aumentato)
    const hit = multiRaycast(camera, interactiveObjects, {
      rayCount: 25,         // 🎯 GRIGLIA 5x5 per oggetti incassati (ventola nel muro!)
      spreadAngle: 8.0,     // 🌟 8° di dispersione per area ENORME
      excludeNames: ['MURO_CON_SERVO_LETTO', 'MURO_LETTO'], // 🚫 Raggi attraversano il muro!
      maxDistance: 9,       // 9 metri
      recursive: true,
      debug: false          // Metti true per vedere log dettagliati
    })
    
    if (hit) {
      const targetName = hit.object.name
      if (lastTargetRef.current !== targetName) {
        lastTargetRef.current = targetName
        lastHitTimeRef.current = performance.now()  // ⭐ AGGIORNA timestamp
        onLookAtChange(targetName, targetName)
        
        console.log(`[BedroomScene] 🎯 Multi-Ray HIT: "${targetName}" a ${hit.distance.toFixed(2)}m`)
      }
    } else {
      // ⭐ STICKY TARGETING - mantieni target per STICKY_TIME
      const elapsed = (performance.now() - lastHitTimeRef.current) / 1000
      
      if (elapsed > STICKY_TIME && lastTargetRef.current !== null) {
        lastTargetRef.current = null
        onLookAtChange(null, null)
      }
      // Se elapsed < STICKY_TIME, NON fare nulla (mantieni target attivo!)
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
    enabled // ⭐ NUOVO: pass enabled flag
  )
  
  return null
}

// 🪟 Componente per proximity trigger della porta finestra (camera)
function WindowProximityTrigger({ windowPosition, triggerRadius, poltronaCompletata, ventolaCompletata, onTrigger }) {
  const { camera } = useThree()
  const hasTriggeredRef = useRef(false)
  const logCounterRef = useRef(0)
  
  useFrame(() => {
    // ✅ PREREQUISITI: Solo se poltrona completata e ventola NON completata
    if (!poltronaCompletata || ventolaCompletata) {
      hasTriggeredRef.current = false // Reset quando non soddisfa prerequisiti
      return
    }
    
    // 🎯 Usa WORLD coordinates per la posizione del player
    const playerWorldPos = new THREE.Vector3()
    camera.getWorldPosition(playerWorldPos)
    const distance = playerWorldPos.distanceTo(windowPosition)
    
    // 🔍 DEBUG: Log ogni 60 frame (circa 1 secondo a 60fps)
    logCounterRef.current++
    if (logCounterRef.current >= 60) {
      console.log('[WindowProximityTrigger] 🔍 DEBUG:', {
        playerPos: { x: playerWorldPos.x.toFixed(2), y: playerWorldPos.y.toFixed(2), z: playerWorldPos.z.toFixed(2) },
        windowPos: { x: windowPosition.x.toFixed(2), y: windowPosition.y.toFixed(2), z: windowPosition.z.toFixed(2) },
        distance: distance.toFixed(2) + 'm',
        triggerRadius: triggerRadius + 'm',
        isWithinRange: distance < triggerRadius,
        hasTriggered: hasTriggeredRef.current
      })
      logCounterRef.current = 0
    }
    
    // Se dentro il raggio E non ha ancora triggerato
    if (distance < triggerRadius && !hasTriggeredRef.current) {
      console.log('[WindowProximityTrigger] 🪟 Player vicino alla finestra (distanza:', distance.toFixed(2), 'm) - Trigger popup!')
      hasTriggeredRef.current = true // Evita trigger multipli
      onTrigger()
    }
    
    // Reset se si allontana troppo (per permettere re-trigger se necessario)
    if (distance > triggerRadius * 1.2) {
      if (hasTriggeredRef.current) {
        console.log('[WindowProximityTrigger] ↩️ Player si è allontanato - reset trigger (distanza:', distance.toFixed(2), 'm)')
      }
      hasTriggeredRef.current = false
    }
  })
  
  return null // Componente invisibile
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

// 🎨 Componente che legge posizione REALE del comodino e mostra percorso dinamico
function DynamicComodinoPathVisualizer({ modelRef, sequenceData }) {
  const [dynamicConfig, setDynamicConfig] = useState(null)
  
  useFrame(() => {
    if (!modelRef?.current || !sequenceData) return
    
    // Trova gli oggetti comodino (o il pivot se esiste)
    let currentPosition = null
    
    // Cerca prima il pivot (se esiste dalla rotazione)
    let pivotFound = false
    modelRef.current.traverse((node) => {
      if (node.name === 'PIVOT_Comodino' && node.type === 'Group') {
        // Trovato il pivot! Usa la sua posizione
        currentPosition = node.position.clone()
        pivotFound = true
        console.log('[DynamicPathVisualizer] 📍 Pivot trovato:', [
          currentPosition.x.toFixed(3),
          currentPosition.y.toFixed(3),
          currentPosition.z.toFixed(3)
        ])
      }
    })
    
    // Se non c'è pivot, usa il primo oggetto comodino
    if (!pivotFound && sequenceData.objectIds) {
      modelRef.current.traverse((node) => {
        if (!currentPosition && sequenceData.objectIds.some(id => node.name.includes(id))) {
          const worldPos = new THREE.Vector3()
          node.getWorldPosition(worldPos)
          currentPosition = worldPos
          console.log('[DynamicPathVisualizer] 📍 Oggetto trovato:', node.name, [
            currentPosition.x.toFixed(3),
            currentPosition.y.toFixed(3),
            currentPosition.z.toFixed(3)
          ])
        }
      })
    }
    
    if (!currentPosition) return
    
    // Target dal JSON
    const positionPhase = sequenceData.sequence[1]
    
    // Crea config dinamica
    const newConfig = {
      mode: 'position',
      startX: currentPosition.x,
      startY: currentPosition.y,
      startZ: currentPosition.z,
      endX: positionPhase.endX,
      endY: positionPhase.endY,
      endZ: positionPhase.endZ
    }
    
    // Aggiorna solo se cambiato (evita re-render continui)
    setDynamicConfig(prev => {
      if (!prev || 
          Math.abs(prev.startX - newConfig.startX) > 0.001 ||
          Math.abs(prev.startY - newConfig.startY) > 0.001 ||
          Math.abs(prev.startZ - newConfig.startZ) > 0.001) {
        return newConfig
      }
      return prev
    })
  })
  
  if (!dynamicConfig) return null
  
  return <PositionPathVisualizer config={dynamicConfig} visible={true} />
}

export default function BedroomScene({ onObjectClick, onLookAtChange, mobileInput, isMobile = false, sessionId = 1 }) {
  const [modelRef, setModelRef] = useState({ current: null })
  const [groundPlaneRef, setGroundPlaneRef] = useState(null)
  const [boundaryLimits, setBoundaryLimits] = useState(null)
  const positionCaptureRef = useRef(null)
  const [captureReady, setCaptureReady] = useState(false)
  const [liveDebugInfo, setLiveDebugInfo] = useState(null)
  const [spawnData, setSpawnData] = useState(null)
  const [isLoadingSpawn, setIsLoadingSpawn] = useState(true)
  const [worldReady, setWorldReady] = useState(false)
  
  // DEBUG: Offset Y del modello (controllabile con tastiera)
  const [modelYOffset, setModelYOffset] = useState(2.0) // Default: 2.0m (scene interne)
  
  // DEBUG: EyeHeight (altezza occhi camera) controllabile in tempo reale
  const [eyeHeight, setEyeHeight] = useState(1.4) // Default: 1.4m (camera da letto)
  
  // Sistema di editing animazioni
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)
  const [animationConfig, setAnimationConfig] = useState(null)
  const [showEditorUI, setShowEditorUI] = useState(false)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [pickDestinationMode, setPickDestinationMode] = useState(false)
  
  // 🎯 Posizione VISIVA del marker (dove l'utente ha cliccato)
  const [visualMarkerPosition, setVisualMarkerPosition] = useState(null)
  
  // 🔄 Sistema Multi-Object
  const [multiObjectMode, setMultiObjectMode] = useState(false)
  const [slots, setSlots] = useState([])
  const [objectsLocked, setObjectsLocked] = useState(false)
  
  // 🚀 REF DIRETTO per oggetti comodino (bypassa timing issue)
  const comodinoPartsRef = useRef(null)
  
  // State per visibilità pannello debug
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  
  // 🎯 State per nascondere TUTTI i pannelli con tasto \
  const [hideAllPanels, setHideAllPanels] = useState(true)
  
  // 🚧 State per Collision Debug Overlay
  const [collisionDebugEnabled, setCollisionDebugEnabled] = useState(false)
  const [collisionData, setCollisionData] = useState(null)
  
  // 🎮 State per sequenza comodino (tasto K)
  const [comodinoSequencePhase, setComodinoSequencePhase] = useState(null) // null | 'rotation' | 'position'
  const [comodinoSequenceConfig, setComodinoSequenceConfig] = useState(null)
  const [comodinoSequenceData, setComodinoSequenceData] = useState(null)
  
  // 🛏️ State per sequenza materasso (tasto M)
  const [materassoSequencePhase, setMaterassoSequencePhase] = useState(null)
  const [materassoSequenceConfig, setMaterassoSequenceConfig] = useState(null)
  const [materassoSequenceData, setMaterassoSequenceData] = useState(null)
  
  // 🎨 State per visualizzazione percorso (tasto V)
  const [showPathVisualizer, setShowPathVisualizer] = useState(true)
  
  // 📚 State per toggle BookCase/Humano (tasto L)
  const [bookcaseVisible, setBookcaseVisible] = useState(false)
  
  // 💡 State per lampada (tasto L)
  const [lampadaAccesa, setLampadaAccesa] = useState(false)
  
  // 🚪 State per porta-finestra (tasto J)
  const [portaFinestraOpen, setPortaFinestraOpen] = useState(true) // Inizia APERTA (30°)
  
  // 🎯 MESSAGGI ENIGMI - Pattern Styled (no alert)
  // ENIGMA 1 - LETTO/COMODINO (K + M)
  const [messaggioInizialeLetto, setMessaggioInizialeLetto] = useState(false)
  const [messaggioObiettivoLetto, setMessaggioObiettivoLetto] = useState(false)
  const [messaggioCompletamentoLetto, setMessaggioCompletamentoLetto] = useState(false)
  const [messaggioBloccoLetto, setMessaggioBloccoLetto] = useState(false)
  
  // ENIGMA 2 - POLTRONA (L)
  const [messaggioInizialePoltrona, setMessaggioInizialePoltrona] = useState(false)
  const [messaggioObiettivoPoltrona, setMessaggioObiettivoPoltrona] = useState(false)
  const [messaggioCompletamentoPoltrona, setMessaggioCompletamentoPoltrona] = useState(false)
  const [messaggioBloccoPoltrona, setMessaggioBloccoPoltrona] = useState(false)
  
  // ENIGMA 3 - VENTOLA/FINESTRA (J)
  const [messaggioInizialeVentola, setMessaggioInizialeVentola] = useState(false)
  const [messaggioObiettivoVentola, setMessaggioObiettivoVentola] = useState(false)
  const [messaggioCompletamentoVentola, setMessaggioCompletamentoVentola] = useState(false)
  const [messaggioBloccoVentola, setMessaggioBloccoVentola] = useState(false)
  const [messaggioConfermaFinestra, setMessaggioConfermaFinestra] = useState(false) // Nuovo: conferma chiusura
  const [messaggioConfermaPoltronaAccomodati, setMessaggioConfermaPoltronaAccomodati] = useState(false) // Nuovo: conferma poltrona
  
  // 🚪 State per porta letto (tasti O/I)
  const [portaLettoAperta, setPortaLettoAperta] = useState(false) // Inizia CHIUSA
  
  // 🌡️ State per effetto aria calda (tasto J - sincronizzato con porta)
  const [hotAirActive, setHotAirActive] = useState(false)
  
  // 🎮 State per bloccare controlli FPS durante messaggi interattivi
  const [controlsEnabled, setControlsEnabled] = useState(true)
  
  // 🔍 State per debug visivo hitbox griglia ventola (tasto F)
  const [showGrigliaHitbox, setShowGrigliaHitbox] = useState(false)
  
  // 🌬️ Ref per hitbox ventola (integrata in multi-ray)
  const ventolaHitboxRef = useRef()
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGIO - Enigma 3 (porta finestra)
  const [enigma3RepeatStarted, setEnigma3RepeatStarted] = useState(false)
  const enigma3RepeatIntervalRef = useRef(null)
  
  // 🎨 Particle Editor System (tasto X)
  const particleEditor = useParticleEditor()
  
  // 🎮 WebSocket e Bedroom Puzzle System
  const { socket } = useWebSocket(sessionId, 'camera', 'DevPlayer')
  const bedroomPuzzle = useBedroomPuzzle(sessionId, socket)

  // 🔄 LISTENER WebSocket per sincronizzazione player-to-player
  useEffect(() => {
    if (!socket) return

    const handleAnimationSync = (data) => {
      // Filtra solo eventi per questa room
      if (data.room !== 'camera') return

      console.log('[BedroomScene] 🔄 Ricevuto sync da altro player:', data)

      // COMODINO - Sequenza K
      if (data.objectName === 'comodino') {
        if (data.animationState === 'rotation') {
          // Avvia fase rotation
          if (comodinoSequenceData && !comodinoSequencePhase) {
            const rotationPhase = comodinoSequenceData.sequence[0]
            setComodinoSequenceConfig(rotationPhase)
            setComodinoSequencePhase('rotation')
            console.log('[BedroomScene] 🔄 Sync: Avviata fase rotation comodino')
          }
        } else if (data.animationState === 'position') {
          // Avvia fase position
          if (comodinoSequenceData && comodinoSequencePhase === 'rotation') {
            const positionPhase = comodinoSequenceData.sequence[1]
            setComodinoSequenceConfig(positionPhase)
            setComodinoSequencePhase('position')
            console.log('[BedroomScene] 🔄 Sync: Avviata fase position comodino')
          }
        }
      }

      // MATERASSO - Tasto M
      if (data.objectName === 'materasso' && data.animationState === 'rotation') {
        if (materassoSequenceData && !materassoSequencePhase) {
          const rotationConfig = materassoSequenceData.sequence[0]
          setMaterassoSequenceConfig(rotationConfig)
          setMaterassoSequencePhase('rotation')
          console.log('[BedroomScene] 🔄 Sync: Avviata animazione materasso')
        }
      }

      // POLTRONA - Tasto L (BookCase + Lampada)
      if (data.objectName === 'poltrona') {
        if (data.animationState === 'bookcase_visible') {
          setBookcaseVisible(true)
          console.log('[BedroomScene] 🔄 Sync: BookCase VISIBILE')
        } else if (data.animationState === 'humano_visible') {
          setBookcaseVisible(false)
          console.log('[BedroomScene] 🔄 Sync: Humano VISIBILE')
        }
      }

      if (data.objectName === 'lampada') {
        setLampadaAccesa(data.animationState === 'on')
        console.log('[BedroomScene] 🔄 Sync: Lampada', data.animationState === 'on' ? 'ACCESA' : 'SPENTA')
      }

      // PORTA FINESTRA - Tasto J
      if (data.objectName === 'porta_finestra') {
        setPortaFinestraOpen(data.animationState === 'open')
        console.log('[BedroomScene] 🔄 Sync: Porta-Finestra', data.animationState === 'open' ? 'APERTA' : 'CHIUSA')
      }

      // ARIA CALDA - Sincronizzata con porta
      if (data.objectName === 'aria_calda') {
        setHotAirActive(data.animationState === 'active')
        console.log('[BedroomScene] 🔄 Sync: Aria Calda', data.animationState === 'active' ? 'ATTIVA' : 'INATTIVA')
      }

      // PORTA LETTO - Tasti O/I
      if (data.objectName === 'porta_letto') {
        setPortaLettoAperta(data.animationState === 'open')
        console.log('[BedroomScene] 🔄 Sync: Porta Letto', data.animationState === 'open' ? 'APERTA' : 'CHIUSA')
      }
    }

    socket.on('animationStateChanged', handleAnimationSync)
    return () => socket.off('animationStateChanged', handleAnimationSync)
  }, [socket, comodinoSequenceData, comodinoSequencePhase, materassoSequenceData, materassoSequencePhase])
  
  // 🔄 SYNC MESSAGGI COMPLETAMENTO - Monitora cambi stato puzzle e mostra messaggi
  // Enigma Letto (comodino + materasso)
  useEffect(() => {
    const comodinoCompleted = bedroomPuzzle.puzzleStates?.comodino === 'completed' || bedroomPuzzle.puzzleStates?.comodino === 'done'
    const materassoCompleted = bedroomPuzzle.puzzleStates?.materasso === 'completed' || bedroomPuzzle.puzzleStates?.materasso === 'done'
    
    if (comodinoCompleted && materassoCompleted && !messaggioCompletamentoLetto) {
      console.log('[BedroomScene] 📥 SYNC: Letto completato da altro player - Mostro messaggio!')
      setMessaggioObiettivoLetto(false)
      setMessaggioCompletamentoLetto(true)
      setTimeout(() => setMessaggioCompletamentoLetto(false), 3000)
    }
  }, [bedroomPuzzle.puzzleStates?.comodino, bedroomPuzzle.puzzleStates?.materasso])
  
  // Enigma Poltrona
  useEffect(() => {
    const poltronaCompleted = bedroomPuzzle.puzzleStates?.poltrona === 'completed' || bedroomPuzzle.puzzleStates?.poltrona === 'done'
    
    if (poltronaCompleted && !messaggioCompletamentoPoltrona) {
      console.log('[BedroomScene] 📥 SYNC: Poltrona completata da altro player - Mostro messaggio!')
      setMessaggioObiettivoPoltrona(false)
      setMessaggioCompletamentoPoltrona(true)
      setTimeout(() => setMessaggioCompletamentoPoltrona(false), 3000)
    }
  }, [bedroomPuzzle.puzzleStates?.poltrona])
  
  // Enigma Ventola
  useEffect(() => {
    const ventolaCompleted = bedroomPuzzle.puzzleStates?.ventola === 'completed' || bedroomPuzzle.puzzleStates?.ventola === 'done'
    
    if (ventolaCompleted && !messaggioCompletamentoVentola) {
      console.log('[BedroomScene] 📥 SYNC: Ventola completata da altro player - Mostro messaggio!')
      setMessaggioObiettivoVentola(false)
      setMessaggioCompletamentoVentola(true)
      setTimeout(() => setMessaggioCompletamentoVentola(false), 3000)
    }
  }, [bedroomPuzzle.puzzleStates?.ventola])
  
  // 🔄 LISTENER WebSocket per sincronizzazione player-to-player
  useEffect(() => {
    if (!socket) return
    
    const handleAnimationSync = (data) => {
      // Filtra solo eventi per questa room
      if (data.room !== 'camera') return
      
      console.log('[BedroomScene] 🔄 Ricevuto sync da altro player:', data)
      
      // COMODINO - Sequenza K
      if (data.objectName === 'comodino') {
        if (data.animationState === 'rotation') {
          // Avvia fase rotation
          if (comodinoSequenceData && !comodinoSequencePhase) {
            const rotationPhase = comodinoSequenceData.sequence[0]
            setComodinoSequenceConfig(rotationPhase)
            setComodinoSequencePhase('rotation')
            console.log('[BedroomScene] 🔄 Sync: Avviata fase rotation comodino')
          }
        } else if (data.animationState === 'position') {
          // Avvia fase position
          if (comodinoSequenceData && comodinoSequencePhase === 'rotation') {
            const positionPhase = comodinoSequenceData.sequence[1]
            setComodinoSequenceConfig(positionPhase)
            setComodinoSequencePhase('position')
            console.log('[BedroomScene] 🔄 Sync: Avviata fase position comodino')
          }
        }
      }
      
      // MATERASSO - Tasto M
      if (data.objectName === 'materasso' && data.animationState === 'rotation') {
        if (materassoSequenceData && !materassoSequencePhase) {
          const rotationConfig = materassoSequenceData.sequence[0]
          setMaterassoSequenceConfig(rotationConfig)
          setMaterassoSequencePhase('rotation')
          console.log('[BedroomScene] 🔄 Sync: Avviata animazione materasso')
        }
      }
      
      // POLTRONA - Tasto L (BookCase + Lampada)
      if (data.objectName === 'poltrona') {
        if (data.animationState === 'bookcase_visible') {
          setBookcaseVisible(true)
          console.log('[BedroomScene] 🔄 Sync: BookCase VISIBILE')
        } else if (data.animationState === 'humano_visible') {
          setBookcaseVisible(false)
          console.log('[BedroomScene] 🔄 Sync: Humano VISIBILE')
        }
      }
      
      if (data.objectName === 'lampada') {
        setLampadaAccesa(data.animationState === 'on')
        console.log('[BedroomScene] 🔄 Sync: Lampada', data.animationState === 'on' ? 'ACCESA' : 'SPENTA')
      }
      
      // PORTA FINESTRA - Tasto J
      if (data.objectName === 'porta_finestra') {
        setPortaFinestraOpen(data.animationState === 'open')
        console.log('[BedroomScene] 🔄 Sync: Porta-Finestra', data.animationState === 'open' ? 'APERTA' : 'CHIUSA')
      }
      
      // ARIA CALDA - Sincronizzata con porta
      if (data.objectName === 'aria_calda') {
        setHotAirActive(data.animationState === 'active')
        console.log('[BedroomScene] 🔄 Sync: Aria Calda', data.animationState === 'active' ? 'ATTIVA' : 'INATTIVA')
      }
      
      // PORTA LETTO - Tasti O/I
      if (data.objectName === 'porta_letto') {
        setPortaLettoAperta(data.animationState === 'open')
        console.log('[BedroomScene] 🔄 Sync: Porta Letto', data.animationState === 'open' ? 'APERTA' : 'CHIUSA')
      }
    }
    
    socket.on('animationStateChanged', handleAnimationSync)
    return () => socket.off('animationStateChanged', handleAnimationSync)
  }, [socket, comodinoSequenceData, comodinoSequencePhase, materassoSequenceData, materassoSequencePhase])
  
  // 🏆 Game Completion System (gestisce LED porte globali)
  const gameCompletion = useGameCompletion(sessionId, socket)
  
  // 🔄 AUTO-RESET al caricamento scena
  useEffect(() => {
    if (bedroomPuzzle.resetPuzzles) {
      console.log('[BedroomScene] 🔄 Auto-reset al mount')
      bedroomPuzzle.resetPuzzles('full')
      // Reset anche stati locali
      setLampadaAccesa(false)
      setBookcaseVisible(false)
      setPortaFinestraOpen(true)
      setHotAirActive(false)
    }
  }, []) // Solo al mount
  
  // 🔄 Sincronizza lampada locale con stato puzzle (reset)
  useEffect(() => {
    // Quando materasso torna a locked dopo reset, spegni lampada
    if (bedroomPuzzle.puzzleStates?.materasso === 'locked') {
      console.log('[BedroomScene] 🔄 Reset rilevato - spegni lampada locale')
      setLampadaAccesa(false)
    }
  }, [bedroomPuzzle.puzzleStates?.materasso])
  
  // 🛏️ TRIGGER AUTOMATICO ENIGMA 1 (LETTO) - All'ingresso nella camera
  useEffect(() => {
    // Controlla se letto già completato (evita re-trigger)
    const comodinoCompleted = bedroomPuzzle.puzzleStates?.comodino === 'completed' || bedroomPuzzle.puzzleStates?.comodino === 'done'
    const materassoCompleted = bedroomPuzzle.puzzleStates?.materasso === 'completed' || bedroomPuzzle.puzzleStates?.materasso === 'done'
    
    if (comodinoCompleted && materassoCompleted) {
      return // ✅ Già completato, non mostrare messaggi
    }
    
    // Delay di 2 secondi dall'ingresso
    const timer = setTimeout(() => {
      console.log('[BedroomScene] 🛏️ TRIGGER AUTOMATICO - Avvio sequenza ENIGMA 1 (LETTO)...')
      
      // Messaggio iniziale (3s)
      setMessaggioInizialeLetto(true)
      setTimeout(() => {
        setMessaggioInizialeLetto(false)
        
        // Obiettivo (5s, poi sparisce)
        setMessaggioObiettivoLetto(true)
        setTimeout(() => {
          setMessaggioObiettivoLetto(false)
        }, 5000)
      }, 3000)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, []) // Solo al mount
  
  // 🪑 TRIGGER AUTOMATICO POLTRONA - Dopo completamento letto (comodino + materasso)
  useEffect(() => {
    // Controlla se poltrona già completata (evita re-trigger)
    const poltronaCompleted = bedroomPuzzle.puzzleStates?.poltrona === 'completed' || bedroomPuzzle.puzzleStates?.poltrona === 'done'
    
    if (poltronaCompleted) {
      return // ✅ Già completata, non fare nulla
    }
    
    // Controlla se ENTRAMBI comodino E materasso sono completati
    const comodinoCompleted = bedroomPuzzle.puzzleStates?.comodino === 'completed' || bedroomPuzzle.puzzleStates?.comodino === 'done'
    const materassoCompleted = bedroomPuzzle.puzzleStates?.materasso === 'completed' || bedroomPuzzle.puzzleStates?.materasso === 'done'
    
    if (comodinoCompleted && materassoCompleted) {
      console.log('[BedroomScene] 🪑 TRIGGER AUTOMATICO - Letto completato! Avvio sequenza poltrona...')
      
      // Delay di 3 secondi per non sovrapporre messaggi completamento letto
      setTimeout(() => {
        // Messaggio iniziale (3s)
        setMessaggioInizialePoltrona(true)
        setTimeout(() => {
          setMessaggioInizialePoltrona(false)
          
          // Obiettivo (5s)
          setMessaggioObiettivoPoltrona(true)
          setTimeout(() => {
            setMessaggioObiettivoPoltrona(false)
            
            // Popup conferma (rimane finché utente non risponde)
            setMessaggioConfermaPoltronaAccomodati(true)
            console.log('[BedroomScene] 🪑 Popup conferma poltrona mostrato')
          }, 5000)
        }, 3000)
      }, 3000)
    }
  }, [bedroomPuzzle.puzzleStates?.comodino, bedroomPuzzle.puzzleStates?.materasso, bedroomPuzzle.puzzleStates?.poltrona])
  
  // 🌬️ TRIGGER AUTOMATICO ENIGMA 3 (VENTOLA) - Dopo completamento poltrona
  useEffect(() => {
    // Controlla se ventola già completata (evita re-trigger)
    const ventolaCompleted = bedroomPuzzle.puzzleStates?.ventola === 'completed' || bedroomPuzzle.puzzleStates?.ventola === 'done'
    
    if (ventolaCompleted) {
      return // ✅ Già completata, non mostrare messaggi
    }
    
    // Controlla se poltrona è completata
    const poltronaCompleted = bedroomPuzzle.puzzleStates?.poltrona === 'completed' || bedroomPuzzle.puzzleStates?.poltrona === 'done'
    
    if (poltronaCompleted) {
      console.log('[BedroomScene] 🌬️ TRIGGER AUTOMATICO - Poltrona completata! Avvio sequenza ENIGMA 3 (VENTOLA)...')
      
      // Delay di 3 secondi per non sovrapporre messaggi completamento poltrona
      setTimeout(() => {
        // Messaggio iniziale (3s)
        setMessaggioInizialeVentola(true)
        setTimeout(() => {
          setMessaggioInizialeVentola(false)
          
          // Obiettivo - si ripeterà ogni 15s con il sistema di ripetizione
          setMessaggioObiettivoVentola(true)
          setTimeout(() => {
            setMessaggioObiettivoVentola(false)
          }, 5000)
        }, 3000)
      }, 3000)
    }
  }, [bedroomPuzzle.puzzleStates?.poltrona, bedroomPuzzle.puzzleStates?.ventola])
  
  // 🔄 SISTEMA RIPETIZIONE - Enigma 3 (porta finestra)
  useEffect(() => {
    const ventolaCompleted = bedroomPuzzle.puzzleStates?.ventola === 'completed' || bedroomPuzzle.puzzleStates?.ventola === 'done'
    
    if (messaggioObiettivoVentola && !enigma3RepeatStarted && !ventolaCompleted) {
      console.log('[BedroomScene] 🔄 Avvio ripetizione messaggio porta finestra (ogni 15s)')
      setEnigma3RepeatStarted(true)
      
      enigma3RepeatIntervalRef.current = setInterval(() => {
        console.log('[BedroomScene] 🔄 Ripeto messaggio obiettivo porta finestra')
        setMessaggioObiettivoVentola(true)
        setTimeout(() => setMessaggioObiettivoVentola(false), 5000)
      }, 15000)
    }
    
    return () => {
      if (enigma3RepeatIntervalRef.current) {
        clearInterval(enigma3RepeatIntervalRef.current)
        enigma3RepeatIntervalRef.current = null
      }
    }
  }, [messaggioObiettivoVentola, enigma3RepeatStarted, bedroomPuzzle.puzzleStates?.ventola])
  
  // 🛑 Stop ripetizione Enigma 3 quando appare il messaggio di conferma o enigma completato
  useEffect(() => {
    const ventolaCompleted = bedroomPuzzle.puzzleStates?.ventola === 'completed' || bedroomPuzzle.puzzleStates?.ventola === 'done'
    
    if ((messaggioConfermaFinestra || ventolaCompleted) && enigma3RepeatIntervalRef.current) {
      console.log('[BedroomScene] 🛑 Stop ripetizione messaggio porta finestra')
      clearInterval(enigma3RepeatIntervalRef.current)
      enigma3RepeatIntervalRef.current = null
      setMessaggioObiettivoVentola(false)
    }
  }, [messaggioConfermaFinestra, bedroomPuzzle.puzzleStates?.ventola])
  
  // 🎮 Gestione cursore e controlli FPS durante messaggi interattivi
  useEffect(() => {
    if (messaggioConfermaFinestra || messaggioConfermaPoltronaAccomodati) {
      // Messaggio attivo: mostra cursore e blocca controlli
      
      // 🔓 FORZA rilascio Pointer Lock (se attivo)
      if (document.pointerLockElement) {
        document.exitPointerLock()
        console.log('[BedroomScene] 🔓 Pointer Lock rilasciato')
      }
      
      // Mostra cursore ovunque
      document.body.style.cursor = 'default'
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.cursor = 'default'
      }
      
      // Blocca controlli FPS
      setControlsEnabled(false)
      console.log('[BedroomScene] 🖱️ Cursore mostrato, controlli FPS bloccati')
    } else {
      // ✅ FIX: Rimuovi forzatura cursor: 'none'
      // Lascia che il browser gestisca naturalmente il cursore:
      // - Pointer Lock attivo → cursore nascosto automaticamente
      // - Pointer Lock rilasciato (ESC) → cursore visibile automaticamente
      setControlsEnabled(true)
      console.log('[BedroomScene] 🖱️ Controlli FPS attivi')
    }
    
    // Cleanup: ripristina cursore al unmount
    return () => {
      document.body.style.cursor = 'default'
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.cursor = 'default'
      }
    }
  }, [messaggioConfermaFinestra, messaggioConfermaPoltronaAccomodati])
  
  
  // 🚪 FUNZIONE per chiudere porta-finestra (chiamata da SÌ o tasto J)
  const handleConfirmaChiusuraPorta = () => {
    console.log('[BedroomScene] ✅ Confermato! Chiudo porta-finestra')
    
    // Nascondi messaggio conferma
    setMessaggioConfermaFinestra(false)
    
    // AZIONE 1: CHIUDI porta-finestra
    setPortaFinestraOpen(false)
    console.log('[BedroomScene] 🚪 Porta-Finestra: CHIUSA')
    
    // AZIONE 2: ATTIVA aria calda (SYNC con porta)
    setHotAirActive(true)
    console.log('[BedroomScene] 🌡️ Aria Calda: ATTIVA')
    
    // AZIONE 3: Completa ventola puzzle
    bedroomPuzzle.completeVentola()
    
    // 🎯 MESSAGGIO: Nascondi obiettivo e mostra completamento
    setMessaggioObiettivoVentola(false)
    setMessaggioCompletamentoVentola(true)
    setTimeout(() => setMessaggioCompletamentoVentola(false), 3000)
  }
  
  // 🪑 FUNZIONE per confermare poltrona (chiamata da SÌ nel popup)
  const handleConfermaPoltronaAccomodati = () => {
    console.log('[BedroomScene] ✅ Confermato! Faccio accomodare il ragazzo')
    
    // Nascondi messaggio conferma
    setMessaggioConfermaPoltronaAccomodati(false)
    
    // SIMULA TASTO L:
    // AZIONE 1: Toggle BookCase/Humano
    setBookcaseVisible(prev => {
      const newState = !prev
      console.log('[BedroomScene] 📚 BookCase/Humano:', newState ? 'BookCase VISIBILE' : 'Humano VISIBILE')
      return newState
    })
    
    // AZIONE 2: Accendi lampada
    setLampadaAccesa(prev => {
      const newState = !prev
      console.log('[BedroomScene] 💡 Lampada:', newState ? 'ACCESA' : 'SPENTA')
      return newState
    })
    
    // AZIONE 3: Completa poltrona puzzle
    bedroomPuzzle.completePoltrona()
    
    // 🎯 MESSAGGIO: Nascondi obiettivo e mostra completamento
    setMessaggioObiettivoPoltrona(false)
    setMessaggioCompletamentoPoltrona(true)
    setTimeout(() => setMessaggioCompletamentoPoltrona(false), 3000)
  }
  
  // 🎨 Handler per click su oggetti (integrazione Particle Editor)
  const handleObjectClickInternal = (clickedMeshOrName) => {
    console.log('[BedroomScene] 🖱️ handleObjectClickInternal chiamato!')
    console.log('[BedroomScene] 🖱️ selectingMode:', particleEditor.selectingMode)
    console.log('[BedroomScene] 🖱️ clickedMeshOrName tipo:', typeof clickedMeshOrName)
    console.log('[BedroomScene] 🖱️ clickedMeshOrName valore:', clickedMeshOrName)
    
    // 🔍 DEBUG: Log del nome completo e lowercase per debug UUID
    if (clickedMeshOrName) {
      const rawName = typeof clickedMeshOrName === 'string' ? clickedMeshOrName : clickedMeshOrName.name
      console.log('[BedroomScene] 🔍 Nome COMPLETO:', rawName)
      console.log('[BedroomScene] 🔍 Nome LOWERCASE:', rawName?.toLowerCase())
    }
    
    // PRIORITÀ 1: Particle Editor (se in modalità selezione) - serve l'oggetto mesh
    if (particleEditor.selectingMode === 'source' && clickedMeshOrName && typeof clickedMeshOrName === 'object') {
      console.log('[BedroomScene] 🎯 Selezione sorgente:', clickedMeshOrName.name)
      particleEditor.handleObjectSelected(clickedMeshOrName)
      return
    }
    
    if (particleEditor.selectingMode === 'target' && clickedMeshOrName && typeof clickedMeshOrName === 'object') {
      // Per il target, calcoliamo la posizione del centro dell'oggetto
      const worldPos = new THREE.Vector3()
      clickedMeshOrName.getWorldPosition(worldPos)
      console.log('[BedroomScene] 🎯 Selezione target:', worldPos)
      particleEditor.handleTargetSelected(worldPos)
      return
    }
    
    // PRIORITÀ 2: Nessun click gestito per enigmi - TUTTO AUTOMATICO!
    // ❌ RIMOSSI:
    // - Click su materasso (ENIGMA 1) → ora automatico al mount
    // - Click su LED/griglia ventola (ENIGMA 3) → ora automatico dopo poltrona
    // - Click su vetro finestra (ENIGMA 3) → ora trigger di prossimità
    
    // PRIORITÀ 3: Handler originale (RoomScene - passa il NOME)
    if (onObjectClick) {
      const nameToPass = typeof clickedMeshOrName === 'string' 
        ? clickedMeshOrName 
        : (clickedMeshOrName?.name || 'unknown')
      
      // 🚫 BLACKLIST FINALE: Blocca click su oggetti interferenti
      const nameLower = nameToPass.toLowerCase()
      if (nameLower.includes('15c95788-9be1-47fc-8da1-6eab09e37661') ||  // MURO_LETTO
          nameLower.includes('4ab866eb-b6bf-4f8c-ac8e-29193cb6b156') ||  // VETRO_GRANDE_SERRA
          nameLower.includes('65a21db2-50e6-4962-88e5-cf692da592b1') ||  // MURO_CON_SERVO_LETTO
          nameLower.includes('3ec149f1-35e6-4a43-aac7-3af8e8ba76d6')) {  // piano_casa
        console.log('[BedroomScene] 🚫 Click bloccato su oggetto blacklist:', nameToPass)
        return // STOP - Non propagare il click
      }
      
      onObjectClick(nameToPass)
    }
  }
  
  // 🚪 Configurazione porta-finestra STABILE (simile a porta cucina)
  const portaFinestraConfig = useMemo(() => ({
    objectName: "VETRO_PORTA_FINESTRA_LETTO(B1E6A326-9FEF-48E1-9368-60BC0465B81D)",
    mode: "rotation",
    pivotX: 0.119,
    pivotY: 0.596,
    pivotZ: -2.852,
    axis: "z",
    angle: 30,  // Angolo di apertura
    speed: 45,
    direction: 1,
    handleUUIDs: [
      "B570A3EE-B02E-4660-B048-396C6099E228",
      "91ED1413-7981-462E-84D4-5F050F2C827C",
      "DB4CB829-55DD-4957-91B6-A4E12FE10FB1"  // TELAIO porta-finestra
    ]
  }), [])
  
  // 🚪 Configurazione porta letto STABILE (tasti O/I)
  const portaLettoConfig = useMemo(() => ({
    objectName: "PORTA_LETTO(3B88C05D-2BC1-4006-95F6-EC5B8E5C8AB5)",
    mode: "rotation",
    autoPivot: "left",
    axis: "z",
    angle: 90,
    speed: 45,
    direction: -1  // Invertito anche direction per aprire nella stessa direzione
  }), [])
  
  // 🎮 Caricamento configurazione comodino da JSON
  useEffect(() => {
    fetch('/comodino_sequence.json')
      .then(res => res.json())
      .then(data => {
        console.log('[BedroomScene] ✅ Configurazione comodino caricata:', data)
        setComodinoSequenceData(data)
      })
      .catch(err => {
        console.error('[BedroomScene] ❌ Errore caricamento comodino_sequence.json:', err)
      })
  }, [])
  
  // 🛏️ Caricamento configurazione materasso da JSON
  useEffect(() => {
    fetch('/materasso_sequence.json')
      .then(res => res.json())
      .then(data => {
        console.log('[BedroomScene] ✅ Configurazione materasso caricata:', data)
        setMaterassoSequenceData(data)
      })
      .catch(err => {
        console.error('[BedroomScene] ❌ Errore caricamento materasso_sequence.json:', err)
      })
  }, [])
  
  
  // 🎮 Handler completamento fase sequenza comodino
  const handleSequencePhaseComplete = (phase) => {
    console.log('[BedroomScene] ✅ Fase completata:', phase)
    
    if (phase === 'rotation' && comodinoSequenceData) {
      // Passa alla fase 2: POSITION
      console.log('[BedroomScene] 🔄 Avvio fase POSITION')
      const positionPhase = comodinoSequenceData.sequence[1]
      setTimeout(() => {
        setComodinoSequenceConfig(positionPhase)
        setComodinoSequencePhase('position')
        
        // 🔄 EMIT: Sincronizza passaggio a fase position
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'comodino',
            animationState: 'position',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Comodino position avviata')
        }
      }, 100) // Piccolo delay per evitare overlap
    } else if (phase === 'position') {
      // Sequenza completata!
      console.log('[BedroomScene] 🎉 SEQUENZA COMODINO COMPLETA!')
      setComodinoSequencePhase(null)
      setComodinoSequenceConfig(null)
      
      // 🎯 Chiama API per marcare comodino come completato
      bedroomPuzzle.completeComodino()
      
      // ⚠️ NOTA: Il messaggio "Ecco a te la magia!" appare SOLO dopo tasto M (materasso)
      // K (comodino) NON mostra messaggi, solo completa backend
    }
  }
  
  // 🛏️ Handler completamento animazione materasso
  const handleMaterassoComplete = () => {
    console.log('[BedroomScene] ✅ Animazione materasso COMPLETATA!')
    setMaterassoSequencePhase(null)
    setMaterassoSequenceConfig(null)
    
    // 🎯 NUOVO: Chiama API per completare materasso
    bedroomPuzzle.completeMaterasso()
    
    // 🎯 MESSAGGIO: Nascondi obiettivo e mostra completamento
    setMessaggioObiettivoLetto(false)
    setMessaggioCompletamentoLetto(true)
    setTimeout(() => setMessaggioCompletamentoLetto(false), 3000)
  }
  
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
    console.log('[BedroomScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn')
    setWorldReady(true)
  }, [])
  
  useEffect(() => {
    const load = async () => {
      try {
        const captured = await getCapturedPosition('camera')
        const data = captured ? { position: captured.position, yaw: captured.yaw } : null
        setSpawnData(data)
        setIsLoadingSpawn(false)  // ✅ FIX: Dopo setSpawnData per evitare race condition
      } catch (e) {
        console.error('[BedroomScene] Errore caricamento spawn:', e)
        setSpawnData(null)
        setIsLoadingSpawn(false)
      }
    }
    load()
  }, [])
  
  // === CONFIGURAZIONE FISICA AGGIORNATA ===
  const MODEL_SCALE = 1
  
  // ALTEZZA OCCHI: 1.6 per una prospettiva naturale
  const EYE_HEIGHT = 1.6 * MODEL_SCALE
  
  const COLLISION_RADIUS = 0.3 * MODEL_SCALE
  const PLAYER_HEIGHT = 1.8 * MODEL_SCALE // Il corpo resta alto per le collisioni
  const MOVE_SPEED = 1.35 * MODEL_SCALE  // Camminata normale (target: 1.35 u/s horizontal speed)
  
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
          console.log('[BedroomScene] 🎯 Tasto \\ - ' + (newState ? 'NASCONDO' : 'MOSTRO') + ' tutti i pannelli')
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
          console.log('[BedroomScene] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
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
        console.log('[BedroomScene] Pannello debug:', !showDebugPanel ? 'APERTO' : 'CHIUSO')
        return
      }
      
      // 🚧 Tasto C - Toggle Collision Debug Overlay
      if (key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        setCollisionDebugEnabled(prev => {
          const newState = !prev
          console.log('[BedroomScene] 🚧 Collision Debug:', newState ? 'ATTIVATO' : 'DISATTIVATO')
          return newState
        })
        return
      }
      
      // 🔍 Tasto F - Toggle Debug Visivo Hitbox Griglia Ventola
      if (key === 'f') {
        event.preventDefault()
        event.stopPropagation()
        setShowGrigliaHitbox(prev => {
          const newState = !prev
          console.log('[BedroomScene] 🔍 Tasto F - Debug Hitbox Griglia:', newState ? 'VISIBILE' : 'INVISIBILE')
          return newState
        })
        return
      }
      
      // 🎮 Tasto K - Avvia sequenza comodino
      if (key === 'k') {
        event.preventDefault()
        event.stopPropagation()
        
        if (!comodinoSequenceData) {
          console.error('[BedroomScene] ❌ Configurazione comodino non caricata!')
          return
        }
        
        if (comodinoSequencePhase) {
          console.log('[BedroomScene] ⚠️ Sequenza già in esecuzione, ignoro')
          return
        }
        
        console.log('[BedroomScene] 🎬 Tasto K - Avvio sequenza comodino')
        console.log('[BedroomScene] 📋 Sequenza:', comodinoSequenceData.sequence)
        
        // Avvia fase 1: ROTATION
        const rotationPhase = comodinoSequenceData.sequence[0]
        setComodinoSequenceConfig(rotationPhase)
        setComodinoSequencePhase('rotation')
        
        // 🔄 EMIT: Sincronizza con altri player
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'comodino',
            animationState: 'rotation',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Comodino rotation avviata')
        }
        
        return
      }
      
      // 🛏️ Tasto M - Avvia animazione materasso
      if (key === 'm') {
        event.preventDefault()
        event.stopPropagation()
        
        if (!materassoSequenceData) {
          console.error('[BedroomScene] ❌ Configurazione materasso non caricata!')
          return
        }
        
        if (materassoSequencePhase) {
          console.log('[BedroomScene] ⚠️ Animazione materasso già in esecuzione, ignoro')
          return
        }
        
        console.log('[BedroomScene] 🎬 Tasto M - Avvio animazione materasso')
        console.log('[BedroomScene] 📋 Config:', materassoSequenceData.sequence[0])
        
        // Avvia animazione (solo rotation, no fasi multiple)
        const rotationConfig = materassoSequenceData.sequence[0]
        setMaterassoSequenceConfig(rotationConfig)
        setMaterassoSequencePhase('rotation')
        
        // 🔄 EMIT: Sincronizza con altri player
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'materasso',
            animationState: 'rotation',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Materasso rotation avviata')
        }
        
        return
      }
      
      // 🎨 Tasto V - Toggle visualizzazione percorso
      if (key === 'v') {
        event.preventDefault()
        event.stopPropagation()
        setShowPathVisualizer(prev => {
          const newState = !prev
          console.log('[BedroomScene] 🎨 Visualizzatore percorso:', newState ? 'ATTIVO' : 'DISATTIVATO')
          return newState
        })
        return
      }
      
      // 📚 Tasto L - Toggle BookCase/Humano + Lampada + Poltrona Puzzle
      if (key === 'l') {
        event.preventDefault()
        event.stopPropagation()
        
        const newBookcaseState = !bookcaseVisible
        const newLampadaState = !lampadaAccesa
        
        setBookcaseVisible(newBookcaseState)
        console.log('[BedroomScene] 📚 Tasto L - Toggle BookCase/Humano:', newBookcaseState ? 'BookCase VISIBILE' : 'Humano VISIBILE')
        
        setLampadaAccesa(newLampadaState)
        console.log('[BedroomScene] 💡 Tasto L - Toggle Lampada:', newLampadaState ? 'ACCESA' : 'SPENTA')
        
        // 🔄 EMIT: Sincronizza BookCase/Humano
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'poltrona',
            animationState: newBookcaseState ? 'bookcase_visible' : 'humano_visible',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Poltrona/BookCase', newBookcaseState ? 'VISIBILE' : 'INVISIBILE')
        }
        
        // 🔄 EMIT: Sincronizza Lampada
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'lampada',
            animationState: newLampadaState ? 'on' : 'off',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Lampada', newLampadaState ? 'ACCESA' : 'SPENTA')
        }
        
        // 🎯 NUOVO: Completa poltrona puzzle
        bedroomPuzzle.completePoltrona()
        
        // 🎯 MESSAGGIO: Nascondi obiettivo e mostra completamento
        setMessaggioObiettivoPoltrona(false)
        setMessaggioCompletamentoPoltrona(true)
        setTimeout(() => setMessaggioCompletamentoPoltrona(false), 3000)
        
        return
      }
      
      // 🚪 Tasto J - EVENTO COMPOSITO: Toggle porta-finestra + aria calda + ventola puzzle
      // ⚠️ ORA ATTIVO SOLO SE IL MESSAGGIO DI CONFERMA È VISIBILE
      if (key === 'j') {
        event.preventDefault()
        event.stopPropagation()
        
        // ✅ Verifica se il messaggio di conferma è attivo
        if (!messaggioConfermaFinestra) {
          console.log('[BedroomScene] ⚠️ Tasto J ignorato - messaggio conferma non attivo')
          return
        }
        
        console.log('[BedroomScene] ✅ Tasto J - Confermato! Chiudo porta-finestra')
        
        // Nascondi messaggio conferma
        setMessaggioConfermaFinestra(false)
        
        // AZIONE 1: CHIUDI porta-finestra
        setPortaFinestraOpen(false)
        console.log('[BedroomScene] 🚪 Tasto J - Porta-Finestra: CHIUSA')
        
        // 🔄 EMIT: Sincronizza porta-finestra
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'porta_finestra',
            animationState: 'closed',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Porta-finestra CHIUSA')
        }
        
        // AZIONE 2: ATTIVA aria calda (SYNC con porta)
        setHotAirActive(true)
        console.log('[BedroomScene] 🌡️ Tasto J - Aria Calda: ATTIVA')
        
        // 🔄 EMIT: Sincronizza aria calda
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'aria_calda',
            animationState: 'active',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Aria calda ATTIVA')
        }
        
        // AZIONE 3: Completa ventola puzzle
        bedroomPuzzle.completeVentola()
        
        // 🎯 MESSAGGIO: Nascondi obiettivo e mostra completamento
        setMessaggioObiettivoVentola(false)
        setMessaggioCompletamentoVentola(true)
        setTimeout(() => setMessaggioCompletamentoVentola(false), 3000)
        
        return
      }
      
      // 🔄 Tasto R - Reset Puzzle
      if (key === 'r') {
        event.preventDefault()
        event.stopPropagation()
        console.log('[BedroomScene] 🔄 Tasto R - Reset Puzzle')
        bedroomPuzzle.resetPuzzles('full')
        return
      }
      
      // 🚪 Tasto O - Apri porta letto
      if (key === 'o') {
        event.preventDefault()
        event.stopPropagation()
        setPortaLettoAperta(true)
        console.log('[BedroomScene] 🚪 Tasto O - Porta Letto: APERTA')
        
        // 🔄 EMIT: Sincronizza porta letto
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'porta_letto',
            animationState: 'open',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Porta letto APERTA')
        }
        
        return
      }
      
      // 🚪 Tasto I - Chiudi porta letto
      if (key === 'i') {
        event.preventDefault()
        event.stopPropagation()
        setPortaLettoAperta(false)
        console.log('[BedroomScene] 🚪 Tasto I - Porta Letto: CHIUSA')
        
        // 🔄 EMIT: Sincronizza porta letto
        if (socket && sessionId) {
          socket.emit('syncAnimation', {
            sessionId,
            room: 'camera',
            objectName: 'porta_letto',
            animationState: 'closed',
            playerName: 'DevPlayer',
            additionalData: {}
          })
          console.log('[BedroomScene] 📤 EMIT: Porta letto CHIUSA')
        }
        
        return
      }
      
      // DEBUG: Controlli per offset Y del modello (tasti numerici 1/2/3)
      if (event.key === '1') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev + 0.1) * 10) / 10
          console.log(`[BedroomScene] 📈 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '2') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev - 0.1) * 10) / 10
          console.log(`[BedroomScene] 📉 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '3') {
        setModelYOffset(2.0)
        console.log('[BedroomScene] 🔄 Model Y offset reset to default: 2.0m')
      }
      
      // DEBUG: Controlli per eyeHeight (altezza occhi) (tasti numerici 7/8/9)
      if (event.key === '7') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev + 0.1) * 10) / 10
          console.log(`[BedroomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '8') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev - 0.1) * 10) / 10
          console.log(`[BedroomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '9') {
        setEyeHeight(1.4)
        console.log('[BedroomScene] 🔄 EyeHeight reset to default: 1.4m')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDebugPanel, comodinoSequenceData, comodinoSequencePhase, materassoSequenceData, materassoSequencePhase]) // Aggiunto per evitare stale closure
  
  // 🚧 Esponi setCollisionData globalmente per il callback di FPSController
  useEffect(() => {
    window.setCollisionData = setCollisionData
    return () => {
      delete window.setCollisionData
    }
  }, [])
  
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
    
    console.log('[Bedroom] Bounding box limits:', limits)
    console.log('[Bedroom] Using FIXED params: eyeHeight=', EYE_HEIGHT, 'moveSpeed=', MOVE_SPEED, 'collisionRadius=', COLLISION_RADIUS)
    
    setBoundaryLimits(limits)
  }, [modelRef])
  
  const safeSpawnPosition = useMemo(() => {
    // ✅ Se stiamo ancora caricando, non calcolare nulla
    if (isLoadingSpawn) {
      return { x: 0, y: 0, z: 0 } // Temporaneo, non usato
    }
    
    if (spawnData?.position) {
      console.log('[Bedroom] ✅ Usando coordinate da API/cache:', spawnData.position)
      return spawnData.position
    }
    
    // PRIORITÀ 2: Use the spawn point from the GLB model
    if (modelRef.spawnPoint) {
      const spawnFromModel = {
        x: modelRef.spawnPoint.x,
        y: modelRef.spawnPoint.y || 0,
        z: modelRef.spawnPoint.z
      }
      console.log('[Bedroom] Using GLB spawn point (world position):', spawnFromModel)
      return spawnFromModel
    }
    
    // PRIORITÀ 3: Spawn at the room center
    if (boundaryLimits) {
      const centerX = (boundaryLimits.minX + boundaryLimits.maxX) / 2
      const centerZ = (boundaryLimits.minZ + boundaryLimits.maxZ) / 2
      
      const safeSpawn = {
        x: centerX,
        y: 0,
        z: centerZ
      }
      
      console.log('[Bedroom] Spawning at room center (no GLB marker):', safeSpawn)
      return safeSpawn
    }
    
    // PRIORITÀ 4: Final fallback - ✅ SINCRONIZZATO CON DATABASE (23/12/2025)
    const FALLBACK_SPAWN = { x: -0.17, y: 0, z: 1.4 }
    console.log('[Bedroom] Using fallback spawn position:', FALLBACK_SPAWN)
    return FALLBACK_SPAWN
  }, [spawnData, modelRef.spawnPoint, boundaryLimits, isLoadingSpawn])
  
  const initialYaw = useMemo(() => {
    // ✅ Se stiamo ancora caricando, non calcolare nulla
    if (isLoadingSpawn) {
      return 0 // Temporaneo, non usato
    }
    
    if (spawnData?.yaw !== undefined) {
      console.log('[Bedroom] ✅ Usando yaw da API:', spawnData.yaw, 'radianti')
      return spawnData.yaw
    }
    
    // PRIORITÀ 2: Default yaw
    const yaw = 0
    console.log('[Bedroom] Using default yaw:', yaw, 'radians')
    return yaw
  }, [spawnData, isLoadingSpawn])
  
  if (isLoadingSpawn) {
    return <div style={{ width: '100%', height: '100%' }}><LoadingOverlay message="Caricamento camera..." /></div>
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
          modelRef={modelRef}
          comodinoPartsRef={comodinoPartsRef}
          onClose={() => {
            setSelectedObject(null)
            setShowEditorUI(false)
            setIsAnimationPlaying(false)
            setPickDestinationMode(false)
            // Reset multi-object quando chiudi editor
            setMultiObjectMode(false)
            setSlots([])
            setObjectsLocked(false)
          }}
          onConfigChange={setAnimationConfig}
          onTestAnimation={() => {
            console.log('[BedroomScene] Test animazione avviato')
            setIsAnimationPlaying(true)
          }}
          isAnimationPlaying={isAnimationPlaying}
          onPickDestinationStart={() => {
            console.log('[BedroomScene] Pick destination mode ATTIVATO')
            setPickDestinationMode(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[BedroomScene] Pick destination mode DISATTIVATO')
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
      
      {/* 🎯 OVERLAY MESSAGGI ENIGMI - Pattern Styled */}
      
      {/* === ENIGMA 1: LETTO/COMODINO === */}
      
      {/* Messaggio Iniziale Letto */}
      {messaggioInizialeLetto && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 100, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00aaff',
          boxShadow: '0 0 40px rgba(0, 170, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🛏️</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold' }}>
            "Per rimettere ordine devi prima entrare in casa e poi preparare il letto."
          </p>
        </div>
      )}
      
      {/* Obiettivo Letto */}
      {messaggioObiettivoLetto && (
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
            Come si dice chiave in inglese?<br/>E quale parte del letto si abbassa prima di dormire?<br/>Usa le prime lettere, nell'ordine giusto.
          </p>
        </div>
      )}
      
      {/* Completamento Letto */}
      {messaggioCompletamentoLetto && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff00',
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>✅</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold', color: '#00ff00' }}>
            "Ecco a te la magia!"
          </p>
        </div>
      )}
      
      {/* Blocco Letto (non usato - letto è sempre sbloccato) */}
      {messaggioBloccoLetto && (
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
            Completa prima un altro enigma
          </p>
        </div>
      )}
      
      {/* === ENIGMA 2: POLTRONA === */}
      
      {/* Messaggio Iniziale Poltrona */}
      {messaggioInizialePoltrona && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 100, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00aaff',
          boxShadow: '0 0 40px rgba(0, 170, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🪑</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold' }}>
            "Hai bisogno di luce per leggere?"
          </p>
        </div>
      )}
      
      {/* Obiettivo Poltrona */}
      {messaggioObiettivoPoltrona && (
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
            Accomodati sulla <strong>poltrona</strong> per accendere la lampada
          </p>
        </div>
      )}
      
      {/* Completamento Poltrona */}
      {messaggioCompletamentoPoltrona && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff00',
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>✅</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '22px', fontWeight: 'bold', color: '#00ff00' }}>
            "Ora hai la luce che ti serve per leggere un buon libro!"
          </p>
        </div>
      )}
      
      {/* Blocco Poltrona */}
      {messaggioBloccoPoltrona && (
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
            Completa prima il <strong>LETTO</strong>
          </p>
        </div>
      )}
      
      {/* === ENIGMA 3: VENTOLA/FINESTRA === */}
      
      {/* Messaggio Iniziale Ventola */}
      {messaggioInizialeVentola && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 100, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00aaff',
          boxShadow: '0 0 40px rgba(0, 170, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🌬️</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold' }}>
            "Hai caldo o freddo?"
          </p>
        </div>
      )}
      
      {/* Obiettivo Ventola */}
      {messaggioObiettivoVentola && (
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
            Vai vicino la <strong>finestra</strong> e chiudila per attivare il riscaldamento
          </p>
        </div>
      )}
      
      {/* Completamento Ventola */}
      {messaggioCompletamentoVentola && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 50, 0, 0.95)',
          padding: '35px 45px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2001,
          border: '3px solid #00ff00',
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>✅</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '22px', fontWeight: 'bold', color: '#00ff00' }}>
            "Riscalderai l'ambiente in un attimo prima di andare a dormire"
          </p>
        </div>
      )}
      
      {/* Blocco Ventola */}
      {messaggioBloccoVentola && (
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
            Completa prima la <strong>POLTRONA</strong>
          </p>
        </div>
      )}
      
      {/* ⭐ NUOVO: Conferma Chiusura Finestra */}
      {messaggioConfermaFinestra && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 30, 60, 0.95)',
          padding: '40px 50px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2001,
          border: '3px solid #00aaff',
          boxShadow: '0 0 40px rgba(0, 170, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px' }}>🚪</div>
          <p style={{ margin: '0 0 25px 0', lineHeight: '1.5', fontSize: '26px', fontWeight: 'bold' }}>
            Chiudere la porta-finestra?
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={handleConfirmaChiusuraPorta}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                color: '#00ff00',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.4)'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ✅ SÌ
            </button>
            <button
              onClick={() => {
                setMessaggioConfermaFinestra(false)
                console.log('[BedroomScene] ❌ Chiusura porta annullata')
              }}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                border: '2px solid #ff4444',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 68, 68, 0.2)',
                color: '#ff4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.4)'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.2)'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ❌ NO
            </button>
          </div>
        </div>
      )}
      
      {/* ⭐ NUOVO: Conferma Poltrona Accomodati */}
      {messaggioConfermaPoltronaAccomodati && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(30, 0, 60, 0.95)',
          padding: '40px 50px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2001,
          border: '3px solid #9966ff',
          boxShadow: '0 0 40px rgba(153, 102, 255, 0.7)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px' }}>🪑</div>
          <p style={{ margin: '0 0 25px 0', lineHeight: '1.5', fontSize: '26px', fontWeight: 'bold' }}>
            Fai accomodare il ragazzo nel chill?
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={handleConfermaPoltronaAccomodati}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                color: '#00ff00',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.4)'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ✅ SÌ
            </button>
            <button
              onClick={() => {
                setMessaggioConfermaPoltronaAccomodati(false)
                console.log('[BedroomScene] ❌ Poltrona annullata')
              }}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                border: '2px solid #ff4444',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 68, 68, 0.2)',
                color: '#ff4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.4)'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.2)'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ❌ NO
            </button>
          </div>
        </div>
      )}
      
      {safeSpawnPosition && (
        <Canvas
          camera={{ position: [0, 1.6, 10], fov: 75, near: 0.1 }} 
          shadows={!isMobile}
        dpr={isMobile ? [1, 1.2] : [1, 2]}
        gl={{ antialias: !isMobile, powerPreference: isMobile ? 'low-power' : 'high-performance' }}
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
        
        {worldReady && safeSpawnPosition && (
          <FPSController
          modelRef={modelRef}
          mobileInput={mobileInput}
          onLookAtChange={onLookAtChange}
          groundPlaneMesh={groundPlaneRef}
          isMobile={isMobile}
          boundaryLimits={boundaryLimits}
          initialPosition={safeSpawnPosition}
          initialYaw={initialYaw}
          eyeHeight={eyeHeight}
          modelScale={MODEL_SCALE}
          positionCaptureRef={positionCaptureRef}
          enabled={controlsEnabled}
          ventolaHitboxRef={ventolaHitboxRef}
          />
        )}
        
        {/* 🪟 Proximity Trigger per popup porta finestra */}
        <WindowProximityTrigger
          windowPosition={new THREE.Vector3(-0.33, 0, -0.61)}
          triggerRadius={2.0}
          poltronaCompletata={bedroomPuzzle.puzzleStates?.poltrona === 'completed' || bedroomPuzzle.puzzleStates?.poltrona === 'done'}
          ventolaCompletata={bedroomPuzzle.puzzleStates?.ventola === 'completed' || bedroomPuzzle.puzzleStates?.ventola === 'done'}
          onTrigger={() => {
            if (!messaggioConfermaFinestra) {
              console.log('[BedroomScene] 🪟 Proximity trigger - Mostra popup conferma finestra')
              setMessaggioObiettivoVentola(false) // Nascondi obiettivo
              setMessaggioConfermaFinestra(true) // Mostra popup
            }
          }}
        />
        
        <Suspense fallback={<LoadingIndicator />}>
          <CasaModel 
            sceneType="camera"
            bookcaseVisible={bookcaseVisible}
            portaFinestraOpen={portaFinestraOpen}
            portaFinestraConfig={portaFinestraConfig}
            portaLettoAperta={portaLettoAperta}
            portaLettoConfig={portaLettoConfig}
            onObjectClick={handleObjectClickInternal} 
            modelRef={setModelRef}
            onReady={handleWorldReady}
            enableShadows={!isMobile}
            modelYOffset={modelYOffset}
            showGrigliaHitbox={showGrigliaHitbox}
          />
          
          <GroundPlane onGroundReady={setGroundPlaneRef} />
          
          {/* 🎯 Indicatore destinazione comodino - SCOLLEGATO dal JSON animazione */}
          {comodinoSequenceData && (
            <ComodinoTargetMarker
              targetX={-1.80}
              targetY={0}
              targetZ={-2.40}
              visible={true}
            />
          )}
          
          {/* 🎨 Hook per pick destination ParticleEditor - Fuori dal Canvas! */}
          <ParticleTargetPicker particleEditor={particleEditor} />
          
          {/* 🌬️ HITBOX INGRANDITA per GRIGLIA VENTOLA - Integrata in multi-ray system */}
          {/* Posizione ottimale: davanti alla griglia, dimensioni 1m x 1m */}
          <mesh
            ref={ventolaHitboxRef}
            position={[-0.5, 1.2, -1.75]}
            name="HITBOX_GRIGLIA_VENTOLA(04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA)"
            visible={showGrigliaHitbox}
          >
            <boxGeometry args={[1.0, 1.0, 0.2]} /> {/* 🚀 INGRANDITA: 1m x 1m x 20cm (era 30x30x10cm) */}
            <meshBasicMaterial 
              color={showGrigliaHitbox ? "#00ff00" : "#ffffff"}
              transparent 
              opacity={showGrigliaHitbox ? 0.3 : 0}
              side={THREE.DoubleSide}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
          
          {/* Sistema di selezione oggetti e helper visuali */}
          {editorEnabled && modelRef.current && (
            <AnimationEditorScene
              modelRef={modelRef}
              selectedObject={selectedObject}
              onSelect={setSelectedObject}
              animationConfig={animationConfig}
              isAnimationPlaying={isAnimationPlaying}
              onAnimationComplete={() => {
                console.log('[BedroomScene] Animazione completata')
                setIsAnimationPlaying(false)
              }}
              pickDestinationMode={pickDestinationMode}
              multiObjectMode={multiObjectMode}
              objectsLocked={objectsLocked}
              slots={slots}
              onSlotsChange={setSlots}
              comodinoPartsRef={comodinoPartsRef}
              visualMarkerPosition={visualMarkerPosition}
              onDestinationPicked={(worldPos) => {
                console.log('[BedroomScene] ✅ Destinazione picked (raw):', worldPos)
                
                // 🎯 Salva posizione VISIVA per il marker (dove l'utente ha cliccato)
                setVisualMarkerPosition({
                  x: worldPos.x,
                  y: worldPos.y,
                  z: worldPos.z
                })
                console.log('[BedroomScene] 🔴 Marker VISIVO salvato a:', worldPos)
                
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
                  
                  console.log('[BedroomScene] 📊 Offset calcolato (visivo - pivot):', {
                    x: offset.x.toFixed(3),
                    y: offset.y.toFixed(3),
                    z: offset.z.toFixed(3),
                    magnitude: offset.length().toFixed(3) + 'm'
                  })
                  
                  // Correggi il target sottraendo l'offset
                  const correctedTarget = new THREE.Vector3().subVectors(worldPos, offset)
                  
                  console.log('[BedroomScene] 🔄 Rilettura Punto A da:', movable.name)
                  console.log('[BedroomScene] 🔄 Punto A (pivot):', currentWorldPos)
                  console.log('[BedroomScene] 👁️  Centro visivo attuale:', visualCenter)
                  console.log('[BedroomScene] 🎯 Punto B cliccato (MARKER):', worldPos)
                  console.log('[BedroomScene] ✅ Punto B corretto (ANIMAZIONE):', correctedTarget)
                  
                  const newConfig = {
                    ...animationConfig,
                    startX: currentWorldPos.x,
                    startY: currentWorldPos.y,
                    startZ: currentWorldPos.z,
                    endX: correctedTarget.x,
                    endY: correctedTarget.y,
                    endZ: correctedTarget.z
                  }
                  console.log('[BedroomScene] Nuovo animationConfig:', newConfig)
                  setAnimationConfig(newConfig)
                }
                setPickDestinationMode(false)
              }}
            />
          )}
          
          {/* 🎮 Sequenza comodino (tasto K) */}
          {comodinoSequencePhase && comodinoSequenceData && modelRef.current && (
            <ComodinoSequencePlayer
              modelRef={modelRef}
              sequenceData={comodinoSequenceData}
              currentPhase={comodinoSequencePhase}
              config={comodinoSequenceConfig}
              onPhaseComplete={handleSequencePhaseComplete}
              worldReady={worldReady}
            />
          )}
          
          {/* 🛏️ Animazione materasso (tasto M) */}
          {materassoSequencePhase && materassoSequenceData && modelRef.current && (
            <MaterassoSequencePlayer
              modelRef={modelRef}
              sequenceData={materassoSequenceData}
              config={materassoSequenceConfig}
              onComplete={handleMaterassoComplete}
            />
          )}
          
          {/* 🎨 Visualizzatore percorso comodino (tasto V per toggle) */}
          {showPathVisualizer && comodinoSequenceData && comodinoSequencePhase === 'position' && modelRef.current && (
            <DynamicComodinoPathVisualizer
              modelRef={modelRef}
              sequenceData={comodinoSequenceData}
            />
          )}
          
          {/* 💡 LED Dinamici gestiti dal backend */}
          {bedroomPuzzle.ledStates && (
            <>
              {/* 🏆 LED PORTA usa Game Completion (sistema globale) */}
              <PuzzleLED
                ledUuid="F228346D-C130-4F0F-A7A5-4D41EEFC8C77"
                state={gameCompletion.getDoorLEDColor('camera')}
              />
              <PuzzleLED
                ledUuid="00FDC7F3-13B8-4A9E-B27A-85871931BA91"
                state={bedroomPuzzle.ledStates.materasso}
              />
              <PuzzleLED
                ledUuid="BE2BF96C-980A-4CB3-A224-67AB4E7A2EDB"
                state={bedroomPuzzle.ledStates.poltrona}
              />
              <PuzzleLED
                ledUuid="AEF53E75-6065-4383-9C2A-AB787BAE1516"
                state={bedroomPuzzle.ledStates.ventola}
              />
              {/* 💡 LED Materasso Secondario - Sincronizzato con ventola (diventa verde con tasto J) */}
              <PuzzleLED
                ledUuid="0325C511-16AD-4622-85BF-85AF55D431CB"
                state={bedroomPuzzle.ledStates.ventola}
              />
            </>
          )}
          
          {/* 💡 Lampada locale (non parte del sistema enigmi) */}
          <PuzzleLED 
            ledUuid="592F5061-BEAC-4DB8-996C-4F71102704DD" 
            state={lampadaAccesa ? 'green' : 'off'} 
          />
          
          {/* 🎨 Particle System - Controllato da Particle Editor (tasto X) */}
          <HotAirEffectLive
            config={particleEditor.particleConfig}
            sourceObject={particleEditor.selectedObject}
            targetPosition={particleEditor.targetPosition}
          />
          
          {/* 🌡️ Heat Haze Post-Processing Effect - Porta CHIUSA = Effetto ON */}
          <HeatHazeEffect 
            enabled={!portaFinestraOpen}
            strength={0.008}
            fadeTime={0.8}
          />
          
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
      {!hideAllPanels && !showDebugPanel && (
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
      
      {/* 🎨 Particle Editor UI - controllato con tasto X */}
      {!hideAllPanels && particleEditor.editorOpen && (
        <ParticleEditor
          config={particleEditor.particleConfig}
          onConfigChange={particleEditor.updateConfig}
          onClose={particleEditor.closeEditor}
          selectedObject={particleEditor.selectedObject}
          onSelectSource={particleEditor.startSelectingSource}
          onSelectTarget={particleEditor.startSelectingTarget}
          selectingMode={particleEditor.selectingMode !== null}
          onExport={particleEditor.exportConfig}
          onImport={particleEditor.importConfig}
          onReset={particleEditor.resetConfig}
        />
      )}
      
      {/* 🎨 CSS Animations per messaggi enigmi */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-50%, -50%) rotate(-5deg); }
          75% { transform: translate(-50%, -50%) rotate(5deg); }
        }
      `}</style>
    </div>
  )
}

// Componente per gestire la selezione e i visual helper nell'editor
function AnimationEditorScene({ modelRef, selectedObject, onSelect, animationConfig, isAnimationPlaying, onAnimationComplete, pickDestinationMode, onDestinationPicked, multiObjectMode, objectsLocked, slots, onSlotsChange, comodinoPartsRef, visualMarkerPosition }) {
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
      console.log('[BedroomScene] ✅ Coordinate picked:', worldPos)
      if (onDestinationPicked) {
        onDestinationPicked(worldPos)
      }
    },
    () => {
      console.log('[BedroomScene] Pick annullato')
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
  
  // 🪑 Detecta se è il comodino (almeno un oggetto con "Samuelson" nel nome)
  const isComodinoMode = useMemo(() =>
    isMultiObjectActive && filledSlots.some(s => 
      s.object.name.toLowerCase().includes('samuelson')
    ),
    [isMultiObjectActive, filledSlots]
  )
  
  // ✅ FIX LOOP: Log solo quando i valori cambiano davvero (non ad ogni render)
  useEffect(() => {
    console.log('[AnimationEditorScene] 📊 Animation Preview Mode aggiornato:', {
      multiObjectMode,
      objectsLocked,
      filledSlotsCount: filledSlots.length,
      isMultiObjectActive,
      isComodinoMode,
      isAnimationPlaying
    })
  }, [multiObjectMode, objectsLocked, filledSlots.length, isMultiObjectActive, isComodinoMode, isAnimationPlaying])
  
  // 🪑 Hook DEDICATO per comodino - Array stabilizzato con useMemo
  const comodinoObjects = useMemo(() => {
    if (!isComodinoMode || !filledSlots || filledSlots.length === 0) return []
    return filledSlots.map(s => s.object)
  }, [isComodinoMode, filledSlots])
  
  // ✅ FIX LOOP: Log solo quando comodinoObjects cambia davvero
  useEffect(() => {
    if (isComodinoMode && comodinoObjects.length > 0) {
      console.log('[AnimationEditorScene] 🚀 Comodino Mode - Array stabilizzato')
      console.log('[AnimationEditorScene]   isComodinoMode:', isComodinoMode)
      console.log('[AnimationEditorScene]   Passando oggetti:', comodinoObjects.length)
    }
  }, [isComodinoMode, comodinoObjects.length])
  
  const comodinoHook = useComodinoAnimation(
    comodinoObjects,
    animationConfig,
    isAnimationPlaying && isComodinoMode,
    onAnimationComplete
  )
  
  // Hook singolo oggetto (modalità normale)
  useAnimationPreview(
    (isMultiObjectActive || isComodinoMode) ? null : selectedObject, // Disabilita se multi o comodino
    animationConfig,
    isAnimationPlaying && !isMultiObjectActive && !isComodinoMode, // Play solo se non multi
    onAnimationComplete
  )
  
  // Hook multi-object generico (NON per comodino)
  useMultiObjectAnimationPreview(
    (isMultiObjectActive && !isComodinoMode) ? filledSlots.map(s => s.object) : [], // Solo se NON comodino
    animationConfig,
    isAnimationPlaying && isMultiObjectActive && !isComodinoMode, // Play solo se multi ma NON comodino
    onAnimationComplete
  )
  
  // Log modalità comodino
  useEffect(() => {
    if (isComodinoMode) {
      console.log('[AnimationEditorScene] 🪑 MODALITÀ COMODINO ATTIVATA')
      console.log('[AnimationEditorScene]   Hook dedicato:', comodinoHook.isReady ? 'PRONTO' : 'IN SETUP')
      console.log('[AnimationEditorScene]   Parti trovate:', comodinoHook.partsCount)
    }
  }, [isComodinoMode, comodinoHook.isReady, comodinoHook.partsCount]) // ✅ FIX: usa proprietà primitive, non l'oggetto intero
  
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

// 🎮 Componente per eseguire la sequenza del comodino (tasto K)
function ComodinoSequencePlayer({ modelRef, sequenceData, currentPhase, config, onPhaseComplete, worldReady }) {
  // Trova gli oggetti comodino tramite UUID Blender nel nome
  const comodinoObjects = useMemo(() => {
    // ✅ FIX RACE CONDITION: Aspetta worldReady prima di cercare oggetti
    if (!worldReady || !modelRef || !modelRef.current || !sequenceData?.objectIds) return []
    
    console.log('[ComodinoSequencePlayer] 🔍 Cerco UUID:', sequenceData.objectIds)
    
    const objects = []
    let samuelsonCount = 0
    
    modelRef.current.traverse((node) => {
      // Debug: log tutti i nodi Samuelson
      if (node.name && node.name.toLowerCase().includes('samuelson')) {
        samuelsonCount++
        console.log('[ComodinoSequencePlayer] 🔍 Samuelson trovato:', node.name)
      }
      
      // Cerca UUID Blender nel nome del nodo (es: "Samuelson_8479_Nightstand(9EC68E8D-...)")
      const hasMatchingId = sequenceData.objectIds.some(id => 
        node.name.includes(id)
      )
      
      if (hasMatchingId) {
        const movable = getMovableNode(node)
        objects.push(movable)
        console.log('[ComodinoSequencePlayer] ✅ Match trovato:', node.name)
      }
    })
    
    console.log('[ComodinoSequencePlayer] 📊 Totale nodi Samuelson:', samuelsonCount)
    console.log('[ComodinoSequencePlayer] ✅ Trovati', objects.length, 'oggetti comodino')
    return objects
  }, [worldReady, modelRef, sequenceData])
  
  // Usa l'hook dedicato per il comodino
  useComodinoAnimation(
    comodinoObjects,
    config,
    true, // Sempre in play quando il componente è montato
    () => {
      console.log('[ComodinoSequencePlayer] ✅ Fase', currentPhase, 'completata')
      if (onPhaseComplete) {
        onPhaseComplete(currentPhase)
      }
    }
  )
  
  return null // Nessun rendering visivo, solo logica
}

// �️ Componente per animazione materasso (tasto M)
function MaterassoSequencePlayer({ modelRef, sequenceData, config, onComplete }) {
  // Trova gli oggetti materasso tramite UUID Blender nel nome
  const materassoObjects = useMemo(() => {
    if (!modelRef || !modelRef.current || !sequenceData?.objectIds) return []
    
    console.log('[MaterassoSequencePlayer] 🔍 Cerco UUID:', sequenceData.objectIds)
    
    const objects = []
    
    modelRef.current.traverse((node) => {
      // Cerca UUID Blender nel nome del nodo
      const hasMatchingId = sequenceData.objectIds.some(id => 
        node.name.includes(id)
      )
      
      if (hasMatchingId) {
        const movable = getMovableNode(node)
        objects.push(movable)
        console.log('[MaterassoSequencePlayer] ✅ Match trovato:', node.name)
      }
    })
    
    console.log('[MaterassoSequencePlayer] ✅ Trovati', objects.length, 'oggetti materasso')
    return objects
  }, [modelRef, sequenceData])
  
  // ✅ USA HOOK DEDICATO per materasso (NO conversioni, coordinate ESATTE!)
  useMaterassoAnimation(
    materassoObjects,
    config,
    true, // Sempre in play quando il componente è montato
    () => {
      console.log('[MaterassoSequencePlayer] ✅ Animazione completata')
      if (onComplete) {
        onComplete()
      }
    }
  )
  
  return null // Nessun rendering visivo, solo logica
}