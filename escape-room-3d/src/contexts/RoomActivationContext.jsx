import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCapturedPosition } from '../utils/cameraPositioning'
import * as THREE from 'three'

const RoomActivationContext = createContext(null)

export const useRoomActivation = () => {
  const context = useContext(RoomActivationContext)
  if (!context) {
    throw new Error('useRoomActivation must be used within RoomActivationProvider')
  }
  return context
}

export const RoomActivationProvider = ({ children }) => {
  const [activeRoom, setActiveRoom] = useState(null)
  const [roomSpawns, setRoomSpawns] = useState({})
  const [isReady, setIsReady] = useState(false)

  // Carica spawn positions per tutte le stanze dal DB
  useEffect(() => {
    const loadAllSpawns = async () => {
      console.log('[RoomActivation] 🔄 Caricamento spawn positions da DB...')
      
      const rooms = ['esterno', 'cucina', 'soggiorno', 'bagno', 'camera']
      const spawns = {}
      
      for (const room of rooms) {
        try {
          const spawn = await getCapturedPosition(room)
          if (spawn && spawn.position) {
            spawns[room] = {
              x: spawn.position.x,
              y: spawn.position.y,
              z: spawn.position.z,
              yaw: spawn.yaw
            }
            console.log(`[RoomActivation] ✅ Spawn caricato per ${room}:`, spawns[room])
          } else {
            console.warn(`[RoomActivation] ⚠️ Nessuno spawn trovato per ${room}`)
          }
        } catch (error) {
          console.error(`[RoomActivation] ❌ Errore caricamento spawn ${room}:`, error)
        }
      }
      
      setRoomSpawns(spawns)
      setIsReady(true)
      console.log('[RoomActivation] ✅ Tutti gli spawn caricati:', spawns)
    }
    
    loadAllSpawns()
  }, [])

  // Funzione per verificare se player è dentro il trigger volume di una stanza
  const checkPlayerInRoom = useCallback((playerPosition, room) => {
    const spawn = roomSpawns[room]
    if (!spawn) return false
    
    // Trigger volume: Box 5x5x5 metri centrato sullo spawn
    const TRIGGER_RADIUS = 2.5 // 5m totali (2.5m in ogni direzione)
    
    const dx = Math.abs(playerPosition.x - spawn.x)
    const dy = Math.abs(playerPosition.y - spawn.y)
    const dz = Math.abs(playerPosition.z - spawn.z)
    
    return dx <= TRIGGER_RADIUS && dy <= TRIGGER_RADIUS && dz <= TRIGGER_RADIUS
  }, [roomSpawns])

  // Funzione da chiamare ogni frame per aggiornare activeRoom
  const updatePlayerPosition = useCallback((playerPosition) => {
    if (!isReady) return
    
    // Controlla tutte le stanze in ordine di priorità
    const rooms = ['esterno', 'cucina', 'soggiorno', 'bagno', 'camera']
    
    for (const room of rooms) {
      if (checkPlayerInRoom(playerPosition, room)) {
        if (activeRoom !== room) {
          console.log(`[RoomActivation] 🚪 Player entrato in: ${room}`)
          setActiveRoom(room)
        }
        return // Stop al primo match
      }
    }
    
    // Se non è in nessuna stanza, resetta
    if (activeRoom !== null) {
      console.log(`[RoomActivation] 🚶 Player uscito da: ${activeRoom}`)
      setActiveRoom(null)
    }
  }, [isReady, activeRoom, checkPlayerInRoom])

  const value = {
    activeRoom,
    roomSpawns,
    isReady,
    updatePlayerPosition,
    setActiveRoom // Per debug/override manuale
  }

  return (
    <RoomActivationContext.Provider value={value}>
      {children}
    </RoomActivationContext.Provider>
  )
}