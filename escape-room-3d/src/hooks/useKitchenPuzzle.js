/**
 * Hook for managing Kitchen Puzzle State
 * 
 * Handles:
 * - Fetching initial state from backend
 * - WebSocket real-time updates
 * - Puzzle completion triggers
 * - LED state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export function useKitchenPuzzle(sessionId, socket) {
  // Puzzle states
  const [puzzleStates, setPuzzleStates] = useState({
    fornelli: 'locked',
    frigo: 'locked',
    serra: 'locked',
    porta: 'locked'
  })
  
  // LED states
  const [ledStates, setLedStates] = useState({
    fornelli: 'red',
    frigo: 'off',
    serra: 'off',
    porta: 'red'
  })
  
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
        `${BACKEND_URL}/api/sessions/${sessionId}/kitchen-puzzles/state`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Update states from backend
      setPuzzleStates({
        fornelli: data.states.fornelli.status,
        frigo: data.states.frigo.status,
        serra: data.states.serra.status,
        porta: data.states.porta.status
      })
      
      setLedStates({
        fornelli: data.led_states.fornelli,
        frigo: data.led_states.frigo,
        serra: data.led_states.serra,
        porta: data.led_states.porta
      })
      
      console.log('✅ [useKitchenPuzzle] Initial state loaded:', data)
      setError(null)
    } catch (err) {
      console.error('❌ [useKitchenPuzzle] Error fetching initial state:', err)
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
      console.log('🔒 [useKitchenPuzzle] Already initialized, skipping')
      return
    }
    
    initializedRef.current = true
    fetchInitialState()
  }, [fetchInitialState])
  
  /**
   * WebSocket listener for real-time updates
   * ✅ FIX: Registra listener IMMEDIATAMENTE se socket già connesso
   */
  useEffect(() => {
    if (!socket) {
      console.log('⚠️  [useKitchenPuzzle] Socket not available, waiting...')
      return
    }
    
    const handlePuzzleUpdate = (data) => {
      console.log('📡 [useKitchenPuzzle] WebSocket update received:', data)
      
      // Only update if it's for our session
      if (data.session_id !== parseInt(sessionId)) {
        console.log('⚠️  [useKitchenPuzzle] Update for different session, ignoring')
        return
      }
      
      // ✅ FIX: Valida struttura dati PRIMA di accedere
      if (!data.states || !data.led_states) {
        console.error('❌ [useKitchenPuzzle] Invalid WebSocket data structure:', data)
        return
      }
      
      // ✅ FIX: Verifica che tutti i campi esistano
      if (!data.states.fornelli || !data.states.frigo || !data.states.serra || !data.states.porta) {
        console.error('❌ [useKitchenPuzzle] Missing puzzle states in WebSocket data:', data.states)
        return
      }
      
      // Update puzzle states
      setPuzzleStates({
        fornelli: data.states.fornelli.status,
        frigo: data.states.frigo.status,
        serra: data.states.serra.status,
        porta: data.states.porta.status
      })
      
      // Update LED states
      setLedStates({
        fornelli: data.led_states.fornelli,
        frigo: data.led_states.frigo,
        serra: data.led_states.serra,
        porta: data.led_states.porta
      })
      
      console.log('✅ [useKitchenPuzzle] States updated from WebSocket')
    }
    
    // ✅ FIX: Registra listener IMMEDIATAMENTE se già connesso
    if (socket.connected) {
      console.log('✅ [useKitchenPuzzle] Socket già connesso - registro listener subito')
      socket.on('puzzle_state_update', handlePuzzleUpdate)
    }
    
    // Registra anche per connessioni future
    const onConnect = () => {
      console.log('🔌 [useKitchenPuzzle] Socket connesso - registro listener')
      socket.on('puzzle_state_update', handlePuzzleUpdate)
    }
    
    socket.on('connect', onConnect)
    
    return () => {
      console.log('🧹 [useKitchenPuzzle] Cleanup - rimuovo listener')
      socket.off('puzzle_state_update', handlePuzzleUpdate)
      socket.off('connect', onConnect)
    }
  }, [socket, sessionId])
  
  /**
   * Complete fornelli puzzle (pentola animation finished)
   */
  const completeFornelli = useCallback(async () => {
    // ✅ RIMOSSO guard client-side - il backend ha già FSM protection
    // (Fix: stesso pattern di bedroom - trust backend validation)
    
    try {
      console.log('🔥 [useKitchenPuzzle] Completing fornelli puzzle...')
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/kitchen-puzzles/fornelli/complete`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useKitchenPuzzle] Fornelli completed:', data)
      
      // 🚀 UPDATE IMMEDIATO - non aspettare WebSocket (pattern bedroom)
      setPuzzleStates({
        fornelli: data.states.fornelli.status,
        frigo: data.states.frigo.status,
        serra: data.states.serra.status,
        porta: data.states.porta.status
      })
      
      setLedStates({
        fornelli: data.led_states.fornelli,
        frigo: data.led_states.frigo,
        serra: data.led_states.serra,
        porta: data.led_states.porta
      })
      
      console.log('🎨 [useKitchenPuzzle] LED updated immediately from API response')
    } catch (err) {
      console.error('❌ [useKitchenPuzzle] Error completing fornelli:', err)
    }
  }, [sessionId])
  
  /**
   * Complete frigo puzzle (door closed)
   */
  const closeFrigo = useCallback(async () => {
    // ✅ RIMOSSO guard client-side - il backend ha già FSM protection
    // (Fix: stesso pattern di completeFornelli - trust backend validation)
    
    try {
      console.log('🧊 [useKitchenPuzzle] Completing frigo puzzle...')
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/kitchen-puzzles/frigo/complete`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useKitchenPuzzle] Frigo completed:', data)
    } catch (err) {
      console.error('❌ [useKitchenPuzzle] Error completing frigo:', err)
    }
  }, [sessionId])
  
  /**
   * Complete serra puzzle (light activated)
   */
  const activateSerra = useCallback(async () => {
    // ✅ RIMOSSO guard client-side - il backend ha già FSM protection
    // (Fix: stesso pattern di completeFornelli - trust backend validation)
    
    try {
      console.log('🌿 [useKitchenPuzzle] Completing serra puzzle...')
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/kitchen-puzzles/serra/complete`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useKitchenPuzzle] Serra completed:', data)
    } catch (err) {
      console.error('❌ [useKitchenPuzzle] Error completing serra:', err)
    }
  }, [sessionId])
  
  /**
   * Reset puzzles (admin only)
   * ✅ FIX: Update states immediately after reset
   */
  const resetPuzzles = useCallback(async (level = 'full') => {
    try {
      console.log(`🔄 [useKitchenPuzzle] Resetting puzzles (${level})...`)
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}/kitchen-puzzles/reset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level })
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [useKitchenPuzzle] Puzzles reset:', data)
      
      // 🚀 UPDATE IMMEDIATO - aggiorna stati dopo reset (fix race condition LED)
      setPuzzleStates({
        fornelli: data.states.fornelli.status,
        frigo: data.states.frigo.status,
        serra: data.states.serra.status,
        porta: data.states.porta.status
      })
      
      setLedStates({
        fornelli: data.led_states.fornelli,
        frigo: data.led_states.frigo,
        serra: data.led_states.serra,
        porta: data.led_states.porta
      })
      
      console.log('🎨 [useKitchenPuzzle] States updated immediately after reset')
    } catch (err) {
      console.error('❌ [useKitchenPuzzle] Error resetting puzzles:', err)
    }
  }, [sessionId])
  
  return {
    // States
    puzzleStates,
    ledStates,
    isLoading,
    error,
    
    // Actions
    completeFornelli,
    closeFrigo,
    activateSerra,
    resetPuzzles,
    
    // Utility
    refreshState: fetchInitialState
  }
}