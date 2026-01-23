import { useLayoutEffect, useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { Box3, Vector3, MeshStandardMaterial, Color, Raycaster } from 'three'
import { useThree } from '@react-three/fiber'
import { applyAutoCollisionTags, getCollidableMeshes } from '../../utils/autoCollisionTags'
import { useAntaCucina } from '../../hooks/useAntaCucina'
import { usePentolaAnimation } from '../../hooks/usePentolaAnimation'
import { useAnimatedDoor } from '../../hooks/useAnimatedDoor'
import { useCancello, useCancelletto } from '../../hooks/useCancello'
import { createStaticBVH, disposeBVH } from '../../utils/collisionBVH'

// LED ESTERNO (fotocellula cancello + porta ingresso)
const LED_CANCELLO_UUID = 'F1A5A79E-2A29-4D51-91F2-64C12C32521D'
const LED_PORTA_INGRESSO_UUID = '90EF727A-574A-4375-958A-411C9461754D'

// LED SERRA (cucina)
const NEON_SERRA_UUID = 'BA166D41-384C-499E-809C-E932A5015BB4'

/** Teleport e Snap: Posiziona e incolla al pavimento */
function teleportAndSnap(spawnPoint, scene, camera, eyeHeight = 1.3) {
  if (!spawnPoint || !camera) return

  // 🚨 DEBUG: Log stack trace per identificare quando viene chiamato
  console.log('🚨 [CasaModel] TELEPORT CHIAMATO!', {
    spawnPoint,
    eyeHeight,
    cameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    stack: new Error().stack?.split('\n').slice(1, 4).join('\n') // Prime 3 righe dello stack
  })

  // 1. Posizione Base
  const pos = new Vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z)
  
  // 2. Raycast verticale per trovare il pavimento esatto
  const raycaster = new Raycaster(
    new Vector3(pos.x, pos.y + 5, pos.z), // Parti dall'alto
    new Vector3(0, -1, 0),                // Spara in basso
    0, 
    20 // Max distanza
  )
  
  // Cerca intersezioni con tutto
  const hits = raycaster.intersectObjects(scene.children, true)
  
  let finalY = pos.y
  
  // Filtra solo oggetti che sembrano pavimenti o solidi
  const groundHit = hits.find(h => h.object.isMesh && (h.object.userData.ground || h.object.userData.collidable))
  
  if (groundHit) {
      console.log(`[CasaModel] 🦶 SNAP TO GROUND: Trovato "${groundHit.object.name}" a Y=${groundHit.point.y.toFixed(3)}`)
      finalY = groundHit.point.y + eyeHeight
  } else {
      console.warn(`[CasaModel] ⚠️ Nessun pavimento sotto lo spawn. Uso Y predefinita.`)
      finalY = pos.y + (eyeHeight > 2 ? 0 : eyeHeight) // Se spawn è a terra, aggiungi eyeHeight
  }

  camera.position.set(pos.x, finalY, pos.z)
  camera.updateMatrixWorld(true)
  console.log(`[CasaModel] 📸 Camera Teleported to: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`)
}

