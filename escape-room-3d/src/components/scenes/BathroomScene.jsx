import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, Html, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
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
import { useBathroomAnimation } from '../../hooks/useBathroomAnimation'
import { useAnimatedDoor } from '../../hooks/useAnimatedDoor'
import BathroomLights from '../3D/BathroomLights'
import useBathroomPuzzle from '../../hooks/useBathroomPuzzle'
import { useGameCompletion } from '../../hooks/useGameCompletion'
import useWebSocket from '../../hooks/useWebSocket'
import { PuzzleLED } from '../3D/PuzzleLED'

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
          Caricamento bagno...
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

function FPSController({ modelRef, mobileInput, onLookAtChange, groundPlaneMesh, isMobile = false, boundaryLimits, initialPosition, initialYaw = 0, eyeHeight = 1.6, modelScale = 1, positionCaptureRef }) {
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
      console.log('[BathroomScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL');
      
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
        
        // Interactive objects specifici per bagno
        if (name.startsWith('test') || 
            name.includes('bagno') || 
            name.includes('doccia') || 
            name.includes('lavabo')) {
          interactives.push(child);
          child.userData.interactive = true;
        }
      });

      setCollisionObjects(cols);
      setGroundObjects(grnds);
      setInteractiveObjects(interactives);
      
      console.log(`[BathroomScene] ✅ Configurazione: ${cols.length} collision, ${grnds.length} grounds, ${interactives.length} interattivi`);
      return;
    }

    // === CASO 2: FALLBACK (Codice vecchio se CasaModel non manda liste) ===
    if (!modelRef || !modelRef.current) return;
    
    const collidables = []
    const grounds = []
    const interactives = []
    
    console.log('[BathroomScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)');
    
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
        if (name.startsWith('test') || name.includes('bagno') || name.includes('doccia') || name.includes('lavabo')) {
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
    
    console.log(`[BathroomScene] Ground objects (${grounds.length}):`, grounds.map(o => o.name))
    console.log(`[BathroomScene] Collidable objects (${collidables.length}):`, collidables.map(o => o.name))
    console.log(`[BathroomScene] Eye height:`, eyeHeight)
    
    setCollisionObjects(collidables)
    setGroundObjects(grounds)
    setInteractiveObjects(interactives)
  }, [modelRef, groundPlaneMesh, eyeHeight])
  
  // 🎯 NUOVO LOG DETTAGLIATO - Posizione WORLD completa ogni 2 secondi
  const logTimerRef = useRef(0)
  const LOG_INTERVAL = 2.0 // Log every 2 seconds
  
  useFrame((_, delta) => {
    // Log camera position WORLD and distance from ground
    logTimerRef.current += delta
    if (logTimerRef.current >= LOG_INTERVAL) {
      logTimerRef.current = 0
      
      // ✅ POSIZIONE WORLD CAMERA
      const cameraWorldPos = new THREE.Vector3()
      camera.getWorldPosition(cameraWorldPos)
      
      // ✅ POSIZIONE WORLD PLAYERROOT (se esiste)
      let playerRootWorldPos = null
      if (camera.parent && camera.parent.parent) {
        playerRootWorldPos = new THREE.Vector3()
        camera.parent.parent.getWorldPosition(playerRootWorldPos)
      }
      
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
      
      console.log(`[BathroomScene] 📷 Camera LOCAL: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
      console.log(`[BathroomScene] 🌍 Camera WORLD: (${cameraWorldPos.x.toFixed(2)}, ${cameraWorldPos.y.toFixed(2)}, ${cameraWorldPos.z.toFixed(2)})`)
      if (playerRootWorldPos) {
        console.log(`[BathroomScene] 🎯 PlayerRoot WORLD: (${playerRootWorldPos.x.toFixed(2)}, ${playerRootWorldPos.y.toFixed(2)}, ${playerRootWorldPos.z.toFixed(2)})`)
      }
      console.log(`[BathroomScene] 📏 Distance from ground: ${minGroundDistance.toFixed(2)}m`)
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
      collisionObjects, // ✅ RIPRISTINATO: collisioni normali attive
      mobileInput,
      groundObjects,
      boundaryLimits,
      initialPosition,
      initialYaw,
      eyeHeight,
      scaledCollisionRadius,
      scaledPlayerHeight,
      MOVE_SPEED,
      true // ✅ DISABLE GRAVITY per bagno (come cucina)
    )
  
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
      {/* Aumentato a 500x500 per coprire tutta la casa scalata */}
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#cccccc" polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
  )
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
      console.log('[BathroomScene] ✅ Coordinate picked:', worldPos)
      if (onDestinationPicked) {
        onDestinationPicked(worldPos)
      }
    },
    () => {
      console.log('[BathroomScene] Pick annullato')
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

// 🚿 Componente controller per animazione doccia (dentro Canvas)
function BathroomAnimationController({ modelRef, config, onToggleRef, onStateChange, worldReady }) {
  // Usa l'hook che ora funziona con useFrame
  const animation = useBathroomAnimation(modelRef, '/anta_doccia_sequence.json', worldReady)
  
  // Esponi la funzione toggle tramite ref
  useEffect(() => {
    if (onToggleRef) {
      onToggleRef.current = animation.toggle
    }
  }, [animation.toggle, onToggleRef])
  
  // Notifica cambio stato al parent
  useEffect(() => {
    if (onStateChange) {
      onStateChange(animation.isOpen, animation.isAnimating)
    }
  }, [animation.isOpen, animation.isAnimating, onStateChange])
  
  return null // Componente invisibile
}

// 🚪 Componente controller per porta-finestra (dentro Canvas) - MULTI-OGGETTO
function PortaFinestraAnimationController({ modelRef, config, onToggleRef, onStateChange, worldReady }) {
  // Usa l'hook multi-oggetto (come anta doccia)
  const animation = useBathroomAnimation(modelRef, '/porta_finestra_bagno_sequence.json', worldReady)
  
  // Esponi la funzione toggle tramite ref
  useEffect(() => {
    if (onToggleRef) {
      onToggleRef.current = animation.toggle
    }
  }, [animation.toggle, onToggleRef])
  
  // Notifica cambio stato al parent
  useEffect(() => {
    if (onStateChange) {
      onStateChange(animation.isOpen, animation.isAnimating)
    }
  }, [animation.isOpen, animation.isAnimating, onStateChange])
  
  return null // Componente invisibile
}

// 🪟 Componente Proximity Porta-Finestra - Rileva quando player è vicino alla finestra
function PortaFinestraProximityController({ 
  enabled, 
  targetPos, 
  tolerance, 
  onInZone, 
  onOutZone 
}) {
  const { camera } = useThree()
  const [wasInZone, setWasInZone] = useState(false)
  
  useFrame(() => {
    if (!enabled) return
    
    // Usa posizione WORLD per calcolo distanza
    const worldPos = new THREE.Vector3()
    camera.getWorldPosition(worldPos)
    
    // Calcola distanza 2D (X, Z) ignorando Y
    const distance = Math.sqrt(
      Math.pow(worldPos.x - targetPos.x, 2) +
      Math.pow(worldPos.z - targetPos.z, 2)
    )
    
    const inZone = distance <= tolerance
    
    // Trigger callbacks solo su cambio stato
    if (inZone && !wasInZone) {
      setWasInZone(true)
      console.log('[PortaFinestraProximity] 📍 ENTRATO nella zona (distanza:', distance.toFixed(2), 'm)')
      if (onInZone) onInZone()
    } else if (!inZone && wasInZone) {
      setWasInZone(false)
      console.log('[PortaFinestraProximity] 📍 USCITO dalla zona')
      if (onOutZone) onOutZone()
    }
  })
  
  return null
}

// 🧘 Componente Proximity Countdown - Traccia posizione e attiva countdown
function ProximityCountdownController({
  enabled,
  targetPos,
  tolerance,
  onCountdownChange,
  onComplete,
  completedRef
}) {
  const { camera } = useThree()
  const timerRef = useRef(0)
  const lastPositionRef = useRef(new THREE.Vector3())
  const [isInZone, setIsInZone] = useState(false)
  const [currentCountdown, setCurrentCountdown] = useState(5)
  
  useFrame((_, delta) => {
    if (!enabled) {
      // Debug: Controller disabilitato
      return
    }
    
    if (completedRef.current) {
      // Debug: Già completato
      return
    }
    
    // ✅ FIX: Usa posizione WORLD, non locale!
    const worldPos = new THREE.Vector3()
    camera.getWorldPosition(worldPos)
    
    // 🔍 DEBUG: Log continuo per verificare posizione
    const distance = Math.sqrt(
      Math.pow(worldPos.x - targetPos.x, 2) +
      Math.pow(worldPos.z - targetPos.z, 2)
    )
    
    // Log ogni secondo circa
    if (!window._lastProximityLog || Date.now() - window._lastProximityLog > 1000) {
      console.log('[ProximityCountdown] 🔍 Posizione camera (WORLD): X:', worldPos.x.toFixed(2), 'Z:', worldPos.z.toFixed(2))
      console.log('[ProximityCountdown] 🎯 Target: X:', targetPos.x, 'Z:', targetPos.z)
      console.log('[ProximityCountdown] 📏 Distanza:', distance.toFixed(2), 'm | Tolerance:', tolerance, 'm')
      console.log('[ProximityCountdown] ✅ Enabled:', enabled, '| Dentro zona:', distance <= tolerance)
      window._lastProximityLog = Date.now()
    }
    
    const inZone = distance <= tolerance
    
    // Aggiorna stato zona
    if (inZone !== isInZone) {
      setIsInZone(inZone)
      console.log('[ProximityCountdown] Zona specchio:', inZone ? 'DENTRO' : 'FUORI')
    }
    
    if (inZone) {
      // Controlla movimento (delta posizione tra frame)
      const currentPos = camera.position.clone()
      const movement = currentPos.distanceTo(lastPositionRef.current)
      lastPositionRef.current.copy(currentPos)
      
      const MOVEMENT_THRESHOLD = 0.015 // 1.5cm tra frame (~60fps)
      const isMoving = movement > MOVEMENT_THRESHOLD
      
      if (isMoving) {
        // Si sta muovendo → reset timer
        if (timerRef.current > 0) {
          console.log('[ProximityCountdown] ⚠️ Movimento rilevato! Reset timer')
          timerRef.current = 0
          setCurrentCountdown(5)
          onCountdownChange(5, false) // Non attivo
        }
      } else {
        // Immobile → incrementa timer
        timerRef.current += delta
        
        // Calcola countdown (5, 4, 3, 2, 1)
        const remainingTime = 5 - timerRef.current
        const newCountdown = Math.ceil(Math.max(0, remainingTime))
        
        if (newCountdown !== currentCountdown) {
          setCurrentCountdown(newCountdown)
          console.log('[ProximityCountdown] ⏱️ Countdown:', newCountdown)
          
          if (newCountdown > 0) {
            onCountdownChange(newCountdown, true) // Countdown attivo
          }
        }
        
        // Completamento!
        if (timerRef.current >= 5 && !completedRef.current) {
          console.log('[ProximityCountdown] ✅ COUNTDOWN COMPLETATO!')
          completedRef.current = true
          onComplete()
        }
      }
    } else {
      // Fuori zona → reset
      if (timerRef.current > 0) {
        console.log('[ProximityCountdown] ⚠️ Uscito dalla zona! Reset timer')
        timerRef.current = 0
        setCurrentCountdown(5)
        onCountdownChange(5, false) // Non attivo
      }
      lastPositionRef.current.copy(camera.position)
    }
  })
  
  return null // Componente invisibile
}

export default function BathroomScene({ onObjectClick, onLookAtChange, mobileInput, isMobile = false, sessionId = 999, playerName = 'Player1' }) {
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
    console.log('[BathroomScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn')
    setWorldReady(true)
  }, [])
  
  // 🚿 State per animazione doccia (gestita dentro Canvas) - DICHIARATO PRIMA DEI REF!
  const [showerIsOpen, setShowerIsOpen] = useState(true) // ✅ Inizia APERTA a 30°
  const [showerIsAnimating, setShowerIsAnimating] = useState(false)
  const [showerConfig, setShowerConfig] = useState(null)
  const showerToggleRef = useRef(null)
  
  // 🚪 State per porta-finestra bagno (tasto K) - MULTI-OGGETTO - DICHIARATO PRIMA DEI REF!
  const [doorIsOpen, setDoorIsOpen] = useState(true) // ✅ Inizia APERTA a 30°
  const [doorIsAnimating, setDoorIsAnimating] = useState(false)
  const [doorConfig, setDoorConfig] = useState(null)
  const doorToggleRef = useRef(null)
  
  // 💡 State per luci bagno (tasto J) - DICHIARATO PRIMA DEI REF!
  const [lampsEnabled, setLampsEnabled] = useState(false) // ✅ Inizia SPENTO
  
  // 💡 Sistema LED Bagno
  const { socket } = useWebSocket(sessionId, 'bagno', playerName) // ✅ FIX COMPLETO: Passa tutti e 3 i parametri!
  const bathroom = useBathroomPuzzle(sessionId, socket) // 🔥 FIX WEBSOCKET: Passa socket per aggiornamenti in tempo reale!
  const { getDoorLEDColor } = useGameCompletion(sessionId, socket) // ✅ FIX: Passa socket!
  
  // 📥 LISTENER WebSocket - Sincronizzazione Player-to-Player
  useEffect(() => {
    if (!socket) return

    const handleAnimationSync = (data) => {
      // Filtra solo eventi per questo room
      if (data.room !== 'bagno') return

      console.log('[BathroomScene] 📥 Sync ricevuto da:', data.triggeredBy, '→', data.objectName, data.animationState)

      // 🚿 Doccia sync
      if (data.objectName === 'doccia') {
        setShowerIsOpen(data.animationState === 'open')
        console.log('[BathroomScene] ✅ Doccia sincronizzata:', data.animationState)
      }

      // 🚪 Porta finestra sync
      if (data.objectName === 'porta_finestra') {
        setDoorIsOpen(data.animationState === 'open')
        console.log('[BathroomScene] ✅ Porta finestra sincronizzata:', data.animationState)
      }

      // 💡 Luci bagno sync
      if (data.objectName === 'luci') {
        setLampsEnabled(data.animationState === 'on')
        console.log('[BathroomScene] ✅ Luci bagno sincronizzate:', data.animationState)
      }
    }

    socket.on('animationStateChanged', handleAnimationSync)
    console.log('[BathroomScene] ✅ Listener player-to-player registrato')

    return () => {
      socket.off('animationStateChanged', handleAnimationSync)
      console.log('[BathroomScene] 🔌 Listener player-to-player rimosso')
    }
  }, [socket])
  
  // 📤 EMIT WebSocket - Sincronizza doccia quando cambia stato
  const prevShowerStateRef = useRef(showerIsOpen)
  useEffect(() => {
    // Salta il primo render (inizializzazione)
    if (prevShowerStateRef.current === showerIsOpen) {
      prevShowerStateRef.current = showerIsOpen
      return
    }
    
    if (socket && sessionId) {
      socket.emit('syncAnimation', {
        sessionId,
        room: 'bagno',
        objectName: 'doccia',
        animationState: showerIsOpen ? 'open' : 'closed',
        playerName: 'DevPlayer',
        additionalData: {}
      })
      console.log('[BathroomScene] 📤 EMIT: Doccia', showerIsOpen ? 'APERTA' : 'CHIUSA')
    }
    
    prevShowerStateRef.current = showerIsOpen
  }, [showerIsOpen, socket, sessionId])
  
  // 📤 EMIT WebSocket - Sincronizza porta-finestra quando cambia stato
  const prevDoorStateRef = useRef(doorIsOpen)
  useEffect(() => {
    // Salta il primo render (inizializzazione)
    if (prevDoorStateRef.current === doorIsOpen) {
      prevDoorStateRef.current = doorIsOpen
      return
    }
    
    if (socket && sessionId) {
      socket.emit('syncAnimation', {
        sessionId,
        room: 'bagno',
        objectName: 'porta_finestra',
        animationState: doorIsOpen ? 'open' : 'closed',
        playerName: 'DevPlayer',
        additionalData: {}
      })
      console.log('[BathroomScene] 📤 EMIT: Porta finestra', doorIsOpen ? 'APERTA' : 'CHIUSA')
    }
    
    prevDoorStateRef.current = doorIsOpen
  }, [doorIsOpen, socket, sessionId])
  
  // 📤 EMIT WebSocket - Sincronizza luci quando cambia stato
  const prevLampsStateRef = useRef(lampsEnabled)
  useEffect(() => {
    // Salta il primo render (inizializzazione)
    if (prevLampsStateRef.current === lampsEnabled) {
      prevLampsStateRef.current = lampsEnabled
      return
    }
    
    if (socket && sessionId) {
      socket.emit('syncAnimation', {
        sessionId,
        room: 'bagno',
        objectName: 'luci',
        animationState: lampsEnabled ? 'on' : 'off',
        playerName: 'DevPlayer',
        additionalData: {}
      })
      console.log('[BathroomScene] 📤 EMIT: Luci bagno', lampsEnabled ? 'ACCESE' : 'SPENTE')
    }
    
    prevLampsStateRef.current = lampsEnabled
  }, [lampsEnabled, socket, sessionId])
  
  // 🔄 AUTO-RESET al caricamento scena (come cucina)
  useEffect(() => {
    if (bathroom.resetPuzzles) {
      console.log('[BathroomScene] 🔄 Auto-reset al mount')
      bathroom.resetPuzzles('full')
      // Reset anche animazioni locali
      setLampsEnabled(false)
      setShowerIsOpen(true)
      setDoorIsOpen(true)
      // Reset countdown
      countdownCompleted.current = false
    }
  }, []) // Solo al mount
  
  // Stato per il loading overlay - INIZIA SUBITO COME TRUE
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // State per spawn position (caricato async da API)
  const [spawnPosition, setSpawnPosition] = useState(null)
  const [initialYaw, setInitialYaw] = useState(1.57) // Default: 90 gradi
  
  // DEBUG: Offset Y del modello (controllabile con tastiera)
  const [modelYOffset, setModelYOffset] = useState(2.0) // Default: 2.0m (scene interne)
  
  // DEBUG: EyeHeight (altezza occhi camera) controllabile in tempo reale
  const [eyeHeight, setEyeHeight] = useState(1.4) // Default: 1.4m (bagno)
  
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
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  
  // 🎯 State per nascondere TUTTI i pannelli con tasto \
  const [hideAllPanels, setHideAllPanels] = useState(true)
  
  // 🪞 ENIGMA SPECCHIO BAGNO - Messaggi obiettivo
  const [messaggioInizialeSpecchio, setMessaggioInizialeSpecchio] = useState(false)
  const [messaggioObiettivoSpecchio, setMessaggioObiettivoSpecchio] = useState(false)
  const [messaggioSuccessoSpecchio, setMessaggioSuccessoSpecchio] = useState(false)
  
  // 🪟 PORTA FINESTRA BAGNO - Messaggi obiettivo
  const [messaggioPortaFinestra, setMessaggioPortaFinestra] = useState(false)
  const [obiettivoPortaFinestra, setObiettivoPortaFinestra] = useState(false)
  const [messaggioConfermaSpazio, setMessaggioConfermaSpazio] = useState(false)
  const [portaFinestraClicked, setPortaFinestraClicked] = useState(false) // Flag per tracciare il click
  
  // 🌬️ SEQUENZA UMIDITÀ/ASPIRATORE
  const [messaggioUmidita, setMessaggioUmidita] = useState(false)
  const [obiettivoUmidita, setObiettivoUmidita] = useState(false)
  const [showOverlayChiudiFinestra, setShowOverlayChiudiFinestra] = useState(false)
  const [messaggioFinale, setMessaggioFinale] = useState(false)
  const [vicinoFinestra, setVicinoFinestra] = useState(false)
  
  // 🧘 PROXIMITY COUNTDOWN SYSTEM - Concentrazione mentale per accendere luci
  const [specchioClicked, setSpecchioClicked] = useState(false) // Flag abilitazione (ora avvio automatico)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownValue, setCountdownValue] = useState(5)
  const countdownCompleted = useRef(false) // Previene loop
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGI - Ref per memorizzare gli interval
  const specchioRepeatIntervalRef = useRef(null)
  const portaFinestraRepeatIntervalRef = useRef(null)
  const umiditaRepeatIntervalRef = useRef(null)
  
  // 🪟 PROXIMITY SYSTEM PORTA-FINESTRA - Messaggi con bottoni SI/NO
  const [showPortaFinestraPrompt, setShowPortaFinestraPrompt] = useState(false)
  const [portaFinestraProximityEnabled, setPortaFinestraProximityEnabled] = useState(false)
  const [controlsEnabled, setControlsEnabled] = useState(true) // Controlla pointer lock
  
  // 🎯 STATO SEQUENZA ENIGMI - Traccia completamento per far partire il successivo
  const [enigma1Completato, setEnigma1Completato] = useState(false)
  const [enigma2Avviato, setEnigma2Avviato] = useState(false) // Flag separato per evitare doppio avvio
  const [enigma2Completato, setEnigma2Completato] = useState(false)
  const [enigma3Avviato, setEnigma3Avviato] = useState(false) // Flag separato per evitare doppio avvio
  const [enigma3Completato, setEnigma3Completato] = useState(false)
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGI - Enigma 1 (Specchio)
  // Flag per tracciare se l'interval è stato avviato
  const [specchioRepeatStarted, setSpecchioRepeatStarted] = useState(false)
  
  // Avvia interval quando messaggio obiettivo appare la prima volta
  useEffect(() => {
    if (messaggioObiettivoSpecchio && !specchioRepeatStarted && !enigma1Completato) {
      console.log('[BathroomScene] 🔄 Avvio ripetizione messaggio specchio (ogni 15s)')
      setSpecchioRepeatStarted(true)
      
      specchioRepeatIntervalRef.current = setInterval(() => {
        console.log('[BathroomScene] 🔄 Ripeto messaggio obiettivo specchio')
        setMessaggioObiettivoSpecchio(true)
        setTimeout(() => setMessaggioObiettivoSpecchio(false), 5000)
      }, 15000) // Ripete ogni 15 secondi (5s visibile + 10s pausa)
    }
  }, [messaggioObiettivoSpecchio, specchioRepeatStarted, enigma1Completato])
  
  // Ferma interval solo quando enigma completato
  useEffect(() => {
    if (enigma1Completato && specchioRepeatIntervalRef.current) {
      console.log('[BathroomScene] 🛑 Stop ripetizione messaggio specchio (enigma completato)')
      clearInterval(specchioRepeatIntervalRef.current)
      specchioRepeatIntervalRef.current = null
      setSpecchioRepeatStarted(false)
    }
  }, [enigma1Completato])
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGI - Enigma 2 (Porta finestra)
  const [portaFinestraRepeatStarted, setPortaFinestraRepeatStarted] = useState(false)
  
  useEffect(() => {
    if (obiettivoPortaFinestra && !portaFinestraRepeatStarted && !enigma2Completato) {
      console.log('[BathroomScene] 🔄 Avvio ripetizione messaggio porta finestra (ogni 15s)')
      setPortaFinestraRepeatStarted(true)
      
      portaFinestraRepeatIntervalRef.current = setInterval(() => {
        console.log('[BathroomScene] 🔄 Ripeto messaggio obiettivo porta finestra')
        setObiettivoPortaFinestra(true)
        setTimeout(() => setObiettivoPortaFinestra(false), 5000)
      }, 15000)
    }
  }, [obiettivoPortaFinestra, portaFinestraRepeatStarted, enigma2Completato])
  
  useEffect(() => {
    if (enigma2Completato && portaFinestraRepeatIntervalRef.current) {
      console.log('[BathroomScene] 🛑 Stop ripetizione messaggio porta finestra (enigma completato)')
      clearInterval(portaFinestraRepeatIntervalRef.current)
      portaFinestraRepeatIntervalRef.current = null
      setPortaFinestraRepeatStarted(false)
    }
  }, [enigma2Completato])
  
  // 🔄 SISTEMA RIPETIZIONE MESSAGGI - Enigma 3 (Umidità)
  const [umiditaRepeatStarted, setUmiditaRepeatStarted] = useState(false)
  
  useEffect(() => {
    if (obiettivoUmidita && !umiditaRepeatStarted && !enigma3Completato) {
      console.log('[BathroomScene] 🔄 Avvio ripetizione messaggio umidità (ogni 15s)')
      setUmiditaRepeatStarted(true)
      
      umiditaRepeatIntervalRef.current = setInterval(() => {
        console.log('[BathroomScene] 🔄 Ripeto messaggio obiettivo umidità')
        setObiettivoUmidita(true)
        setTimeout(() => setObiettivoUmidita(false), 5000)
      }, 15000)
    }
  }, [obiettivoUmidita, umiditaRepeatStarted, enigma3Completato])
  
  useEffect(() => {
    if (enigma3Completato && umiditaRepeatIntervalRef.current) {
      console.log('[BathroomScene] 🛑 Stop ripetizione messaggio umidità (enigma completato)')
      clearInterval(umiditaRepeatIntervalRef.current)
      umiditaRepeatIntervalRef.current = null
      setUmiditaRepeatStarted(false)
    }
  }, [enigma3Completato])
  
  // 🪞 Handler per click oggetti bagno (integrazione pattern enigmi)
  const handleObjectClick = (objectName) => {
    if (typeof objectName !== 'string') return
    
    const name = objectName.toLowerCase()
    console.log('[BathroomScene] 🎯 Click handler:', name)
    
    // ✅ MODIFICATO: Rimossi click handler per specchio e porta finestra
    // Gli enigmi partono automaticamente in sequenza
    
    // Propaga al parent (RoomScene)
    if (onObjectClick) {
      onObjectClick(objectName)
    }
  }
  
  // Carica configurazione JSON per animazione doccia
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/anta_doccia_sequence.json')
        const config = await response.json()
        setShowerConfig(config)
        console.log('[BathroomScene] ✅ Configurazione doccia caricata:', config)
      } catch (error) {
        console.error('[BathroomScene] ❌ Errore caricamento config doccia:', error)
      }
    }
    loadConfig()
  }, [])
  
  // 🚪 Carica configurazione JSON per porta-finestra bagno (MULTI-OGGETTO)
  useEffect(() => {
    const loadDoorConfig = async () => {
      try {
        const response = await fetch('/porta_finestra_bagno_sequence.json')
        const data = await response.json()
        
        // Salva configurazione COMPLETA (non solo primo oggetto!)
        if (data) {
          setDoorConfig(data)
          console.log('[BathroomScene] ✅ Config porta-finestra MULTI-OGGETTO caricata:', data)
          console.log('[BathroomScene] 📊 Numero oggetti nella sequence:', data.sequence?.length || 0)
        }
      } catch (error) {
        console.error('[BathroomScene] ❌ Errore caricamento config porta-finestra:', error)
      }
    }
    loadDoorConfig()
  }, [])
  
  useEffect(() => {
    if (positionCaptureRef.current && !captureReady) {
      setCaptureReady(true)
    }
  }, [positionCaptureRef.current, captureReady])
  
  // Timer per animare il progresso e nascondere l'overlay dopo 3 secondi
  useEffect(() => {
    const startTime = Date.now()
    const duration = 3000 // 3 secondi (ridotto da 5)
    
    // Aggiorna progresso ogni 100ms
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(100, (elapsed / duration) * 100)
      setLoadingProgress(progress)
      
      if (elapsed >= duration) {
        clearInterval(progressInterval)
        setIsLoading(false)
        setLoadingProgress(100)
        console.log('⏱️ [BathroomScene] Loading overlay nascosto dopo 3 secondi')
      }
    }, 100)
    
    return () => clearInterval(progressInterval)
  }, []) // Solo al mount
  
  // Carica spawn position async all'avvio (pattern KitchenScene)
  useEffect(() => {
    const loadSpawnPosition = async () => {
      console.log('🔍 [BathroomScene] CARICAMENTO spawn position async - START')
      
      try {
        const captured = await getCapturedPosition('bagno')
        console.log('🔍 [BathroomScene] getCapturedPosition("bagno") returned:', captured)
        
        if (captured) {
          const result = {
            x: captured.position.x,
            y: captured.position.y,
            z: captured.position.z
          }
          console.log('✅ [BathroomScene] Usando coordinate da API/cache:', result)
          setSpawnPosition(result)
        } else {
          // Fallback se API non disponibile
          const FALLBACK_SPAWN = { x: 0, y: 0, z: 0 }
          console.warn('⚠️ [BathroomScene] NESSUNA coordinata trovata! Usando fallback:', FALLBACK_SPAWN)
          setSpawnPosition(FALLBACK_SPAWN)
        }
      } catch (error) {
        console.error('❌ [BathroomScene] Errore caricamento spawn:', error)
        setSpawnPosition({ x: 0, y: 0, z: 0 })
      }
      
      console.log('🔍 [BathroomScene] CARICAMENTO spawn position - END')
    }
    
    loadSpawnPosition()
  }, [])
  
  // Carica yaw async separatamente (pattern KitchenScene)
  useEffect(() => {
    const loadYaw = async () => {
      try {
        const captured = await getCapturedPosition('bagno')
        if (captured && captured.yaw !== undefined) {
          console.log('[Bathroom] ✅ Usando yaw da API:', captured.yaw, 'radianti (', (captured.yaw * 180 / Math.PI).toFixed(1), 'gradi)')
          setInitialYaw(captured.yaw)
        } else {
          console.log('[Bathroom] Using default yaw: 1.57 radians (90 degrees)')
        }
      } catch (error) {
        console.error('[Bathroom] Errore caricamento yaw:', error)
      }
    }
    
    loadYaw()
  }, [])
  
  // 🎯 1️⃣ AVVIO AUTOMATICO PRIMO ENIGMA - All'inizio della scena
  useEffect(() => {
    console.log('[BathroomScene] 🔍 Check avvio primo enigma - isLoading:', isLoading, 'spawnPosition:', spawnPosition)
    
    if (!isLoading && spawnPosition) {
      // Aspetta che la scena sia caricata, poi avvia primo enigma
      console.log('[BathroomScene] ✅ Condizioni soddisfatte! Avvio timer per primo enigma...')
      const timer = setTimeout(() => {
        console.log('[BathroomScene] 🎯 ⏰ TIMER SCADUTO - Avvio automatico PRIMO ENIGMA (Specchio)')
        setSpecchioClicked(true) // Abilita proximity system
        setMessaggioInizialeSpecchio(true)
        console.log('[BathroomScene] 📢 Messaggio iniziale specchio ATTIVATO')
        setTimeout(() => {
          console.log('[BathroomScene] 📢 Nascondo messaggio iniziale, mostro obiettivo')
          setMessaggioInizialeSpecchio(false)
          setMessaggioObiettivoSpecchio(true)
          setTimeout(() => {
            console.log('[BathroomScene] 📢 Nascondo messaggio obiettivo')
            setMessaggioObiettivoSpecchio(false)
          }, 5000)
        }, 3000)
      }, 1000) // 1 secondo dopo il caricamento (ridotto da 2)
      
      return () => clearTimeout(timer)
    } else {
      console.log('[BathroomScene] ⚠️ Condizioni NON soddisfatte per avvio primo enigma')
    }
  }, [isLoading, spawnPosition])
  
  // 🎯 2️⃣ MONITORA COMPLETAMENTO PRIMO ENIGMA → Avvia secondo dopo 5 secondi
  useEffect(() => {
    if (lampsEnabled && !enigma1Completato) {
      console.log('[BathroomScene] ✅ PRIMO ENIGMA COMPLETATO (luci accese)')
      setEnigma1Completato(true)
    }
  }, [lampsEnabled, enigma1Completato])
  
  // 🎯 2️⃣-bis AVVIO SECONDO ENIGMA (separato per evitare loop)
  useEffect(() => {
    if (enigma1Completato && !enigma2Avviato) {
      console.log('[BathroomScene] ⏱️ Enigma 1 completato → Avvio timer per secondo enigma')
      setEnigma2Avviato(true) // Imposta flag SUBITO per evitare doppio avvio
      
      // Attendi 5 secondi prima di avviare secondo enigma
      const timer = setTimeout(() => {
        console.log('[BathroomScene] ⏱️ Timer scaduto → Avvio SECONDO ENIGMA (Porta finestra)')
        setMessaggioPortaFinestra(true)
        setTimeout(() => {
          setMessaggioPortaFinestra(false)
          setObiettivoPortaFinestra(true)
          setTimeout(() => setObiettivoPortaFinestra(false), 5000)
        }, 3000)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma1Completato]) // ✅ Solo enigma1Completato nelle dipendenze
  
  // 🎯 3️⃣ MONITORA COMPLETAMENTO SECONDO ENIGMA → Avvia terzo dopo 5 secondi
  useEffect(() => {
    if (!showerIsOpen && !showerIsAnimating && enigma1Completato && !enigma2Completato) {
      console.log('[BathroomScene] ✅ SECONDO ENIGMA COMPLETATO (doccia chiusa)')
      setEnigma2Completato(true)
      
      // 🔥 CHIAMA API BACKEND per completare enigma doccia (SOLO SE NON GIÀ COMPLETATO)
      if (bathroom.getPuzzleStatus('doccia') !== 'done') {
        console.log('[BathroomScene] 🔥 Chiamata API: bathroom.completePuzzle("doccia")')
        bathroom.completePuzzle('doccia')
      }
      
      // Mostra messaggio conferma spazio
      setMessaggioConfermaSpazio(true)
      setTimeout(() => setMessaggioConfermaSpazio(false), 5000)
    }
  }, [showerIsOpen, showerIsAnimating, enigma1Completato, enigma2Completato])
  
  // 🧲 MAG1 TRIGGER - Rileva completamento puzzle doccia e triggera animazione
  useEffect(() => {
    const docciaStatus = bathroom.docciaStatus  // ✅ FIX: usa proprietà diretta (valore), non metodo (funzione)!
    
    // 🔍 DEBUG: Log per verificare stato
    console.log('[BathroomScene] 🔍 MAG1 Debug - Doccia Status Check:', {
      docciaStatus,
      showerIsOpen,
      showerIsAnimating,
      enigma1Completato,
      enigma2Completato,
      willTrigger: docciaStatus === 'done' && showerIsOpen && !showerIsAnimating && enigma1Completato && !enigma2Completato
    })
    
    // ✅ GUARD CONDITIONS COMPLETE (da documentazione ufficiale)
    if (docciaStatus === 'done' && 
        showerIsOpen && 
        !showerIsAnimating && 
        enigma1Completato && 
        !enigma2Completato) {
      
      console.log('[BathroomScene] 🧲 MAG1 TRIGGER! Condizioni soddisfatte:')
      console.log('[BathroomScene]    ✅ docciaStatus === "done"')
      console.log('[BathroomScene]    ✅ showerIsOpen === true')
      console.log('[BathroomScene]    ✅ !showerIsAnimating')
      console.log('[BathroomScene]    ✅ enigma1Completato === true')
      console.log('[BathroomScene]    ✅ !enigma2Completato')
      console.log('[BathroomScene] 🎬 Triggero chiusura automatica anta doccia...')
      
      // Triggera chiusura automatica anta doccia
      if (showerToggleRef.current) {
        console.log('[BathroomScene] 🚿 Chiamo showerToggleRef.current() per chiudere anta')
        showerToggleRef.current()
      } else {
        console.warn('[BathroomScene] ⚠️ showerToggleRef non disponibile!')
      }
    }
    
  }, [bathroom.docciaStatus, showerIsOpen, showerIsAnimating, enigma1Completato, enigma2Completato])
  
  // 🎯 3️⃣-bis AVVIO TERZO ENIGMA (separato per evitare loop)
  useEffect(() => {
    if (enigma2Completato && !enigma3Avviato) {
      console.log('[BathroomScene] ⏱️ Enigma 2 completato → Avvio timer per terzo enigma')
      setEnigma3Avviato(true) // Imposta flag SUBITO per evitare doppio avvio
      
      // Attendi 5 secondi prima di avviare terzo enigma
      const timer = setTimeout(() => {
        console.log('[BathroomScene] ⏱️ Timer scaduto → Avvio TERZO ENIGMA (Umidità)')
        setMessaggioUmidita(true)
        setTimeout(() => {
          setMessaggioUmidita(false)
          setObiettivoUmidita(true)
          setTimeout(() => setObiettivoUmidita(false), 5000)
        }, 3000)
        
        // 🪟 ATTIVA PROXIMITY SYSTEM per porta-finestra dopo messaggio iniziale
        setTimeout(() => {
          console.log('[BathroomScene] 🪟 Proximity porta-finestra ATTIVATO')
          setPortaFinestraProximityEnabled(true)
        }, 8000) // 8s totali (3s messaggio umidità + 5s messaggio obiettivo)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [enigma2Completato]) // ✅ Solo enigma2Completato nelle dipendenze
  
  // 🎯 4️⃣ MONITORA COMPLETAMENTO TERZO ENIGMA (chiusura porta-finestra)
  useEffect(() => {
    if (!doorIsOpen && enigma2Completato && !enigma3Completato) {
      console.log('[BathroomScene] ✅ TERZO ENIGMA COMPLETATO (porta-finestra chiusa)')
      setEnigma3Completato(true)
      
      // 🔥 CHIAMA API BACKEND per completare enigma ventola (SOLO SE NON GIÀ COMPLETATO)
      if (bathroom.getPuzzleStatus('ventola') !== 'done') {
        console.log('[BathroomScene] 🔥 Chiamata API: bathroom.completePuzzle("ventola")')
        bathroom.completePuzzle('ventola')
      }
      
      // Mostra messaggio finale successo
      setMessaggioFinale(true)
      setTimeout(() => setMessaggioFinale(false), 5000)
    }
  }, [doorIsOpen, enigma2Completato, enigma3Completato])
  
  // 🔄 SYNC MESSAGGI COMPLETAMENTO - Enigma 1 (Specchio)
  // Monitora bathroom.specchioStatus e mostra messaggio quando cambia a 'done'
  useEffect(() => {
    if (bathroom.specchioStatus === 'done' && !messaggioSuccessoSpecchio && !enigma1Completato) {
      console.log('[BathroomScene] 📥 SYNC: Specchio completato da altro player - Mostro messaggio!')
      setMessaggioSuccessoSpecchio(true)
      setTimeout(() => setMessaggioSuccessoSpecchio(false), 5000)
      setEnigma1Completato(true)
    }
  }, [bathroom.specchioStatus])
  
  // 🔄 SYNC MESSAGGI COMPLETAMENTO - Enigma 2 (Doccia)
  // Monitora bathroom.docciaStatus e mostra messaggio quando cambia a 'done'
  useEffect(() => {
    if (bathroom.docciaStatus === 'done' && !messaggioConfermaSpazio && !enigma2Completato) {
      console.log('[BathroomScene] 📥 SYNC: Doccia completata da altro player - Mostro messaggio!')
      setMessaggioConfermaSpazio(true)
      setTimeout(() => setMessaggioConfermaSpazio(false), 5000)
      setEnigma2Completato(true)
    }
  }, [bathroom.docciaStatus])
  
  // 🔄 SYNC MESSAGGI COMPLETAMENTO - Enigma 3 (Ventola)
  // Monitora bathroom.ventolaStatus e mostra messaggio quando cambia a 'done'
  useEffect(() => {
    if (bathroom.ventolaStatus === 'done' && !messaggioFinale && !enigma3Completato) {
      console.log('[BathroomScene] 📥 SYNC: Ventola completata da altro player - Mostro messaggio!')
      setMessaggioFinale(true)
      setTimeout(() => setMessaggioFinale(false), 5000)
      setEnigma3Completato(true)
    }
  }, [bathroom.ventolaStatus])
  
  // === CONFIGURAZIONE FISICA AGGIORNATA ===
  const MODEL_SCALE = 1
  
  // ALTEZZA OCCHI: 1.6 per una prospettiva naturale
  const EYE_HEIGHT = 1.6 * MODEL_SCALE
  
  const COLLISION_RADIUS = 0.3 * MODEL_SCALE
  const PLAYER_HEIGHT = 1.8 * MODEL_SCALE // Il corpo resta alto per le collisioni
  const MOVE_SPEED = 1.35 * MODEL_SCALE  // Camminata normale (target: 1.35 u/s horizontal speed)
  
  // Quando un oggetto viene selezionato, mostra l'UI
  useEffect(() => {
    if (selectedObject && editorEnabled) {
      setShowEditorUI(true)
    } else {
      setShowEditorUI(false)
    }
  }, [selectedObject, editorEnabled])
  
  // Keyboard listener per DEBUG tasti numerici E TASTO E
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      
      // 🎯 Tasto \ (backslash) - Toggle TUTTI i pannelli
      if (event.key === '\\') {
        event.preventDefault()
        event.stopPropagation()
        setHideAllPanels(prev => {
          const newState = !prev
          console.log('[BathroomScene] 🎯 Tasto \\ - ' + (newState ? 'NASCONDO' : 'MOSTRO') + ' tutti i pannelli')
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
          console.log('[BathroomScene] Animation Editor:', newState ? 'ABILITATO' : 'DISABILITATO')
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
      
      // Tasto P - Toggle pannello debug
      if (key === 'p') {
        event.preventDefault()
        event.stopPropagation()
        setShowDebugPanel(prev => !prev)
        console.log('[BathroomScene] Pannello debug:', !showDebugPanel ? 'APERTO' : 'CHIUSO')
        return
      }
      
      // 🚿 Tasto L - Toggle doccia (anta + maniglia) - TEMPORANEO per test
      if (key === 'l' && showerConfig) {
        event.preventDefault()
        event.stopPropagation()
        console.log('[BathroomScene] 🚿 Tasto L premuto - Toggle doccia')
        console.log('[BathroomScene] Stato attuale:', showerIsOpen ? 'APERTA' : 'CHIUSA')
        console.log('[BathroomScene] Animating:', showerIsAnimating)
        
        if (!showerIsAnimating) {
          // Usa il ref per comunicare con il componente dentro Canvas
          if (showerToggleRef.current) {
            showerToggleRef.current()
          }
        } else {
          console.log('[BathroomScene] ⚠️ Animazione in corso, ignoro comando')
        }
        return
      }
      
      // 🚪 Tasto K - Toggle porta-finestra bagno (MULTI-OGGETTO con ref)
      if (key === 'k' && doorConfig) {
        event.preventDefault()
        event.stopPropagation()
        console.log('[BathroomScene] 🚪 Tasto K premuto - Toggle porta-finestra MULTI-OGGETTO')
        console.log('[BathroomScene] Stato attuale:', doorIsOpen ? 'APERTA' : 'CHIUSA')
        console.log('[BathroomScene] Animating:', doorIsAnimating)
        
        if (!doorIsAnimating) {
          // Usa il ref per comunicare con il componente dentro Canvas (come tasto L)
          if (doorToggleRef.current) {
            doorToggleRef.current()
          }
        } else {
          console.log('[BathroomScene] ⚠️ Animazione in corso, ignoro comando')
        }
        return
      }
      
      // 💡 Tasto J - Toggle luci bagno
      if (key === 'j') {
        event.preventDefault()
        event.stopPropagation()
        setLampsEnabled(prev => {
          const newState = !prev
          console.log('[BathroomScene] 💡 Tasto J premuto - Luci bagno:', newState ? 'ACCESE' : 'SPENTE')
          return newState
        })
        return
      }
      
      // 🔄 Tasto R - Reset Bathroom Puzzles (come cucina)
      if (key === 'r') {
        event.preventDefault()
        event.stopPropagation()
        console.log('[BathroomScene] 🔄 Tasto R - RESET PUZZLE!')
        bathroom.resetPuzzles('full')
        // Reset anche animazioni locali
        setLampsEnabled(false)
        setShowerIsOpen(true)
        setDoorIsOpen(true)
        // Reset countdown
        countdownCompleted.current = false
        return
      }
      
      // DEBUG: Controlli per offset Y del modello (tasti numerici 1/2/3)
      if (event.key === '1') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev + 0.1) * 10) / 10
          console.log(`[BathroomScene] 📈 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '2') {
        setModelYOffset(prev => {
          const newOffset = Math.round((prev - 0.1) * 10) / 10
          console.log(`[BathroomScene] 📉 Model Y offset: ${prev.toFixed(1)}m → ${newOffset.toFixed(1)}m`)
          return newOffset
        })
      }
      if (event.key === '3') {
        setModelYOffset(2.0)
        console.log('[BathroomScene] 🔄 Model Y offset reset to default: 2.0m')
      }
      
      // DEBUG: Controlli per eyeHeight (altezza occhi) (tasti numerici 7/8/9)
      if (event.key === '7') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev + 0.1) * 10) / 10
          console.log(`[BathroomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '8') {
        setEyeHeight(prev => {
          const newHeight = Math.round((prev - 0.1) * 10) / 10
          console.log(`[BathroomScene] 👁️ EyeHeight: ${prev.toFixed(1)}m → ${newHeight.toFixed(1)}m`)
          return newHeight
        })
      }
      if (event.key === '9') {
        setEyeHeight(1.4)
        console.log('[BathroomScene] 🔄 EyeHeight reset to default: 1.4m')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showerConfig, showerIsOpen, showerIsAnimating, showDebugPanel])
  
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
    
    console.log('[Bathroom] Bounding box limits:', limits)
    console.log('[Bathroom] Using FIXED params: eyeHeight=', EYE_HEIGHT, 'moveSpeed=', MOVE_SPEED, 'collisionRadius=', COLLISION_RADIUS)
    
    setBoundaryLimits(limits)
  }, [modelRef])
  
  // 🔄 CONVERSIONE LOCAL → WORLD quando entrambi modelRef E spawnPosition sono pronti
  const [spawnWorldPosition, setSpawnWorldPosition] = useState(null)
  
  useEffect(() => {
    console.log('[BathroomScene] 🔍 DIAGNOSTIC A - useEffect conversione triggered')
    console.log('[BathroomScene] 🔍 DIAGNOSTIC A - Condizioni:', {
      modelRef: !!modelRef?.current,
      spawnPosition: !!spawnPosition,
      worldReady
    })
    
    // ✅ GUARD: Aspetta che ENTRAMBI siano pronti
    if (!modelRef?.current || !spawnPosition || !worldReady) {
      console.log('[BathroomScene] 🔍 DIAGNOSTIC B1 - Guard: Aspettando prerequisiti per conversione')
      return
    }
    
    console.log('[BathroomScene] 🔍 DIAGNOSTIC B2 - Guard PASSED - Inizio conversione')
    
    // 🔬 CONVERSIONE LOCAL → WORLD (FIX CONTRATTO DATI)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[BathroomScene] 🔄 CONVERSIONE LOCAL → WORLD')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const spawnLocal = new THREE.Vector3(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    )
    
    console.log('[BathroomScene] 🔍 DIAGNOSTIC B3 - INPUT RAW/LOCAL:', {
      x: spawnLocal.x.toFixed(3),
      y: spawnLocal.y.toFixed(3),
      z: spawnLocal.z.toFixed(3)
    })
    
    // 🎯 APPLICA CONVERSIONE
    const spawnWorld = modelRef.current.localToWorld(spawnLocal.clone())
    
    console.log('[BathroomScene] 🔍 DIAGNOSTIC C - OUTPUT WORLD (dopo localToWorld):', {
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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading Overlay - SEMPRE visibile finché spawn non è caricato */}
      <LoadingOverlay 
        isVisible={isLoading || !safeSpawnPosition}
        progress={loadingProgress}
        message="Caricamento Bagno"
      />
      
      {/* Debug overlay - mostra posizione e rotazione in tempo reale */}
      {!hideAllPanels && <LivePositionDebug debugInfo={liveDebugInfo} />}
      
      {/* 🎯 Animation Editor UI */}
      {!hideAllPanels && showEditorUI && (
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
            console.log('[BathroomScene] Test animazione avviato')
            setIsAnimationPlaying(true)
          }}
          isAnimationPlaying={isAnimationPlaying}
          onPickDestinationStart={() => {
            console.log('[BathroomScene] Pick destination mode ATTIVATO')
            setPickDestinationMode(true)
          }}
          onPickDestinationEnd={() => {
            console.log('[BathroomScene] Pick destination mode DISATTIVATO')
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
      
      {/* Overlay UI per cattura posizioni */}
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
      
      {/* ✅ FIX DEADLOCK: Canvas render usa RAW coordinates, non aspetta conversione WORLD */}
      {spawnPosition && (
        <Canvas
          camera={{ 
            position: [safeSpawnPosition.x, eyeHeight, safeSpawnPosition.z], 
            fov: 75, 
            near: 0.1 
          }} 
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
        
        {/* 🔄 GUARD: Spawn SOLO quando mondo è stabile (worldReady) E coordinate caricate */}
        {worldReady && spawnPosition && (
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
            modelScale={MODEL_SCALE}
            positionCaptureRef={positionCaptureRef}
            controlsEnabled={controlsEnabled}
          />
        )}
        
        <Suspense fallback={<LoadingIndicator />}>
          <CasaModel 
            sceneType="bagno"
            onObjectClick={handleObjectClick} 
            modelRef={setModelRef}
            onReady={handleWorldReady}
            enableShadows={!isMobile}
            modelYOffset={modelYOffset}
          />
          
          <GroundPlane onGroundReady={setGroundPlaneRef} />
          
          {/* 🚿 Sistema animazione doccia (tasto L) */}
          {modelRef.current && showerConfig && (
            <BathroomAnimationController
              modelRef={modelRef}
              config={showerConfig}
              onToggleRef={showerToggleRef}
              onStateChange={(isOpen, isAnimating) => {
                setShowerIsOpen(isOpen)
                setShowerIsAnimating(isAnimating)
              }}
              worldReady={worldReady}
            />
          )}
          
          {/* 🚪 Sistema animazione porta-finestra (tasto K) - MULTI-OGGETTO */}
          {modelRef.current && doorConfig && (
            <PortaFinestraAnimationController
              modelRef={modelRef}
              config={doorConfig}
              onToggleRef={doorToggleRef}
              onStateChange={(isOpen, isAnimating) => {
                setDoorIsOpen(isOpen)
                setDoorIsAnimating(isAnimating)
              }}
              worldReady={worldReady}
            />
          )}
          
          {/* 💡 Sistema luci bagno (tasto J) */}
          <BathroomLights enabled={lampsEnabled} />
          
          {/* 💡 Sistema LED Bagno - 4 LED per enigmi */}
          <PuzzleLED 
            ledUuid="BBDD926F-991B-461E-AFD6-B8160DBDEF1C"
            state={getDoorLEDColor('bagno')}
          />
          <PuzzleLED 
            ledUuid="26E43847-607F-4BB9-B2B6-9CE675DADFFB"
            state={bathroom.getLEDColor('specchio')}
          />
          <PuzzleLED 
            ledUuid="E3EA401C-0723-4718-A3E8-DDD4AC43CEA9"
            state={bathroom.getLEDColor('porta_finestra')}
          />
          <PuzzleLED 
            ledUuid="2E3E52F0-3339-453D-A634-D0A1A48B32F7"
            state={bathroom.getLEDColor('ventola')}
          />
          
          {/* 🧘 Proximity Countdown Controller */}
          <ProximityCountdownController
            enabled={specchioClicked && !countdownCompleted.current}
            targetPos={{ x: 1.93, z: 3.94 }}
            tolerance={0.6}
            onCountdownChange={(value, active) => {
              setCountdownValue(value)
              setCountdownActive(active)
            }}
            onComplete={() => {
              console.log('[BathroomScene] 🎉 Countdown completato - Accendo luci!')
              setLampsEnabled(true)
              setCountdownActive(false)
      // 🔥 CHIAMA API BACKEND per completare enigma specchio (SOLO SE NON GIÀ COMPLETATO)
      if (bathroom.getPuzzleStatus('specchio') !== 'done') {
        console.log('[BathroomScene] 🔥 Chiamata API: bathroom.completePuzzle("specchio")')
        bathroom.completePuzzle('specchio')
      }
              setMessaggioSuccessoSpecchio(true)
              setTimeout(() => setMessaggioSuccessoSpecchio(false), 5000)
            }}
            completedRef={countdownCompleted}
          />
          
          {/* 🪟 Proximity Controller Porta-Finestra (con bottoni SI/NO) */}
          {portaFinestraProximityEnabled && !enigma3Completato && (
            <PortaFinestraProximityController
              enabled={true}
              targetPos={{ x: 2.28, z: 3.58 }}
              tolerance={1.0}
              onInZone={() => {
                console.log('[BathroomScene] 📍 DENTRO zona porta-finestra - Mostro prompt')
                setShowPortaFinestraPrompt(true)
                setControlsEnabled(false) // 🔓 Rilascia pointer lock per permettere click sui bottoni
              }}
              onOutZone={() => {
                console.log('[BathroomScene] 📍 FUORI zona porta-finestra - Nascondo prompt')
                setShowPortaFinestraPrompt(false)
                setControlsEnabled(true) // 🔒 Riattiva pointer lock
              }}
            />
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
                console.log('[BathroomScene] Animazione completata')
                setIsAnimationPlaying(false)
              }}
              pickDestinationMode={pickDestinationMode}
              multiObjectMode={multiObjectMode}
              objectsLocked={objectsLocked}
              slots={slots}
              onSlotsChange={setSlots}
              visualMarkerPosition={visualMarkerPosition}
              onDestinationPicked={(worldPos) => {
                console.log('[BathroomScene] ✅ Destinazione picked (raw):', worldPos)
                
                // 🎯 Salva posizione VISIVA per il marker (dove l'utente ha cliccato)
                setVisualMarkerPosition({
                  x: worldPos.x,
                  y: worldPos.y,
                  z: worldPos.z
                })
                console.log('[BathroomScene] 🔴 Marker VISIVO salvato a:', worldPos)
                
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
                  
                  console.log('[BathroomScene] 🔄 Rilettura Punto A da:', movable.name)
                  console.log('[BathroomScene] ✅ Punto B corretto (ANIMAZIONE):', correctedTarget)
                  
                  const newConfig = {
                    ...animationConfig,
                    startX: currentWorldPos.x,
                    startY: currentWorldPos.y,
                    startZ: currentWorldPos.z,
                    endX: correctedTarget.x,
                    endY: correctedTarget.y,
                    endZ: correctedTarget.z
                  }
                  console.log('[BathroomScene] Nuovo animationConfig:', newConfig)
                  setAnimationConfig(newConfig)
                }
                setPickDestinationMode(false)
              }}
            />
          )}
          
          {!isMobile && <Environment preset="apartment" />}
        </Suspense>
        
        {/* 🌟 LENS EFFECT - Bloom sottile (effetto alla telecamera) */}
        {lampsEnabled && !isMobile && (
          <EffectComposer>
            <Bloom
              intensity={0.6}          // Intensità ridotta (effetto sottile)
              luminanceThreshold={1.2}  // Soglia ALTA (solo luci dirette)
              luminanceSmoothing={0.3}  // Smoothing ridotto
              radius={0.5}             // Raggio piccolo (effetto concentrato)
              mipmapBlur={false}       // Performance
            />
          </EffectComposer>
        )}
        </Canvas>
      )}
      
      {/* DEBUG: Model Position Control Panel */}
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
      
      {/* Pulsante per riaprire il pannello debug se chiuso - DISABILITATO */}
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
      
      {/* 🪞 ENIGMA SPECCHIO BAGNO - Overlay Messaggi */}
      
      {/* Messaggio Iniziale */}
      {messaggioInizialeSpecchio && (
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
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🪞</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold' }}>
            "Hai bisogno di truccarti?"
          </p>
        </div>
      )}
      
      {/* Obiettivo */}
      {messaggioObiettivoSpecchio && (
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
            Avvicinati allo <strong>specchio</strong> per truccarti
          </p>
        </div>
      )}
      
      {/* 🧘 Overlay Countdown - Concentrazione */}
      {countdownActive && countdownValue > 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(100, 0, 150, 0.95)',
          padding: '50px 60px',
          borderRadius: '20px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          zIndex: 2002,
          border: '4px solid #ff00ff',
          boxShadow: '0 0 60px rgba(255, 0, 255, 0.8)',
          animation: 'pulse 1s ease-in-out infinite'
        }}>
          <div style={{ fontSize: '120px', fontWeight: 'bold', marginBottom: '20px', color: '#ff00ff', textShadow: '0 0 20px rgba(255, 0, 255, 0.8)' }}>
            {countdownValue}
          </div>
          <p style={{ margin: 0, fontSize: '18px', color: '#ffccff' }}>
            Rimani immobile...
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#cc99ff', fontStyle: 'italic' }}>
            Concentrati sullo specchio 🧘‍♀️
          </p>
        </div>
      )}
      
      {/* 🎉 Messaggio Successo */}
      {messaggioSuccessoSpecchio && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 100, 50, 0.95)',
          padding: '40px 50px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2003,
          border: '4px solid #00ff88',
          boxShadow: '0 0 50px rgba(0, 255, 136, 0.9)',
          animation: 'successPop 0.5s ease-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '72px' }}>✨</div>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontSize: '28px', fontWeight: 'bold', color: '#00ff88' }}>
            Incredibile!
          </p>
          <p style={{ margin: 0, lineHeight: '1.6', fontSize: '20px' }}>
            Sei riuscito ad accendere le luci dello specchio <strong>col pensiero!</strong> 🧠💡
          </p>
        </div>
      )}
      
      {/* 🪟 PORTA FINESTRA BAGNO - Overlay Messaggi */}
      
      {/* Messaggio Iniziale Porta Finestra */}
      {messaggioPortaFinestra && (
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
          <div style={{ marginBottom: '15px', fontSize: '56px' }}>🪟</div>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '24px', fontWeight: 'bold' }}>
            "Come apro la finestra?"
          </p>
        </div>
      )}
      
      {/* Obiettivo Porta Finestra */}
      {obiettivoPortaFinestra && (
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
            Chiudi fisicamente l'<strong>anta della doccia</strong> per avere il giusto spazio
          </p>
        </div>
      )}
      
      {/* Messaggio Conferma Spazio (dopo chiusura doccia) */}
      {messaggioConfermaSpazio && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 100, 50, 0.95)',
          padding: '40px 50px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2003,
          border: '4px solid #00ff88',
          boxShadow: '0 0 50px rgba(0, 255, 136, 0.9)',
          animation: 'successPop 0.5s ease-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '72px' }}>✅</div>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontSize: '28px', fontWeight: 'bold', color: '#00ff88' }}>
            Perfetto!
          </p>
          <p style={{ margin: 0, lineHeight: '1.6', fontSize: '20px' }}>
            Ora hai lo <strong>spazio</strong> per poter aprire la finestra!
          </p>
        </div>
      )}
      
      {/* 🪟 PROXIMITY PORTA-FINESTRA - Overlay con Bottoni SI/NO */}
      {showPortaFinestraPrompt && !enigma3Completato && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(30, 30, 60, 0.98)',
          padding: '45px 55px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 2100,
          border: '4px solid #ffaa00',
          boxShadow: '0 0 50px rgba(255, 170, 0, 0.8)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '64px' }}>🪟</div>
          <p style={{ 
            margin: '0 0 30px 0', 
            fontSize: '24px', 
            fontWeight: 'bold',
            lineHeight: '1.4'
          }}>
            Chiudere porta finestra?
          </p>
          
          {/* Bottoni SI/NO */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            {/* Bottone SI */}
            <button
              onClick={() => {
                console.log('[BathroomScene] 🪟 Click SI - Chiudo porta-finestra automaticamente')
                setShowPortaFinestraPrompt(false)
                setPortaFinestraProximityEnabled(false) // Disabilita proximity
                setControlsEnabled(true) // 🔒 Riattiva pointer lock dopo il click
                
                // Trigger chiusura automatica (come tasto K)
                if (doorToggleRef.current && doorIsOpen) {
                  console.log('[BathroomScene] 🚪 Trigger doorToggleRef (chiusura automatica)')
                  doorToggleRef.current()
                } else {
                  console.log('[BathroomScene] ⚠️ Porta già chiusa o ref non disponibile')
                }
              }}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                backgroundColor: '#00cc66',
                color: 'white',
                border: '3px solid #00ff88',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 204, 102, 0.5)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#00ff88'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00cc66'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ✓ SI
            </button>
            
            {/* Bottone NO */}
            <button
              onClick={() => {
                console.log('[BathroomScene] 🪟 Click NO - Nascondo messaggio (può riapparire)')
                setShowPortaFinestraPrompt(false)
                setControlsEnabled(true) // 🔒 Riattiva pointer lock dopo il click
                // NON disabilita proximity - può riapparire se rientra nella zona
              }}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                backgroundColor: '#cc4444',
                color: 'white',
                border: '3px solid #ff6666',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(204, 68, 68, 0.5)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ff6666'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#cc4444'
                e.target.style.transform = 'scale(1)'
              }}
            >
              ✗ NO
            </button>
          </div>
        </div>
      )}
      
      {/* 🌬️ TERZO ENIGMA - Overlay Messaggi */}
      
      {/* Messaggio Iniziale Umidità */}
      {messaggioUmidita && (
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
            "Fa freddo fuori, come tolgo l'umidità dopo la doccia?"
          </p>
        </div>
      )}
      
      {/* Obiettivo Umidità */}
      {obiettivoUmidita && (
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
            Chiudi la <strong>porta-finestra</strong> per evitare che entri aria fredda
          </p>
        </div>
      )}
      
      {/* Messaggio Finale Successo */}
      {messaggioFinale && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 100, 50, 0.95)',
          padding: '40px 50px',
          borderRadius: '15px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          textAlign: 'center',
          maxWidth: '550px',
          zIndex: 2003,
          border: '4px solid #00ff88',
          boxShadow: '0 0 50px rgba(0, 255, 136, 0.9)',
          animation: 'successPop 0.5s ease-out'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '72px' }}>🎉</div>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontSize: '28px', fontWeight: 'bold', color: '#00ff88' }}>
            Complimenti!
          </p>
          <p style={{ margin: 0, lineHeight: '1.6', fontSize: '20px' }}>
            Hai risolto tutti gli enigmi del <strong>bagno!</strong> 🚿✨
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
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 60px rgba(255, 0, 255, 0.8); }
          50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 80px rgba(255, 0, 255, 1); }
        }
        @keyframes successPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  )
}