// usePositionPicker.js
// Hook per selezionare un punto 3D nella scena tramite click del mouse

import { useRef, useEffect, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook per catturare coordinate 3D da un click nella scena
 * Utile per selezionare destinazioni in animazioni di posizione
 * 
 * @param {boolean} enabled - Se true, abilita il raycasting per il pick
 * @param {Function} onPositionPicked - Callback chiamato con le coordinate Vector3 del punto cliccato
 * @param {Function} onCancel - Callback chiamato quando l'utente annulla (ESC)
 * @returns {null}
 */
export function usePositionPicker(enabled, onPositionPicked, onCancel) {
  const { camera, gl, scene } = useThree()
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  // Handler per il click del mouse
  const handleClick = useCallback((event) => {
    if (!enabled) return

    // Ignora click su elementi UI (es: pannelli React)
    if (event.target.tagName !== 'CANVAS') {
      console.log('[usePositionPicker] Click ignorato - non su canvas')
      return
    }

    // Calcola posizione normalizzata del mouse (-1 a +1)
    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Setup raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, camera)

    // Intersezione con tutti gli oggetti della scena
    const intersects = raycasterRef.current.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      console.log(`[usePositionPicker] 🎯 Trovate ${intersects.length} intersezioni`)
      
      // === FILTRI DI VALIDAZIONE ===
      const INVALID_NAMES = ['ground_plane', 'GroundPlane', 'OuterWall']
      const MAX_DISTANCE = 5.0
      
      // Filtra intersezioni valide
      const validIntersects = intersects.filter(hit => {
        const name = hit.object.name || 'Unnamed'
        const isInvalid = INVALID_NAMES.some(invalid => 
          name.toLowerCase().includes(invalid.toLowerCase())
        )
        const tooFar = hit.distance > MAX_DISTANCE
        
        return !isInvalid && !tooFar
      })
      
      if (validIntersects.length === 0) {
        console.warn('⚠️ [usePositionPicker] Nessuna intersezione valida trovata')
        return
      }
      
      // Log tutte le intersezioni valide per debug
      console.log('[usePositionPicker] Intersezioni valide:')
      validIntersects.slice(0, 5).forEach((hit, i) => {
        console.log(`  ${i + 1}. ${hit.object.name || 'Unnamed'} - Y: ${hit.point.y.toFixed(3)}, Dist: ${hit.distance.toFixed(2)}m`)
      })
      
      // === FIX: SCEGLI Y PIÙ ALTO PER SUPERFICI COMPLESSE ===
      // Se clicchi su un oggetto complesso (es. fornelli), prendi il punto più alto
      let finalHit = validIntersects[0]
      const firstObjectName = finalHit.object.name || ''
      
      // Se il primo oggetto fa parte di un gruppo (es. Corps_32_*), cerca tutti gli oggetti dello stesso gruppo
      // e prendi quello con Y più alto
      if (firstObjectName.includes('Corps_32')) {
        console.log('[usePositionPicker] 🔥 Rilevati FORNELLI - cerco superficie superiore...')
        
        // Filtra solo gli oggetti dello stesso gruppo (Corps_32_*)
        const sameGroupHits = validIntersects.filter(hit => 
          (hit.object.name || '').includes('Corps_32')
        )
        
        console.log(`[usePositionPicker] Trovati ${sameGroupHits.length} punti sui fornelli`)
        
        // Prendi quello con Y più alto (= superficie superiore)
        finalHit = sameGroupHits.reduce((highest, current) => {
          return current.point.y > highest.point.y ? current : highest
        })
        
        console.log(`[usePositionPicker] ✅ Selezionato punto più alto: Y=${finalHit.point.y.toFixed(3)}`)
      }
      
      const worldPosition = finalHit.point.clone()
      const objectName = finalHit.object.name || 'Unnamed'
      const distance = finalHit.distance
      
      // === DESTINAZIONE VALIDA ===
      console.log('[usePositionPicker] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[usePositionPicker] ✅ POSIZIONE FINALE SELEZIONATA:')
      console.log('[usePositionPicker] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`[usePositionPicker]    X: ${worldPosition.x.toFixed(3)}`)
      console.log(`[usePositionPicker]    Y: ${worldPosition.y.toFixed(3)}`)
      console.log(`[usePositionPicker]    Z: ${worldPosition.z.toFixed(3)}`)
      console.log(`[usePositionPicker]    Oggetto: "${objectName}"`)
      console.log(`[usePositionPicker]    Distanza: ${distance.toFixed(2)}m`)
      console.log('[usePositionPicker] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Notifica il componente parent
      if (onPositionPicked) {
        onPositionPicked(worldPosition)
      }
    } else {
      console.log('[usePositionPicker] ⚠️ Nessuna intersezione trovata')
    }
  }, [enabled, camera, gl, scene, onPositionPicked])

  // Handler per ESC (annulla pick mode)
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return
    
    if (event.key === 'Escape') {
      console.log('[usePositionPicker] Annullato con ESC')
      if (onCancel) {
        onCancel()
      }
    }
  }, [enabled, onCancel])

  // Aggiungi/rimuovi event listeners
  useEffect(() => {
    if (!enabled) return

    const canvas = gl.domElement
    
    canvas.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)

    // Cambia cursore per indicare che si è in pick mode
    canvas.style.cursor = 'crosshair'

    console.log('[usePositionPicker] 🎯 Pick mode attivo - Clicca su un punto nella scena')

    return () => {
      canvas.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
      canvas.style.cursor = 'default'
      console.log('[usePositionPicker] Pick mode disattivato')
    }
  }, [enabled, gl.domElement]) // FIX: Rimosso handleClick e handleKeyDown per evitare loop

  return null
}

export default usePositionPicker