export default function CasaModel({ 
  sceneType = 'cucina',
  doorNodeName = null,
  onObjectClick, 
  modelRef,
  onReady, // 🚀 NEW: Event-driven callback quando il mondo è stabile
  enableShadows = true,
  cancelloAperto = false,
  cancellettoAperto = false,
  ledSerraVerde = false,
  ledPortaVerde = false, // 💡 LED PORTA INGRESSO (verde se aperta)
  neonSerraAcceso = false, // 🌿 NUOVO: Neon serra verde intenso
  mobileSmartAntaAperta = false,
  pentolaSuiFornelli = false,
  animatedDoorOpen = false,
  animatedDoorConfig = null,
  fridgeDoorOpen = false,
  fridgeDoorConfig = null,
  portaCucinaOpen = false,
  portaCucinaConfig = null,
  portaFinestraOpen = false,
  portaFinestraConfig = null,
  portaIngressoAperta = false,
  portaIngressoConfig = null,
  manigliaEsternaPortaIngressoConfig = null,
  manigliaInternaPortaIngressoConfig = null,
  portaLettoAperta = false,
  portaLettoConfig = null,
  modelYOffset = null, // Offset Y personalizzabile per debug (default: usa PIANO_TERRA_HEIGHT)
  disableTeleport = false, // 🔒 NUOVO: Disabilita teleport quando abbiamo coordinate catturate
  disablePentolaAnimation = false, // 🔒 NUOVO: Disabilita usePentolaAnimation durante preview editor
  bookcaseVisible = false, // 📚 NUOVO: Toggle visibilità BookCase/Humano (tasto L in BedroomScene)
  porteSoggiornoAperte = false, // 🚪 NUOVO: Stato porte soggiorno (tasti O/I)
  porteSoggiornoConfig = null, // 🚪 NUOVO: Configurazione 3 porte soggiorno
  showGrigliaHitbox = false // 🔍 NUOVO: Debug visivo hitbox griglia ventola (tasto F)
}) {
  // 🚀 OTTIMIZZAZIONE: Usa modello compresso con Draco (19.15 MB invece di 91.81 MB, -79%)
  const { scene } = useGLTF('/models/casa_compressed.glb', true)
  const groupRef = useRef()
  const ledCancelloRef = useRef(null) // 💡 LED CANCELLO (fotocellula)
  const ledPortaIngressoRef = useRef(null) // 💡 LED PORTA INGRESSO
  const neonSerraRef = useRef(null) // 🌿 Ref per neon serra
  const grigliaHitboxRef = useRef(null) // 🔍 Ref per hitbox griglia ventola
  const { camera } = useThree()
  const CASA_SCALE = 10  // Scala 10x per dimensioni realistiche (casa era in scala 1:10)
  const isFirstMount = useRef(true) // Track if it's the first mount
  const hasInitiallyTeleported = useRef(false) // 🔒 Guard flag per prevenire teleport multipli
  
  // 🎯 FIX: State trigger per attivare useLayoutEffect quando il gruppo è montato
  const [groupMounted, setGroupMounted] = useState(false)

  const ledMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color(0xff0000), emissive: new Color(0xff0000), emissiveIntensity: 2.0, metalness: 0.5, roughness: 0.3
  }), [])
  
  // 🌿 Materiali per neon serra - Verde intenso quando acceso, grigio quando spento
  const neonAccesoMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color(0x00ff00),      // Verde brillante
    emissive: new Color(0x00ff00),   // Emissione verde
    emissiveIntensity: 6.0,          // MOLTO INTENSO (3x rispetto al LED)
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.95
  }), [])
  
  const neonSpentoMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color(0x333333),      // Grigio scuro
    emissive: new Color(0x000000),   // Nessuna emissione
    emissiveIntensity: 0,
    metalness: 0.5,
    roughness: 0.8
  }), [])
  
  // Ref per garantire che il BVH sia costruito una sola volta
  const bvhBuiltRef = useRef(false)
  const bvhDataRef = useRef(null)

  // ✅ REACT-SAFE: Animazioni - Hook SEMPRE chiamati (ordine fisso)
  // La condizione è gestita con parametro 'enabled' dentro ogni hook
  
  // 🔒 FIX: Stabilizza variabili booleane con useMemo per prevenire cambio ordine hook
  const isCucina = useMemo(() => sceneType === 'cucina', [sceneType])
  const isEsterno = useMemo(() => sceneType === 'esterno', [sceneType])
  const isSoggiorno = useMemo(() => sceneType === 'soggiorno', [sceneType])
  
  // 🔒 FIX: Stabilizza config objects per dependency arrays stabili
  const stableAnimatedDoorConfig = useMemo(() => animatedDoorConfig ?? null, [animatedDoorConfig])
  const stableFridgeDoorConfig = useMemo(() => fridgeDoorConfig ?? null, [fridgeDoorConfig])
  const stablePortaCucinaConfig = useMemo(() => portaCucinaConfig ?? null, [portaCucinaConfig])
  const stablePortaFinestraConfig = useMemo(() => portaFinestraConfig ?? null, [portaFinestraConfig])
  const stablePortaIngressoConfig = useMemo(() => portaIngressoConfig ?? null, [portaIngressoConfig])
  const stableManigliaEsternaPortaIngressoConfig = useMemo(() => manigliaEsternaPortaIngressoConfig ?? null, [manigliaEsternaPortaIngressoConfig])
  const stableManigliaInternaPortaIngressoConfig = useMemo(() => manigliaInternaPortaIngressoConfig ?? null, [manigliaInternaPortaIngressoConfig])
  const stablePortaLettoConfig = useMemo(() => portaLettoConfig ?? null, [portaLettoConfig])
  const stablePorteSoggiornoConfig = useMemo(() => porteSoggiornoConfig ?? null, [porteSoggiornoConfig])
  
  // Hook cucina - sempre chiamati, enabled basato su sceneType
  useAntaCucina(
    scene, 
    mobileSmartAntaAperta, 
    { meshPattern: 'mobile smart + door_511', lato: 'destra', angoloApertura: 90, asse: 'z' },
    isCucina  // ← enabled
  )
  
  usePentolaAnimation(
    scene, 
    pentolaSuiFornelli, 
    { pentolaPattern: 'PENTOLA', fornelliPattern: 'Feu_1_460', offsetY: 0.1 },
    isCucina && !disablePentolaAnimation  // ← enabled: solo cucina E NON in preview
  )
  
  // useMemo per sportello 1 - sempre chiamato
  const doorObject = useMemo(() => {
    if (!isCucina || !scene || !stableAnimatedDoorConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stableAnimatedDoorConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stableAnimatedDoorConfig, isCucina])
  
  useAnimatedDoor(
    doorObject, 
    animatedDoorOpen, 
    stableAnimatedDoorConfig,
    isCucina  // ← enabled
  )
  
  // useMemo per sportello frigo - sempre chiamato
  const fridgeDoorObject = useMemo(() => {
    if (!isCucina || !scene || !stableFridgeDoorConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stableFridgeDoorConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stableFridgeDoorConfig, isCucina])
  
  useAnimatedDoor(
    fridgeDoorObject, 
    fridgeDoorOpen, 
    stableFridgeDoorConfig,
    isCucina  // ← enabled
  )
  
  // useMemo per porta cucina - sempre chiamato
  const portaCucinaObject = useMemo(() => {
    if (!isCucina || !scene || !stablePortaCucinaConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePortaCucinaConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePortaCucinaConfig, isCucina])
  
  useAnimatedDoor(
    portaCucinaObject, 
    portaCucinaOpen, 
    stablePortaCucinaConfig,
    isCucina  // ← enabled
  )
  
  // useMemo per porta-finestra camera - sempre chiamato
  const isCamera = useMemo(() => sceneType === 'camera', [sceneType])
  
  const portaFinestraObject = useMemo(() => {
    if (!isCamera || !scene || !stablePortaFinestraConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePortaFinestraConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePortaFinestraConfig, isCamera])
  
  useAnimatedDoor(
    portaFinestraObject, 
    portaFinestraOpen, 
    stablePortaFinestraConfig,
    isCamera  // ← enabled
  )
  
  // useMemo per porta letto - sempre chiamato
  const portaLettoObject = useMemo(() => {
    if (!isCamera || !scene || !stablePortaLettoConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePortaLettoConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePortaLettoConfig, isCamera])
  
  useAnimatedDoor(
    portaLettoObject, 
    portaLettoAperta, 
    stablePortaLettoConfig,
    isCamera  // ← enabled
  )
  
  // 🚪 Porte Soggiorno (3 porte) - Hook per ogni porta
  // Porta 1: PORTA_SOGGIORNO(B4B3C2EF-4864-43B4-B31D-E61D253C4F55)
  const portaSoggiorno1Object = useMemo(() => {
    if (!isSoggiorno || !scene || !stablePorteSoggiornoConfig || !stablePorteSoggiornoConfig[0]) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePorteSoggiornoConfig[0].objectName) {
        foundDoor = child
      }
    })
    // Log rimosso per evitare spam console (eseguito ad ogni render)
    return foundDoor
  }, [scene, stablePorteSoggiornoConfig, isSoggiorno])
  
  useAnimatedDoor(
    portaSoggiorno1Object,
    porteSoggiornoAperte,
    stablePorteSoggiornoConfig?.[0] ?? null,
    isSoggiorno  // ← enabled
  )
  
  // Porta 2: PORTA_SOGGIORNO(079FD9A0-116F-42A9-965F-53B7A490C976)
  const portaSoggiorno2Object = useMemo(() => {
    if (!isSoggiorno || !scene || !stablePorteSoggiornoConfig || !stablePorteSoggiornoConfig[1]) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePorteSoggiornoConfig[1].objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePorteSoggiornoConfig, isSoggiorno])
  
  useAnimatedDoor(
    portaSoggiorno2Object,
    porteSoggiornoAperte,
    stablePorteSoggiornoConfig?.[1] ?? null,
    isSoggiorno  // ← enabled
  )
  
  // Porta 3: PORTA_SOGGIORNO(B3801606-5CB8-4DAE-BF91-9744F6A508FE)
  const portaSoggiorno3Object = useMemo(() => {
    if (!isSoggiorno || !scene || !stablePorteSoggiornoConfig || !stablePorteSoggiornoConfig[2]) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePorteSoggiornoConfig[2].objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePorteSoggiornoConfig, isSoggiorno])
  
  useAnimatedDoor(
    portaSoggiorno3Object,
    porteSoggiornoAperte,
    stablePorteSoggiornoConfig?.[2] ?? null,
    isSoggiorno  // ← enabled
  )
  
  // Hook esterno - sempre chiamati, enabled basato su sceneType
  useCancello(
    scene, 
    cancelloAperto, 
    { modalita: 'realistico' },
    isEsterno  // ← enabled
  )
  
  // ❌ CANCELLETTO PEDONALE RIMOSSO - Solo cancello grande (2 ante)
  // useCancelletto rimosso perché non più necessario
  
  // 🚪 Porta Ingresso hook - useMemo + useAnimatedDoor (tasto L)
  const portaIngressoObject = useMemo(() => {
    if (!isEsterno || !scene || !stablePortaIngressoConfig) return null
    let foundDoor = null
    scene.traverse((child) => {
      if (child.name === stablePortaIngressoConfig.objectName) {
        foundDoor = child
      }
    })
    return foundDoor
  }, [scene, stablePortaIngressoConfig, isEsterno])
  
  useAnimatedDoor(
    portaIngressoObject,
    portaIngressoAperta,
    stablePortaIngressoConfig,
    isEsterno  // ← enabled
  )
  
  // 🚪 Maniglie Porta Ingresso - ATTACH alle porte (seguono la porta senza ruotare)
  useEffect(() => {
    if (!isEsterno || !scene || !portaIngressoObject) return
    
    const manigliaEsterna = stableManigliaEsternaPortaIngressoConfig?.objectName
    const manigliaInterna = stableManigliaInternaPortaIngressoConfig?.objectName
    
    if (!manigliaEsterna && !manigliaInterna) return
    
    const attachedHandles = []
    const handlesToAttach = [] // 🔧 FIX: Prima raccogli, POI sposta
    
    // STEP 1: Cerca le maniglie (SOLO lettura, nessuna modifica!)
    scene.traverse((child) => {
      const isEsterna = manigliaEsterna && child.name === manigliaEsterna
      const isInterna = manigliaInterna && child.name === manigliaInterna
      
      if (isEsterna || isInterna) {
        handlesToAttach.push({ child, isEsterna })
      }
    })
    
    // STEP 2: Ora attacca le maniglie (FUORI dal traverse!)
    handlesToAttach.forEach(({ child, isEsterna }) => {
      // Salva posizione/rotazione world originale
      const worldPos = new THREE.Vector3()
      const worldQuat = new THREE.Quaternion()
      child.getWorldPosition(worldPos)
      child.getWorldQuaternion(worldQuat)
      
      // Salva parent originale per cleanup
      const originalParent = child.parent
      
      // Rimuovi dal parent originale
      if (originalParent) {
        originalParent.remove(child)
      }
      
      // Attacca alla porta
      portaIngressoObject.add(child)
      
      // Calcola posizione locale rispetto alla porta
      const portaWorldPos = new THREE.Vector3()
      const portaWorldQuat = new THREE.Quaternion()
      portaIngressoObject.getWorldPosition(portaWorldPos)
      portaIngressoObject.getWorldQuaternion(portaWorldQuat)
      
      const localPos = portaIngressoObject.worldToLocal(worldPos.clone())
      child.position.copy(localPos)
      
      // Mantieni rotazione world
      const localQuat = portaWorldQuat.clone().invert().multiply(worldQuat)
      child.quaternion.copy(localQuat)
      
      child.updateMatrix()
      
      attachedHandles.push({ handle: child, originalParent })
    })
    
    // Cleanup: riattacca le maniglie ai parent originali quando il componente smonta
    return () => {
      attachedHandles.forEach(({ handle, originalParent }) => {
        if (originalParent && handle) {
          // Salva posizione world
          const worldPos = new THREE.Vector3()
          const worldQuat = new THREE.Quaternion()
          handle.getWorldPosition(worldPos)
          handle.getWorldQuaternion(worldQuat)
          
          // Rimuovi dalla porta
          portaIngressoObject.remove(handle)
          
          // Riattacca al parent originale
          originalParent.add(handle)
          
          // Ripristina posizione/rotazione world
          const localPos = originalParent.worldToLocal(worldPos.clone())
          handle.position.copy(localPos)
          
          const parentWorldQuat = new THREE.Quaternion()
          originalParent.getWorldQuaternion(parentWorldQuat)
          const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat)
          handle.quaternion.copy(localQuat)
          
          handle.updateMatrix()
          
          console.log('[CasaModel] 🔄 Maniglia riattaccata al parent originale')
        }
      })
    }
  }, [isEsterno, scene, portaIngressoObject, stableManigliaEsternaPortaIngressoConfig, stableManigliaInternaPortaIngressoConfig])

  // 💡 LED ESTERNO - CANCELLO (fotocellula) + PORTA INGRESSO
  // Effect 1: Cerca i LED nel modello 3D
  useEffect(() => {
    if (sceneType !== 'esterno' || !scene) return
    
    scene.traverse((obj) => {
      if (obj.isMesh && obj.name) {
        // LED CANCELLO (fotocellula)
        if (obj.name.includes(LED_CANCELLO_UUID)) {
          ledCancelloRef.current = obj
          obj.material = ledMaterial.clone()
          console.log('[CasaModel] 💡 LED CANCELLO trovato:', obj.name)
        }
        
        // LED PORTA INGRESSO
        if (obj.name.includes(LED_PORTA_INGRESSO_UUID)) {
          ledPortaIngressoRef.current = obj
          obj.material = ledMaterial.clone()
          console.log('[CasaModel] 💡 LED PORTA INGRESSO trovato:', obj.name)
        }
      }
    })
  }, [scene, sceneType, ledMaterial])

  // Effect 2: Aggiorna colore LED CANCELLO (verde se fotocellula libera)
  useEffect(() => {
    if (sceneType !== 'esterno' || !ledCancelloRef.current) return
    
    const color = ledSerraVerde ? new Color(0x00ff00) : new Color(0xff0000)
    
    if (ledCancelloRef.current.material) {
      ledCancelloRef.current.material.color.copy(color)
      ledCancelloRef.current.material.emissive.copy(color)
    }
    
    console.log(`[CasaModel] 💡 LED CANCELLO: ${ledSerraVerde ? 'VERDE ✅' : 'ROSSO ❌'}`)
  }, [ledSerraVerde, sceneType])

  // Effect 3: Aggiorna colore LED PORTA INGRESSO (verde se porta aperta)
  useEffect(() => {
    if (sceneType !== 'esterno' || !ledPortaIngressoRef.current) return
    
    const color = ledPortaVerde ? new Color(0x00ff00) : new Color(0xff0000)
    
    if (ledPortaIngressoRef.current.material) {
      ledPortaIngressoRef.current.material.color.copy(color)
      ledPortaIngressoRef.current.material.emissive.copy(color)
    }
    
    console.log(`[CasaModel] 💡 LED PORTA INGRESSO: ${ledPortaVerde ? 'VERDE ✅ (aperta)' : 'ROSSO ❌ (chiusa)'}`)
  }, [ledPortaVerde, sceneType])
  
  // 🌿 Neon Serra Material (luce verde intensa per tutta la serra)
  useEffect(() => {
    if (sceneType !== 'cucina' || !scene) return // ✅ FIX: Serra è in CUCINA non esterno!
    scene.traverse((obj) => {
      if (obj.isMesh && obj.name && obj.name.includes(NEON_SERRA_UUID)) {
        neonSerraRef.current = obj
        obj.material = neonSpentoMaterial.clone() // Inizia spento
        console.log('[CasaModel] 🌿 Neon serra trovato:', obj.name)
      }
    })
  }, [scene, sceneType, neonSpentoMaterial])
  
  // Aggiorna materiale neon quando cambia lo stato acceso/spento
  useEffect(() => {
    if (sceneType !== 'cucina' || !neonSerraRef.current) return // ✅ FIX: Serra è in CUCINA non esterno!
    
    const newMaterial = neonSerraAcceso ? neonAccesoMaterial.clone() : neonSpentoMaterial.clone()
    neonSerraRef.current.material = newMaterial
    
    console.log(`[CasaModel] 🌿 Neon serra: ${neonSerraAcceso ? 'ACCESO ✅' : 'SPENTO ⚫'}`)
  }, [neonSerraAcceso, sceneType, neonAccesoMaterial, neonSpentoMaterial])
  
  //  Effect reattivo per toggle BookCase/Humano (tasto L)
  useEffect(() => {
    if (sceneType !== 'camera' || !scene) return
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[CasaModel] 📚 TASTO L - Aggiornamento visibilità BookCase/Humano')
    console.log('[CasaModel] 📊 bookcaseVisible:', bookcaseVisible)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let bookcaseCount = 0
    let humanoCount = 0
    let bookcaseMeshes = []
    let humanoMeshes = []
    
    scene.traverse((child) => {
      // UUID BookCase: 9A07B9EA-38FF-4E73-89EE-84CD36E1E96B
      if (child.name.includes('9A07B9EA-38FF-4E73-89EE-84CD36E1E96B')) {
        bookcaseCount++
        bookcaseMeshes.push(child.name)
        
        // 🔍 LOG DIAGNOSTICO: Posizione PRIMA del cambio
        const oldVisible = child.visible
        const oldPos = { x: child.position.x, y: child.position.y, z: child.position.z }
        
        child.visible = bookcaseVisible
        
        // 🔍 LOG DIAGNOSTICO: Verifica che NON sia cambiata la posizione!
        const newPos = { x: child.position.x, y: child.position.y, z: child.position.z }
        const posChanged = (oldPos.x !== newPos.x || oldPos.y !== newPos.y || oldPos.z !== newPos.z)
        
        console.log(`[CasaModel] 📚 BookCase #${bookcaseCount}:`, child.name)
        console.log(`  Visible: ${oldVisible} → ${child.visible}`)
        console.log(`  Position: (${oldPos.x.toFixed(3)}, ${oldPos.y.toFixed(3)}, ${oldPos.z.toFixed(3)})`)
        if (posChanged) {
          console.error('⚠️ POSIZIONE CAMBIATA! BUG TROVATO!', newPos)
        }
      }
      
      // UUID Humano: C96FE10C-EE14-4400-9D1D-7F6AC18B24
      if (child.name.includes('C96FE10C-EE14-4400-9D1D-7F6AC18B24')) {
        humanoCount++
        humanoMeshes.push(child.name)
        
        // 🔍 LOG DIAGNOSTICO: Posizione PRIMA del cambio
        const oldVisible = child.visible
        const oldPos = { x: child.position.x, y: child.position.y, z: child.position.z }
        
        child.visible = !bookcaseVisible
        
        // 🔍 LOG DIAGNOSTICO: Verifica che NON sia cambiata la posizione!
        const newPos = { x: child.position.x, y: child.position.y, z: child.position.z }
        const posChanged = (oldPos.x !== newPos.x || oldPos.y !== newPos.y || oldPos.z !== newPos.z)
        
        console.log(`[CasaModel] 🚶 Humano #${humanoCount}:`, child.name)
        console.log(`  Visible: ${oldVisible} → ${child.visible}`)
        console.log(`  Position: (${oldPos.x.toFixed(3)}, ${oldPos.y.toFixed(3)}, ${oldPos.z.toFixed(3)})`)
        if (posChanged) {
          console.error('⚠️ POSIZIONE CAMBIATA! BUG TROVATO!', newPos)
        }
      }
    })
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`[CasaModel] 📊 RIEPILOGO:`)
    console.log(`  BookCase trovati: ${bookcaseCount}`)
    console.log(`  Humano trovati: ${humanoCount}`)
    if (bookcaseCount === 0) console.error('❌ NESSUN BOOKCASE TROVATO! UUID errato?')
    if (humanoCount === 0) console.error('❌ NESSUN HUMANO TROVATO! UUID errato?')
    if (bookcaseMeshes.length > 0) console.log('  BookCase meshes:', bookcaseMeshes)
    if (humanoMeshes.length > 0) console.log('  Humano meshes:', humanoMeshes)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [bookcaseVisible, sceneType, scene])
  
  
  // 🔍 Effect per debug visivo boundingSphere espansa (tasto F)
  useEffect(() => {
    if (sceneType !== 'camera' || !grigliaHitboxRef.current) return
    
    const grigliaObj = grigliaHitboxRef.current
    
    if (showGrigliaHitbox) {
      // MOSTRA boundingSphere espansa: wireframe sphere + assi XYZ
      console.log('[CasaModel] 🔍 Attivo debug visivo boundingSphere griglia ventola')
      
      // Log info boundingSphere
      if (grigliaObj.geometry.boundingSphere) {
        const bs = grigliaObj.geometry.boundingSphere
        console.log(`[CasaModel] 📍 BoundingSphere: center=(${bs.center.x.toFixed(2)}, ${bs.center.y.toFixed(2)}, ${bs.center.z.toFixed(2)}), radius=${bs.radius.toFixed(3)}m`)
        console.log(`[CasaModel] 📍 Original radius: ${grigliaObj.userData.originalRadius?.toFixed(3)}m`)
      }
      
      // Crea sfera wireframe rossa per visualizzare il boundingSphere espanso
      if (!grigliaObj.userData.debugSphere) {
        const radius = grigliaObj.geometry.boundingSphere.radius
        const sphereGeom = new THREE.SphereGeometry(radius, 16, 16)
        const sphereMat = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.3,
          wireframe: true,
          side: THREE.DoubleSide
        })
        
        const debugSphere = new THREE.Mesh(sphereGeom, sphereMat)
        debugSphere.name = 'DEBUG_SPHERE_GRIGLIA'
        
        // Posiziona al centro del boundingSphere
        const center = grigliaObj.geometry.boundingSphere.center
        debugSphere.position.copy(center)
        
        grigliaObj.add(debugSphere)
        grigliaObj.userData.debugSphere = debugSphere
        
        console.log('[CasaModel] ✅ Sfera wireframe debug creata')
      }
      
      // Aggiungi assi XYZ
      if (!grigliaObj.userData.axesHelper) {
        const axesHelper = new THREE.AxesHelper(1.0) // 1 metro
        axesHelper.name = 'DEBUG_AXES_GRIGLIA'
        grigliaObj.add(axesHelper)
        grigliaObj.userData.axesHelper = axesHelper
        console.log('[CasaModel] ✅ Assi XYZ aggiunti')
      }
      
      console.log('[CasaModel] ✅ Debug visivo ATTIVATO - BoundingSphere visibile')
    } else {
      // NASCONDI debug visuals
      console.log('[CasaModel] 🔍 Disattivo debug visivo boundingSphere')
      
      // Rimuovi sfera debug
      if (grigliaObj.userData.debugSphere) {
        grigliaObj.remove(grigliaObj.userData.debugSphere)
        grigliaObj.userData.debugSphere.geometry.dispose()
        grigliaObj.userData.debugSphere.material.dispose()
        delete grigliaObj.userData.debugSphere
        console.log('[CasaModel] ❌ Sfera debug rimossa')
      }
      
      // Rimuovi assi
      if (grigliaObj.userData.axesHelper) {
        grigliaObj.remove(grigliaObj.userData.axesHelper)
        grigliaObj.userData.axesHelper.dispose()
        delete grigliaObj.userData.axesHelper
        console.log('[CasaModel] ❌ Assi XYZ rimossi')
      }
      
      console.log('[CasaModel] ✅ Debug visivo DISATTIVATO')
    }
  }, [showGrigliaHitbox, sceneType])

  // 🎯 FIX CORRETTO: Callback ref STABILE (senza dipendenze)
  // Fa SOLO assignment + trigger state. Setup logic va in useLayoutEffect
  const handleGroupMount = useCallback((node) => {
    console.log('[CasaModel] 🎯 handleGroupMount - node:', !!node)
    groupRef.current = node
    if (node) {  // ← SOLO quando monta, non quando smonta (node = null)!
      setGroupMounted(prev => !prev) // Toggle per triggerare useLayoutEffect
    }
  }, []) // ← NESSUNA dipendenza! Callback stabile

  // 🎯 Setup logic triggerato da groupMounted state + dipendenze reali
  useLayoutEffect(() => {
    if (!groupRef.current || !scene) {
      console.log('[CasaModel] ⏳ Setup skipped - groupRef or scene not ready')
      return
    }
    
    console.log('[CasaModel] 🚀 SETUP LOGIC EXECUTING - gruppo pronto!')

    // 0. Pulizia Camere
    scene.traverse(o => { if (o.isCamera && o.parent) o.parent.remove(o) })

    // 1. Scala e Centratura
    scene.scale.set(CASA_SCALE, CASA_SCALE, CASA_SCALE)
    scene.updateWorldMatrix(true, true)
    
    const box = new Box3().setFromObject(scene)
    const center = new Vector3(); box.getCenter(center)
    
    // TROVA IL PAVIMENTO DEL PIANO TERRA (non il minimo assoluto che potrebbe essere la cantina)
    let targetGroundY = box.min.y
    let mainFloorY = null
    
    scene.traverse(o => {
      if (o.isMesh && o.name) {
        const name = o.name.toLowerCase()
        
        // Cerca il pavimento/terreno principale (giardino per esterno, pavimenti per interno)
        let isMainGround = false
        
        if (sceneType === 'esterno') {
          // Per esterno: cerca giardino, prato, terreno
          isMainGround = /giardino|prato|grass|ground|terreno/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        } else {
          // Per scene interne: cerca pavimenti del piano terra (escludi cantina)
          isMainGround = /pattern|piano|pavimento|floor/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        }
        
        if (isMainGround) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
          const objBox = new Box3().setFromObject(o)
          const floorY = objBox.min.y
          
          // Prendi il pavimento più ALTO tra quelli trovati (piano terra/giardino, non cantina)
          if (mainFloorY === null || floorY > mainFloorY) {
            mainFloorY = floorY
            console.log(`[CasaModel] 🏠 ${sceneType === 'esterno' ? 'Giardino' : 'Piano terra'} trovato: "${o.name}" a Y=${floorY.toFixed(3)}`)
          }
        }
      }
    })
    
    if (mainFloorY !== null) {
      targetGroundY = mainFloorY
      console.log(`[CasaModel] ✅ Usando ${sceneType === 'esterno' ? 'giardino' : 'pavimento piano terra'} come riferimento: Y=${targetGroundY.toFixed(3)}`)
    } else {
      console.warn(`[CasaModel] ⚠️ Pavimento principale non trovato, uso min.y=${targetGroundY.toFixed(3)}`)
    }
    
    // ALZO TUTTO IL PIANO TERRA (giardino) invece di abbassare la cantina!
    const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0 // 0.6m per esterno (per ottenere Model Group Y = -0.517m), 2.0m per altre scene
    const actualOffset = modelYOffset !== null ? modelYOffset : PIANO_TERRA_HEIGHT
    groupRef.current.position.set(-center.x, -targetGroundY + actualOffset, -center.z)
    groupRef.current.updateWorldMatrix(true, true)
    
    console.log(`[CasaModel] 🏡 Piano terra alzato di ${actualOffset}m ${modelYOffset !== null ? '(CUSTOM DEBUG OFFSET)' : '(default)'} → cantina ora ${actualOffset}m più bassa!`)
    
    // 🔬 DIAGNOSTIC LOG - RUNTIME SETUP (Fase 3 del piano diagnostico)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[CasaModel] 🏠 CASAMODEL RUNTIME DEBUG')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🏗️ MODEL SETUP:')
    console.log('  CASA_SCALE:', CASA_SCALE)
    console.log('  sceneType:', sceneType)
    console.log('  PIANO_TERRA_HEIGHT:', actualOffset + 'm')
    console.log('  targetGroundY:', targetGroundY.toFixed(3) + 'm')
    
    console.log('\n📐 GROUP TRANSFORM:')
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
    
    // ✅ Log matrixWorld
    const matrixElements = groupRef.current.matrixWorld.elements
    console.log('\n🌍 GROUP MATRIX WORLD (4x4):')
    console.log('  Row 1:', matrixElements.slice(0, 4).map(n => n.toFixed(3)))
    console.log('  Row 2:', matrixElements.slice(4, 8).map(n => n.toFixed(3)))
    console.log('  Row 3:', matrixElements.slice(8, 12).map(n => n.toFixed(3)))
    console.log('  Row 4:', matrixElements.slice(12, 16).map(n => n.toFixed(3)))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 2. Variabili
    let gateEyeHeight = null
    const currentScene = sceneType.toLowerCase()
    const otherRooms = ['camera', 'bagno', 'soggiorno', 'cucina'].filter(r => r !== currentScene)
    
    // Liste per forzare il passaggio al controller
    const forcedCollidables = []
    const forcedGrounds = []

    // 3. Traverse Unico (Visibilità + Spawn + Raccolta Collisioni)
    scene.traverse((child) => {
      const name = child.name ? child.name.toLowerCase() : ''
      
      if (child.isMesh) {
        // 🔒 FORZA OGGETTI SPECIFICI COME COLLIDABILI (priorità massima)
        // Pattern che matchano TUTTE le istanze con queste parole chiave (anche con UUID)
        const mustBeCollidable = (
          /vetrata\s*cucina/i.test(child.name) ||
          /vetrata\s*soggiorno/i.test(child.name) ||
          /automobile/i.test(child.name) ||
          /mesh9\s*outershell\s*group2\s*group1\s*model/i.test(child.name) ||
          /^torri/i.test(child.name) ||
          /muro\s*esterno/i.test(child.name) ||
          /^ringhiera/i.test(child.name) ||
          /cancello/i.test(child.name) ||  // 🟢 SEMPLIFICATO: Cattura QUALSIASI cancello/anta
          /^cancelletto/i.test(child.name) ||
          child.name.includes('403E9B77-5C62-4454-A917-50CAD8C77FC4') ||  // 🪑 POLTRONA/HUMANO - RightShoulder (COLLIDABILE!)
          child.name.includes('04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA')     // 🌬️ GRIGLIA VENTOLA (INTERATTIVA!)
        )
        
        if (mustBeCollidable) {
          child.userData.collidable = true
          child.userData.forceCollidable = true
          console.log(`[CasaModel] 🔒 FORZA COLLIDABILE: ${child.name}`)
          
          // 🔧 FIX FANTASMA: DoubleSide per muri sottili e ringhiere
          // Questo garantisce che il raycaster rilevi il materiale da entrambi i lati
          // e calcoli correttamente la normale per la respinta
          if (child.material) {
            child.material.side = THREE.DoubleSide
            child.material.needsUpdate = true
          }
          
          // 🔧 FIX GEOMETRIA & SCALA NON UNIFORME
          // Se è un cancello o ringhiera, ricalcola BoundingBox e NORMALI
          // Le normali potrebbero essere distorte dalla scala non uniforme ([BVH] warning)
          if (/ringhiera|cancello/i.test(child.name)) {
            if (!child.geometry.boundingBox) {
              child.geometry.computeBoundingBox()
            }
            
            // 🟢 FIX CRITICO: Ricalcola normali per oggetti con scala non uniforme
            // Questo corregge la direzione della "respinta" quando il player colpisce il cancello
            child.geometry.computeVertexNormals()
            console.log(`[CasaModel] 🔧 Normali ricalcolate per: ${child.name}`)
          }
        }
        
        // ✅ ESCLUDI MODELLI UMANI dalle collisioni (player può attraversarli)
        if (/^Humano_/i.test(child.name)) {
          child.userData.collidable = false
          child.userData.decorative = true
          console.log(`[CasaModel] 🚶 Modello umano NON-collidabile: ${child.name}`)
          // Non aggiungerlo alle liste di collisione e continua
          child.castShadow = enableShadows
          child.receiveShadow = enableShadows
          return // Skip resto logica collision per questo mesh
        }
        
        // ✅ ESCLUDI MOBILE SOGGIORNO (attraversabile)
        if (/mobile\s*soggiorno/i.test(child.name)) {
          child.userData.collidable = false
          child.userData.decorative = true
          console.log(`[CasaModel] 🪑 Mobile soggiorno NON-collidabile: ${child.name}`)
          // Non aggiungerlo alle liste di collisione e continua
          child.castShadow = enableShadows
          child.receiveShadow = enableShadows
          return // Skip resto logica collision per questo mesh
        }
        
        // ✅ ESCLUDI MARKER SPAWN "INIZIO SCENA CUCINA", "INIZIO_CUCINA(UUID)" e "INIZIO_SOGGIORNO(UUID)"
        if (/^inizio[\s_].*cucina/i.test(child.name) || 
            child.name.includes('33AD9743-91C5-4AA4-BD50-C7B782334BAA')) {
          child.visible = false
          child.userData.collidable = false
          child.userData.spawnMarker = true
          console.log(`[CasaModel] 📍 Marker spawn nascosto: ${child.name}`)
          // Non aggiungerlo alle liste di collisione e continua
          return // Skip resto logica collision per questo mesh
        }
        
        // 🎯 ESPANDI BOUNDING SPHERE per facilitare il click su oggetti piccoli
        // Invece di creare hitbox separate, rendiamo l'oggetto originale "più grande" per il raycaster
        
        // 🌬️ GRIGLIA VENTOLA (UUID: 04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA)
        // HITBOX INVISIBILE per catturare click (boundingSphere NON funziona con R3F onClick!)
        if (child.name.includes('04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA')) {
          // 🔒 GUARD: Crea hitbox UNA SOLA VOLTA
          if (!child.userData.hasInvisibleHitbox) {
            console.log('[CasaModel] 🌬️ Trovata griglia ventola - creo HITBOX INVISIBILE:', child.name)
            
            // 🎯 FIX: Box MOLTO GRANDE (3m x 3m x 2m) e SPOSTATO AVANTI per coprire tutto
            const hitboxGeom = new THREE.BoxGeometry(3.0, 3.0, 2.0)
            const hitboxMat = new THREE.MeshBasicMaterial({ 
              visible: false,  // INVISIBILE!
              transparent: true,
              opacity: 0
            })
            
            const hitbox = new THREE.Mesh(hitboxGeom, hitboxMat)
            hitbox.name = 'HITBOX_GRIGLIA_VENTOLA'
            hitbox.userData.isHitbox = true
            hitbox.userData.targetUUID = '04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA'
            
            // 🚀 FIX CRITICO: Sposta hitbox MOLTO PIÙ AVANTI (2 metri!)
            // Così sarà DAVANTI a vetro serra e muri
            hitbox.position.copy(child.position)
            hitbox.position.z += 2.0 // 2 METRI davanti - DAVANTI A TUTTO!
            
            // Aggiungi al parent della griglia
            if (child.parent) {
              child.parent.add(hitbox)
              console.log('[CasaModel] ✅ Hitbox invisibile creata (3m x 3m x 2m, +2m avanti)')
            }
            
            child.userData.hasInvisibleHitbox = true
            child.userData.hitboxMesh = hitbox
          } else {
            console.log('[CasaModel] ⏭️ Griglia ventola già ha hitbox (skip re-mount)')
          }
          
          // 🔍 Salva ref per debug visivo (tasto F) - sempre
          grigliaHitboxRef.current = child
        }
        
        // 💡 LED VENTOLA (UUID: AEF53E75-6065-4383-9C2A-AB787BAE1516)
        if (child.name.includes('AEF53E75-6065-4383-9C2A-AB787BAE1516')) {
          // 🔒 GUARD: Espandi UNA SOLA VOLTA (protegge da StrictMode doppio mount)
          if (!child.userData.expandedHitbox) {
            console.log('[CasaModel] 💡 Trovato LED ventola - espando boundingSphere:', child.name)
            
            // Assicurati che geometry abbia boundingSphere
            if (!child.geometry.boundingSphere) {
              child.geometry.computeBoundingSphere()
            }
            
            // Salva raggio originale PRIMA di espandere
            const originalRadius = child.geometry.boundingSphere.radius
            child.userData.originalRadius = originalRadius
            
            // 🎯 LED molto piccolo → raggio GRANDE per facilitare click
            // Usa stesso raggio della griglia: 5.0 = 50m world-space
            child.geometry.boundingSphere.radius = 5.0
            
            // Flag userData per evitare espansioni multiple
            child.userData.expandedHitbox = true
            
            console.log(`[CasaModel] ✅ BoundingSphere LED espanso: ${originalRadius.toFixed(3)}m → ${child.geometry.boundingSphere.radius.toFixed(3)}m (FISSO world-space)`)
          } else {
            console.log(`[CasaModel] ⏭️ LED ventola già espanso (skip re-mount): ${child.geometry.boundingSphere.radius.toFixed(3)}m`)
          }
        }
        
        // 🪑 POLTRONA/HUMANO - RightShoulder (UUID: 403E9B77-5C62-4454-A917-50CAD8C77FC4)
        if (child.name.includes('403E9B77-5C62-4454-A917-50CAD8C77FC4')) {
          // 🔒 GUARD: Espandi UNA SOLA VOLTA (protegge da StrictMode doppio mount)
          if (!child.userData.expandedHitbox) {
            console.log('[CasaModel] 🪑 Trovata poltrona/humano - espando boundingSphere:', child.name)
            
            // Assicurati che geometry abbia boundingSphere
            if (!child.geometry.boundingSphere) {
              child.geometry.computeBoundingSphere()
            }
            
            // Salva raggio originale PRIMA di espandere
            const originalRadius = child.geometry.boundingSphere.radius
            child.userData.originalRadius = originalRadius
            
            // 🎯 FIX: Usa raggio FISSO in world-space invece di moltiplicare
            // Il modello è già scalato 10x, quindi 1.0 = 1 metro world-space (copre tutto humano)
            child.geometry.boundingSphere.radius = 1.0 // 1m world-space (copre tutto il corpo)
            
            // Flag userData per evitare espansioni multiple
            child.userData.expandedHitbox = true
            
            console.log(`[CasaModel] ✅ BoundingSphere espanso: ${originalRadius.toFixed(3)}m → ${child.geometry.boundingSphere.radius.toFixed(3)}m (FISSO world-space)`)
          } else {
            console.log(`[CasaModel] ⏭️ Poltrona già espansa (skip re-mount): ${child.geometry.boundingSphere.radius.toFixed(3)}m`)
          }
        }
        
        // 🛏️ MATERASSO - Matress_Cube_236 (UUID: EA4BDE19-A636-4DD9-B32E-C34BA0D37B14)
        if (child.name.includes('EA4BDE19-A636-4DD9-B32E-C34BA0D37B14')) {
          // 🔒 GUARD: Espandi UNA SOLA VOLTA (protegge da StrictMode doppio mount)
          if (!child.userData.expandedHitbox) {
            console.log('[CasaModel] 🛏️ Trovato materasso - espando boundingSphere:', child.name)
            
            // Assicurati che geometry abbia boundingSphere
            if (!child.geometry.boundingSphere) {
              child.geometry.computeBoundingSphere()
            }
            
            // Salva raggio originale PRIMA di espandere
            const originalRadius = child.geometry.boundingSphere.radius
            child.userData.originalRadius = originalRadius
            
            // 🎯 Materasso piatto e sottile → raggio GRANDE per facilitare click
            // 2.0m world-space (doppio della poltrona) per garantire hit facile
            child.geometry.boundingSphere.radius = 2.0 // 2m world-space (copre tutto il letto)
            
            // Flag userData per evitare espansioni multiple
            child.userData.expandedHitbox = true
            
            console.log(`[CasaModel] ✅ BoundingSphere materasso espanso: ${originalRadius.toFixed(3)}m → ${child.geometry.boundingSphere.radius.toFixed(3)}m (FISSO world-space)`)
          } else {
            console.log(`[CasaModel] ⏭️ Materasso già espanso (skip re-mount): ${child.geometry.boundingSphere.radius.toFixed(3)}m`)
          }
        }
        
        // Tagging Pavimenti (Regex Robustissima)
        if (/pattern|гольфстрим|piano|pavimento|floor|terra/i.test(name)) {
            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
            const size = child.geometry.boundingBox.getSize(new Vector3()).length()
            if (size > 1.0) { // Ignora oggetti piccoli
                child.userData.ground = true
                child.userData.collidable = true
                forcedGrounds.push(child)
            }
        }
        
        // Visibilità
        if (sceneType === 'esterno') {
            child.visible = true
            if (gateEyeHeight === null && name.includes('cancell')) {
                const b = new Box3().setFromObject(child); const c = new Vector3(); b.getCenter(c); gateEyeHeight = c.y
            }
        } else {
            // 🎯 FIX: ESCLUDI BookCase/Humano dalla logica generica!
            // La loro visibilità è gestita dall'effect dedicato (linee 262-334)
            const isBookCase = child.name.includes('9A07B9EA-38FF-4E73-89EE-84CD36E1E96B')
            const isHumano = child.name.includes('C96FE10C-EE14-4400-9D1D-7F6AC18B24')
            
            if (!isBookCase && !isHumano) {
                // Logica SOLO per oggetti normali (NON BookCase/Humano)
                let hide = otherRooms.some(r => name.includes(r))
                const struct = /muro|wall|porta|door|finestra|window|vetro|glass|infisso|pavimento|floor|soffitto|ceiling|tetto|roof|piano|terra|ringhiera|cantina|ingresso|maniglia|handle|pattern|body|гольфстрим/i.test(name)
                if (struct) hide = false
                child.visible = !hide
            }
            // BookCase/Humano: NON toccare child.visible qui!
            // L'effect dedicato li gestirà correttamente
            
            if (child.visible) {
                 if (child.raycast && child.raycast._bak) delete child.raycast
            } else {
                 // 🔑 FIX OGGETTI INVISIBILI: Escludi dalle collisioni
                 // Gli oggetti di altre stanze nascosti NON devono bloccare il movimento
                 child.userData.collidable = false
                 child.raycast = () => {}
            }
        }

        // Raccolta Collisioni e Ombre
        if (child.visible) {
            // ✅ SEMPLIFICATO: Tratta tutte le scene allo stesso modo
            // Se l'oggetto è visibile e non esplicitamente escluso → è collidabile
            // Questo elimina la whitelist rigida per l'esterno e garantisce che TUTTI i muri siano solidi
            if (child.userData.collidable !== false) {
                forcedCollidables.push(child)
                
                // Debug opzionale: log muri in esterno per verifica
                if (sceneType === 'esterno' && /muro|wall/i.test(child.name)) {
                    console.log(`[CasaModel] 🧱 Muro collidabile: ${child.name}`)
                }
            }
        }
        
        child.castShadow = enableShadows
        child.receiveShadow = enableShadows
      }
    })

    // 4. Invia al Parent SENZA BVH (verrà aggiunto dopo)
    const humanEyeHeight = 1.6
    const playerRootObj = scene.getObjectByName('PlayerRoot') || null
    
    // 🎯 RACE CONDITION FIX - Double requestAnimationFrame
    // Garantisce che Three.js abbia applicato tutte le trasformazioni
    // prima di segnalare isReady. Questo previene che il player spawni
    // prima che il mondo sia completamente stabile.
    // 
    // ⚠️ WORKAROUND TIMING: Non è logica di business, solo sincronizzazione
    // del lifecycle React + Three.js. Necessario per consistenza DEV/PROD.
    if (modelRef) {
      console.log(`[CasaModel] 🔄 Preparazione liste: ${forcedCollidables.length} collision, ${forcedGrounds.length} grounds`)
      
      // Double rAF: aspetta 2 frame per garantire che Three.js finisca
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('[CasaModel] 🎯 Double-rAF completato - mondo garantito stabile')
          
          modelRef({ 
            current: groupRef.current, 
            gateEyeHeight,
            sceneType,
            // QUI LA MAGIA: Passiamo le liste già pronte
            forcedCollidables,
            forcedGrounds,
            eyeHeight: humanEyeHeight,  // Nuovo sistema
            playerRoot: playerRootObj,   // Nuovo sistema (può essere null inizialmente)
            bvhData: null,                // BVH sarà costruito in un effect separato
            isReady: true                 // ✅ ORA GARANTITO: Mondo stabile, pronto per spawn
          })
          
          console.log('[CasaModel] ✅ Mondo READY - trasformazioni completate, spawn può procedere')
          
          // 🚀 EVENT-DRIVEN: Notifica una sola volta che il mondo è pronto
          console.log('[CasaModel] 🔔 Calling onReady callback...', { hasOnReady: !!onReady })
          onReady?.()
          console.log('[CasaModel] ✅ onReady callback invoked')
        })
      })
    }

    // 6. Teleport e Snap - SOLO alla prima mount e SOLO se non abbiamo coordinate catturate
    if (disableTeleport) {
      console.log('🚫 [CasaModel] Teleport DISABILITATO - usando coordinate catturate da useFPSControls')
    } else if (!hasInitiallyTeleported.current) {
      console.log('[CasaModel] ⚠️ TELEPORT AUTOMATICO DISABILITATO - Le scene gestiscono spawn via initialPosition')
      hasInitiallyTeleported.current = true
    } else {
      console.log('[CasaModel] ⚠️ useLayoutEffect rieseguito ma teleport SKIPPATO (guard attivo)')
    }

    // 🔴 FIX: NON distruggere il BVH qui! 
    // Il cleanup viene eseguito a ogni re-render, distruggendo il BVH mentre il player cammina
    // Il BVH deve rimanere attivo per tutta la durata della scena
    // (verrà garbage-collected automaticamente quando il componente viene smontato)

  }, [groupMounted, scene, enableShadows, sceneType, modelYOffset, disableTeleport, modelRef, onReady])

  // 🔧 EFFECT SEPARATO per BUILD BVH - Garantisce esecuzione anche in produzione
  // Questo effect si esegue DOPO che groupRef.current è stato assegnato
  useEffect(() => {
    // Skip se già costruito o se groupRef non è pronto
    if (bvhBuiltRef.current || !groupRef.current || !scene) {
      return
    }
    
    console.log('[CasaModel] 🔨 Building BVH (separate effect)...')
    
    try {
      const bvhData = createStaticBVH(groupRef.current, { verbose: true })
      bvhDataRef.current = bvhData
      bvhBuiltRef.current = true
      
      console.log(`[CasaModel] ✅ BVH ready: ${bvhData.triangleCount} triangles in ${bvhData.buildTime.toFixed(2)}ms`)
      
      // Aggiorna modelRef con il BVH appena costruito
      if (modelRef && modelRef.current) {
        modelRef.current.bvhData = bvhData
        console.log('[CasaModel] 🔄 BVH injected into modelRef')
      }
      
      // 🍳 FIX PENTOLA - geometry.center() OBBLIGATORIO!
      if (sceneType === 'cucina') {
        setTimeout(() => {
          scene.traverse((child) => {
            if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
              
        console.log("🍳 FIX PENTOLA - Applicando geometry.center()");

        // 🍳 FIX STRUTTURALE PENTOLA - UNA SOLA VOLTA
        if (child.geometry && !child.userData.geometryScaled) {
          console.log('🍳 FIX PENTOLA - geometry.scale() applicato');

          // 1️⃣ SCALA VERTICI REALI (da ~10m a ~25cm)
          const GEOM_SCALE_FIX = 0.025;
          child.geometry.scale(GEOM_SCALE_FIX, GEOM_SCALE_FIX, GEOM_SCALE_FIX);

          // 2️⃣ INVALIDA CACHE
          child.geometry.boundingBox = null;
          child.geometry.boundingSphere = null;

          // 3️⃣ CENTER PIVOT
          child.geometry.center();

          // 4️⃣ RICALCOLA
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();

          // 5️⃣ GUARD (mai più rieseguito)
          child.userData.geometryScaled = true;

          // 🔍 LOG DI VERIFICA
          const size = child.geometry.boundingBox.getSize(new THREE.Vector3());
          console.log(
            `📦 BBOX PENTOLA CORRETTA: ${size.x.toFixed(3)}m x ${size.y.toFixed(3)}m x ${size.z.toFixed(3)}m`
          );
        }

        // 2️⃣ SCALA VISIVA — VALORE REALE DA PENTOLA
        // 0.035 × CASA_SCALE(10) ≈ 35cm → perfetta
        child.scale.set(0.035, 0.035, 0.035)

        // 3️⃣ POSIZIONE — sopra i fornelli
        const TARGET_POS = new THREE.Vector3(-1.02, -0.11, -1.41)
        if (child.parent) {
          child.parent.worldToLocal(TARGET_POS)
        }
        child.position.copy(TARGET_POS)

        // 1️⃣ ORIENTAMENTO — PENTOLA IN PIEDI
        // SweetHome3D esporta spesso Z-up → convertiamo a Y-up
        child.rotation.set(
          0,              // X
          0,              // Y
          0               // Z
        )

        // ⚠️ Se così fosse ancora storta, usa QUESTO al posto sopra:
        // child.rotation.set(-Math.PI / 2, 0, 0)

        // 4️⃣ SICUREZZA
        child.updateMatrix()
        child.updateMatrixWorld(true)

        // 🚫 PENTOLA INVISIBILE (commissionato da utente)
        child.visible = false

        console.log('🍳 PENTOLA CORRETTA (INVISIBILE):', {
          scale: child.scale,
          rotation: child.rotation
        })
            }
          });
        }, 1500);
      }
      
    } catch (error) {
      console.error('[CasaModel] ❌ BVH build failed:', error)
    }
    
    // Cleanup quando il componente smonta
    return () => {
      if (bvhDataRef.current) {
        console.log('[CasaModel] 🗑️ Disposing BVH on unmount')
        disposeBVH(bvhDataRef.current)
        bvhDataRef.current = null
        bvhBuiltRef.current = false
      }
    }
  }, [groupRef.current, scene, modelRef, sceneType])

  // Separate effect to update only Y offset when modelYOffset changes (without re-running full setup)
  useEffect(() => {
    // Skip on first mount - let useLayoutEffect handle it
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    
    if (!scene || !groupRef.current || modelYOffset === null) return
    
    // Update world matrices to get current state
    scene.updateWorldMatrix(true, true)
    const box = new Box3().setFromObject(scene)
    const center = new Vector3()
    box.getCenter(center)
    
    // Find main floor Y (same logic as in useLayoutEffect)
    let targetGroundY = box.min.y
    let mainFloorY = null
    
    scene.traverse(o => {
      if (o.isMesh && o.name) {
        const name = o.name.toLowerCase()
        let isMainGround = false
        
        if (sceneType === 'esterno') {
          isMainGround = /giardino|prato|grass|ground|terreno/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        } else {
          isMainGround = /pattern|гольфстрим|piano|pavimento|floor/i.test(name) && !/cantina|basement|seminterrato/i.test(name)
        }
        
        if (isMainGround) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
          const objBox = new Box3().setFromObject(o)
          const floorY = objBox.min.y
          if (mainFloorY === null || floorY > mainFloorY) {
            mainFloorY = floorY
          }
        }
      }
    })
    
    if (mainFloorY !== null) {
      targetGroundY = mainFloorY
    }
    
    // Update only Y position with the custom offset
    groupRef.current.position.y = -targetGroundY + modelYOffset
    groupRef.current.updateWorldMatrix(true, true)
    
    console.log(`[CasaModel] 🔧 Updated Y offset to ${modelYOffset}m (custom debug mode)`)
  }, [modelYOffset, scene, sceneType])

  return (
    <group 
      ref={handleGroupMount}
      onClick={(e) => {
        // 🛋️ FIX PRIORITÀ CLICK: Cerca oggetti interattivi NEL PERCORSO prima del pavimento
        // e.intersections contiene TUTTI gli oggetti colpiti dal raycaster, ordinati per distanza
        let targetObject = e.object // Default: primo oggetto colpito
        
        // Cerca se c'è un oggetto interattivo (non-pavimento) più vicino
        if (e.intersections && e.intersections.length > 1) {
          // Filtra oggetti che NON sono pavimento o terreno
          const nonFloorObjects = e.intersections.filter(intersection => {
            const name = intersection.object.name ? intersection.object.name.toLowerCase() : ''
            
            // 🎯 PRIORITÀ ASSOLUTA 1: HITBOX INVISIBILI (prefix "hitbox_")
            const isHitbox = name.toLowerCase().startsWith('hitbox_') || intersection.object.userData.isHitbox === true
            if (isHitbox) {
              console.log('🎯 [CasaModel] HITBOX rilevata con priorità massima:', intersection.object.name)
              return true
            }
            
            // ✅ PRIORITÀ MASSIMA 2: UUID enigmi camera da letto (SEMPRE cliccabili!)
            const isCameraPuzzle = (
              name.includes('ea4bde19-a636-4dd9-b32e-c34ba0d37b14') ||  // Materasso
              name.includes('403e9b77-5c62-4454-a917-50cad8c77fc4') ||  // Poltrona/Humano
              name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea') ||  // Griglia ventola
              name.includes('aef53e75-6065-4383-9c2a-ab787bae1516') ||  // LED VENTOLA (priorità sul muro!)
              name.includes('b1e6a326-9fef-48e1-9368-60bc0465b81d')     // Vetro porta finestra
            )
            
            if (isCameraPuzzle) return true
            
            // 🚫 ESCLUDI MURO ventola (UUID: 65A21DB2-50E6-4962-88E5-CF692DA592B1)
            // Il muro NON deve essere cliccabile come "oggetto prioritario"
            const isMuroVentola = name.includes('65a21db2-50e6-4962-88e5-cf692da592b1')
            if (isMuroVentola) return false
            
            // 🚫 ESCLUDI MURO LETTO (UUID: 15C95788-9BE1-47FC-8DA1-6EAB09E37661)
            // Il muro della camera NON deve essere cliccabile
            const isMuroLetto = name.includes('15c95788-9be1-47fc-8da1-6eab09e37661')
            if (isMuroLetto) return false
            
            // 🚫 ESCLUDI MURI CASA ESTERNO (UUID: 0C7CCA2A-4A69-4B76-9AE3-89F5D55BD188)
            // I muri esterni NON devono essere cliccabili
            const isMuriEsterno = name.includes('0c7cca2a-4a69-4b76-9ae3-89f5d55bd188')
            if (isMuriEsterno) return false
            
            // 🚫 ESCLUDI HUMANO (UUID: C96FE10C-EE14-4400-9D1D-7F6AC18B24)
            // ⚠️ FIX: UUID corretto senza "D4" extra alla fine
            // Il modello umano NON deve essere cliccabile (solo visibile/invisibile con tasto L)
            const isHumano = name.includes('c96fe10c-ee14-4400-9d1d-7f6ac18b24')
            if (isHumano) return false
            
            // 🚫 ESCLUDI PIANO CASA CAMERA (UUID: 3EC149F1-35E6-4A43-AAC7-3AF8E8BA76D6)
            // Il pavimento della camera NON deve essere cliccabile
            const isPianoCasaCamera = name.includes('3ec149f1-35e6-4a43-aac7-3af8e8ba76d6')
            if (isPianoCasaCamera) return false
            
            // 🚫 ESCLUDI VETRATA LETTO (UUID: 80B9938B-EB6B-4F72-A13B-93376DDEE4C3)
            // La vetrata/finestra NON deve essere cliccabile
            const isVetrataLetto = name.includes('80b9938b-eb6b-4f72-a13b-93376ddee4c3')
            if (isVetrataLetto) return false
            
            // 🚫 ESCLUDI VETRATA SOGGIORNO (UUID: B1F11AAE-668A-4C60-8AD6-E6399FE50F6B)
            // La vetrata del soggiorno NON deve essere cliccabile
            const isVetrataSoggiorno = name.includes('b1f11aae-668a-4c60-8ad6-e6399fe50f6b')
            if (isVetrataSoggiorno) return false
            
            // 🚫 ESCLUDI CANTINA (UUID: 5E3A57F4-13D1-45E2-87EC-2024707AA185)
            // La cantina blocca i click sul materasso - deve essere ignorata
            const isCantina = name.includes('5e3a57f4-13d1-45e2-87ec-2024707aa185')
            if (isCantina) return false
            
            // Escludi pavimenti, pattern generici, e terreno esterno
            return !(/piano|pattern|floor|pavimento|гольфстрим|terra/i.test(name))
          })
          
          if (nonFloorObjects.length > 0) {
            // Usa il primo oggetto NON-pavimento più vicino
            targetObject = nonFloorObjects[0].object
            console.log('🛋️ [CasaModel] Trovato oggetto interattivo prioritario:', targetObject.name)
          }
        }
        
        console.log('🖱️ [CasaModel] Click su mesh:', targetObject.name, 'sceneType:', sceneType)
        e.stopPropagation(); 
        // ✅ FIX: Passa SOLO IL NOME (stringa) invece dell'oggetto intero
        onObjectClick && onObjectClick(targetObject.name) 
      }}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/casa_compressed.glb', true)