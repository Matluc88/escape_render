// useObjectSelection.js
// Hook per gestire la selezione di oggetti 3D nella scena con click del mouse

import { useState, useCallback, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hook per la selezione di oggetti 3D con raycasting
 * @param {Object} options - Opzioni di configurazione
 * @param {boolean} options.enabled - Abilita/disabilita la selezione (default: true)
 * @param {Array<THREE.Object3D>} options.selectableObjects - Lista di oggetti selezionabili (opzionale)
 * @param {Function} options.onSelect - Callback chiamato quando un oggetto viene selezionato
 * @param {Function} options.onDeselect - Callback chiamato quando la selezione viene rimossa
 * @returns {Object} { selectedObject, selectObject, deselectObject, isSelected }
 */
export function useObjectSelection(options = {}) {
  const {
    enabled = true,
    selectableObjects = null,
    onSelect = null,
    onDeselect = null
  } = options

  const { scene, camera, gl } = useThree()
  const [selectedObject, setSelectedObject] = useState(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  // Funzione per selezionare un oggetto
  const selectObject = useCallback((object) => {
    if (!object) return

    console.log('[useObjectSelection] Oggetto selezionato:', object.name)
    setSelectedObject(object)
    
    if (onSelect) {
      onSelect(object)
    }
  }, [onSelect])

  // Funzione per deselezionare
  const deselectObject = useCallback(() => {
    console.log('[useObjectSelection] Deselezione')
    setSelectedObject(null)
    
    if (onDeselect) {
      onDeselect()
    }
  }, [onDeselect])

  // Check se un oggetto è selezionato
  const isSelected = useCallback((object) => {
    return selectedObject && selectedObject.uuid === object.uuid
  }, [selectedObject])

  // Handler per il click del mouse
  const handleClick = useCallback((event) => {
    if (!enabled) return

    // Ignora click se sono su UI overlay (es: panel React)
    if (event.target.tagName !== 'CANVAS') {
      return
    }

    // Calcola posizione normalizzata del mouse (-1 a +1)
    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Setup raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, camera)

    // Determina gli oggetti da testare
    const objectsToTest = selectableObjects || scene.children

    // Intersezione con oggetti (recursive = true per attraversare la gerarchia)
    const intersects = raycasterRef.current.intersectObjects(objectsToTest, true)

    if (intersects.length > 0) {
      // Prendi il primo oggetto intersecato
      let hitObject = intersects[0].object

      // Risali la gerarchia per trovare un oggetto con nome significativo
      // (spesso i mesh sono dentro Group senza nome)
      while (hitObject.parent && !hitObject.name && hitObject.parent !== scene) {
        hitObject = hitObject.parent
      }

      // Se l'oggetto è già selezionato, deseleziona
      if (selectedObject && selectedObject.uuid === hitObject.uuid) {
        deselectObject()
      } else {
        selectObject(hitObject)
      }
    } else {
      // Click su sfondo → deseleziona
      deselectObject()
    }
  }, [enabled, scene, camera, gl, selectableObjects, selectedObject, selectObject, deselectObject])

  // Aggiungi event listener per il click
  useEffect(() => {
    if (!enabled) return

    const canvas = gl.domElement
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('click', handleClick)
    }
  }, [enabled, gl, handleClick])

  // Funzione per ottenere info sull'oggetto selezionato
  const getSelectedObjectInfo = useCallback(() => {
    if (!selectedObject) return null

    const box = new THREE.Box3().setFromObject(selectedObject)
    const size = new THREE.Vector3()
    box.getSize(size)
    
    const center = new THREE.Vector3()
    box.getCenter(center)

    const worldPosition = new THREE.Vector3()
    selectedObject.getWorldPosition(worldPosition)

    return {
      name: selectedObject.name || 'Unnamed Object',
      uuid: selectedObject.uuid,
      type: selectedObject.type,
      position: worldPosition,
      boundingBox: {
        min: box.min.clone(),
        max: box.max.clone(),
        center: center,
        size: size
      }
    }
  }, [selectedObject])

  return {
    selectedObject,
    selectObject,
    deselectObject,
    isSelected,
    getSelectedObjectInfo
  }
}

export default useObjectSelection
