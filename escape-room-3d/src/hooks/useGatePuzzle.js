/**
 * Hook for managing Gate Puzzle State (Esterno Scene)
 * 
 * Handles:
 * - Fetching initial state from backend
 * - WebSocket real-time updates for gate puzzle
 * - Photocell state synchronization
 * - Gate/door/roof animations state
 * - LED state management
 * 
 * Backend endpoints:
 * - GET  /api/sessions/{id}/gate-puzzles/state
 * - POST /api/sessions/{id}/gate-puzzles/photocell/update?is_clear=true/false
 * - POST /api/sessions/{id}/gate-puzzles/reset
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export function useGatePuzzle(sessionId, socket) {
  // Puzzle states
  const [photocellClear, setPhotocellClear] = useState(false)
  const [gatesOpen, setGatesOpen] = useState(false)
  const [doorOpen, setDoorOpen] = useState(false)
  const [roofOpen, setRoofOpen] = useState(false)
  const [ledStatus, setLedStatus] = useState('red')
  const [rgbStripOn, setRgbStripOn] = useState(false)
  const [completed, setCompleted] = useState(false)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Guard to prevent double initialization
  const initializedRef = useRef(false)
  
  /**
   * Fetch initial puzzle state from backend
   */
  const fetchInitialState = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/gate-puzzles/state`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Update states from backend
      setPhotocellClear(data.photocell_clear)
      setGatesOpen(data.gates_open)
      setDoorOpen(data.door_open)
      setRoofOpen(data.roof_open)
      setLedStatus(data.led_status)
      setRgbStripOn(data.rgb_strip_on)
      setCompleted(data.completed)
      
      console.log('✅ [useGatePuzzle] Initial state loaded:', data)
      setError(null)
    } catch (err) {
      console.error('❌ [useGatePuzzle] Error fetching initial state:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])
  
  /**
   * Initialize: Fetch state once on mount
   */
  useEffect(() => {
    if (initializedRef.current) {
      console.log('🔒 [useGatePuzzle] Already initialized, skipping')
      return
    }
    
    initializedRef.current = true
    fetchInitialState()
  }, [fetchInitialState])
  
  /**
   * WebSocket listener for real-time updates
   */
  useEffect(() => {
    if (!socket) {
      console.log('⚠️  [useGatePuzzle] Socket not available, waiting...')
      return
    }
    
    const handleGatePuzzleUpdate = (data) => {
      console.log('📡 [useGatePuzzle] WebSocket update received:', data)
      
      // Only update if it's for our session
      if (data.session_id !== parseInt(sessionId)) {
        console.log('⚠️  [useGatePuzzle] Update for different session, ignoring')
        return
      }
      
      // Validate data structure
      if (typeof data.photocell_clear === 'undefined') {
        console.error('❌ [useGatePuzzle] Invalid WebSocket data structure:', data)
        return
      }
      
      // Update all states
      setPhotocellClear(data.photocell_clear)
      setGatesOpen(data.gates_open)
      setDoorOpen(data.door_open)
      setRoofOpen(data.roof_open)
      setLedStatus(data.led_status)
      setRgbStripOn(data.rgb_strip_on)
      setCompleted(data.completed)
      
      console.log('✅ [useGatePuzzle] States updated from WebSocket')
    }
    
    // Register listener immediately if already connected
    if (socket.connected) {
      console.log('✅ [useGatePuzzle] Socket già connesso - registro listener subito')
      socket.on('gate_puzzle_update', handleGatePuzzleUpdate)
    }
    
    // Also register for future connections
    const onConnect = () => {
      console.log('🔌 [useGatePuzzle] Socket connesso - registro listener')
      socket.on('gate_puzzle_update', handleGatePuzzleUpdate)
    }
    
    socket.on('connect', onConnect)
    
    return () => {
      console.log('🧹 [useGatePuzzle] Cleanup - rimuovo listener')
      socket.off('gate_puzzle_update', handleGatePuzzleUpdate)
      socket.off('connect', onConnect)
    }
  }, [socket, sessionId])
  
  /**
   * Update photocell state (called when ESP32 detects change)
   * This should be called by ESP32, but can also be triggered manually for testing
   */
  const updatePhotocellState = useCallback(async (isClear) => {
    try {
      console.log(`🚦 [useGatePuzzle] Updating photocell state: ${isClear ? 'CLEAR' : 'OCCUPIED'}`)
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/gate-puzzles/photocell/update?is_clear=${isClear}`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useGatePuzzle] Photocell state updated:', data)
      
      // Update immediately from API response (don't wait for WebSocket)
      setPhotocellClear(data.photocell_clear)
      setGatesOpen(data.gates_open)
      setDoorOpen(data.door_open)
      setRoofOpen(data.roof_open)
      setLedStatus(data.led_status)
      setRgbStripOn(data.rgb_strip_on)
      setCompleted(data.completed)
      
      console.log('🎨 [useGatePuzzle] States updated immediately from API response')
    } catch (err) {
      console.error('❌ [useGatePuzzle] Error updating photocell state:', err)
    }
  }, [sessionId])
  
  /**
   * Reset puzzle (admin only)
   */
  const resetPuzzle = useCallback(async () => {
    try {
      console.log('🔄 [useGatePuzzle] Resetting gate puzzle...')
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/gate-puzzles/reset`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useGatePuzzle] Puzzle reset:', data)
      
      // Update states immediately after reset
      setPhotocellClear(data.photocell_clear)
      setGatesOpen(false)
      setDoorOpen(false)
      setRoofOpen(false)
      setLedStatus('red')
      setRgbStripOn(false)
      setCompleted(false)
      
      console.log('🎨 [useGatePuzzle] States updated immediately after reset')
    } catch (err) {
      console.error('❌ [useGatePuzzle] Error resetting puzzle:', err)
    }
  }, [sessionId])
  
  return {
    // States
    photocellClear,
    gatesOpen,
    doorOpen,
    roofOpen,
    ledStatus,
    rgbStripOn,
    completed,
    isLoading,
    error,
    
    // Actions
    updatePhotocellState,
    resetPuzzle,
    
    // Utility
    refreshState: fetchInitialState
  }
}