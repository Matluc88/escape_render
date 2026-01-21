import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCapturedPosition, getCapturedPositionSync } from './cameraPositioning'
import * as api from './api'

// Mock dell'API
vi.mock('./api', () => ({
  fetchSpawnPosition: vi.fn()
}))

describe('Camera Positioning - Coordinate Spawn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Coordinate Database (Docker) - REFERENCE', () => {
    /**
     * Queste sono le coordinate UFFICIALI dal database (002_add_spawn_data.py)
     * Devono essere identiche a quelle restituite dall'API in produzione
     */
    const DATABASE_COORDINATES = {
      cucina: {
        position: { x: -0.98, y: 0, z: 2.12 },
        yaw: -0.8392  // -48.08° (valore corretto finale 16/12/2025)
      },
      bagno: {
        position: { x: 1.32, y: 0, z: 2.65 },
        yaw: 0.4684
      },
      camera: {
        position: { x: -0.24, y: 0, z: 1.37 },
        yaw: 0.32
      },
      soggiorno: {
        position: { x: 0.54, y: 0, z: 1.36 },
        yaw: 2.0884
      }
    }

    it('Kitchen - verifica coordinate database', async () => {
      api.fetchSpawnPosition.mockResolvedValue(DATABASE_COORDINATES.cucina)
      
      const result = await getCapturedPosition('cucina')
      
      expect(result).toEqual(DATABASE_COORDINATES.cucina)
      expect(result.position.x).toBe(-0.98)
      expect(result.position.y).toBe(0)
      expect(result.position.z).toBe(2.12)
      expect(result.yaw).toBe(-0.8392)
    })

    it('Bathroom - verifica coordinate database', async () => {
      api.fetchSpawnPosition.mockResolvedValue(DATABASE_COORDINATES.bagno)
      
      const result = await getCapturedPosition('bagno')
      
      expect(result).toEqual(DATABASE_COORDINATES.bagno)
      expect(result.position.x).toBe(1.32)
      expect(result.position.y).toBe(0)
      expect(result.position.z).toBe(2.65)
      expect(result.yaw).toBe(0.4684)
    })

    it('Bedroom - verifica coordinate database', async () => {
      api.fetchSpawnPosition.mockResolvedValue(DATABASE_COORDINATES.camera)
      
      const result = await getCapturedPosition('camera')
      
      expect(result).toEqual(DATABASE_COORDINATES.camera)
      expect(result.position.x).toBe(-0.24)
      expect(result.position.y).toBe(0)
      expect(result.position.z).toBe(1.37)
      expect(result.yaw).toBe(0.32)
    })

    it('Living Room - verifica coordinate database', async () => {
      api.fetchSpawnPosition.mockResolvedValue(DATABASE_COORDINATES.soggiorno)
      
      const result = await getCapturedPosition('soggiorno')
      
      expect(result).toEqual(DATABASE_COORDINATES.soggiorno)
      expect(result.position.x).toBe(0.54)
      expect(result.position.y).toBe(0)
      expect(result.position.z).toBe(1.36)
      expect(result.yaw).toBe(2.0884)
    })
  })

  describe('Fallback Coordinates - quando API non disponibile', () => {
    it('Kitchen - fallback deve essere identico a database', async () => {
      // Simula API non disponibile
      api.fetchSpawnPosition.mockRejectedValue(new Error('API not available'))
      
      const result = await getCapturedPosition('cucina')
      
      // Verifica che fallback sia identico al database
      expect(result.position.x).toBe(-0.98)
      expect(result.position.z).toBe(2.12)
      expect(result.yaw).toBe(-0.8392)
    })

    it('Bathroom - fallback deve essere identico a database', async () => {
      api.fetchSpawnPosition.mockRejectedValue(new Error('API not available'))
      
      const result = await getCapturedPosition('bagno')
      
      expect(result.position.x).toBe(1.32)
      expect(result.position.z).toBe(2.65)
      expect(result.yaw).toBe(0.4684)
    })

    it('Bedroom - fallback deve essere identico a database', async () => {
      api.fetchSpawnPosition.mockRejectedValue(new Error('API not available'))
      
      const result = await getCapturedPosition('camera')
      
      expect(result.position.x).toBe(-0.24)
      expect(result.position.z).toBe(1.37)
      expect(result.yaw).toBe(0.32)
    })

    it('Living Room - fallback deve essere identico a database', async () => {
      api.fetchSpawnPosition.mockRejectedValue(new Error('API not available'))
      
      const result = await getCapturedPosition('soggiorno')
      
      expect(result.position.x).toBe(0.54)
      expect(result.position.z).toBe(1.36)
      expect(result.yaw).toBe(2.0884)
    })
  })

  describe('Sync Function - versione sincrona', () => {
    it('deve restituire le stesse coordinate del fallback async', () => {
      const rooms = ['cucina', 'bagno', 'camera', 'soggiorno']
      
      rooms.forEach(room => {
        const sync = getCapturedPositionSync(room)
        expect(sync).toBeTruthy()
        expect(sync.position).toBeDefined()
        expect(sync.yaw).toBeDefined()
      })
    })

    it('Kitchen sync - deve avere coordinate database', () => {
      const result = getCapturedPositionSync('cucina')
      
      expect(result.position.x).toBe(-0.98)
      expect(result.position.z).toBe(2.12)
      expect(result.yaw).toBe(-0.8392)
    })
  })

  describe('Verifica NO trasformazioni', () => {
    it('deve passare coordinate senza modifiche', async () => {
      const originalCoords = {
      position: { x: -0.98, y: 0, z: 2.12 },
      yaw: -0.8616
      }
      
      api.fetchSpawnPosition.mockResolvedValue(originalCoords)
      
      const result = await getCapturedPosition('cucina')
      
      // Verifica che NON ci siano trasformazioni
      expect(result).toEqual(originalCoords)
      expect(result.position.x).toBe(originalCoords.position.x)
      expect(result.position.y).toBe(originalCoords.position.y)
      expect(result.position.z).toBe(originalCoords.position.z)
      expect(result.yaw).toBe(originalCoords.yaw)
    })
  })

  describe('Stanza non esistente', () => {
    it('deve restituire null per stanza sconosciuta', async () => {
      api.fetchSpawnPosition.mockResolvedValue(null)
      
      const result = await getCapturedPosition('stanza_inesistente')
      
      expect(result).toBeNull()
    })
  })
})
