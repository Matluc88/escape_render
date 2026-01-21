/**
 * Living Room Puzzle Hook
 * 
 * Manages puzzle state for Living Room (Soggiorno):
 * - TV (Tasto M): locked → completed
 * - Pianta (Tasto G): locked → active → completed
 * - Condizionatore (Click): locked → active → completed
 * 
 * LED Logic:
 * - Pianta: off → red → green
 * - Condizionatore: off → red → green
 * - Porta: managed by game_completion (blinking logic)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export function useLivingRoomPuzzle(sessionId) {
  const [puzzleState, setPuzzleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const stateRef = useRef(null);

  /**
   * Fetch current puzzle state from backend
   */
  const fetchPuzzleState = useCallback(async () => {
    if (!sessionId) {
      console.warn('[useLivingRoomPuzzle] No sessionId provided');
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/sessions/${sessionId}/livingroom-puzzles/state`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[useLivingRoomPuzzle] State fetched:', data);
      
      setPuzzleState(data);
      stateRef.current = data;
      setError(null);
      
    } catch (err) {
      console.error('[useLivingRoomPuzzle] Error fetching state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Complete TV puzzle (Tasto M)
   * tv: locked → completed
   * pianta: locked → active (LED rosso)
   */
  const completeTV = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('[useLivingRoomPuzzle] Completing TV puzzle...');
      
      const response = await fetch(
        `${BACKEND_URL}/sessions/${sessionId}/livingroom-puzzles/tv/complete`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useLivingRoomPuzzle] ✅ TV completed:', data);
      
      setPuzzleState(data);
      stateRef.current = data;
      
      return data;
      
    } catch (err) {
      console.error('[useLivingRoomPuzzle] ❌ Error completing TV:', err);
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  /**
   * Complete Pianta puzzle (Tasto G)
   * pianta: active → completed
   * condizionatore: locked → active (LED rosso)
   */
  const completePianta = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('[useLivingRoomPuzzle] Completing pianta puzzle...');
      
      const response = await fetch(
        `${BACKEND_URL}/sessions/${sessionId}/livingroom-puzzles/pianta/complete`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useLivingRoomPuzzle] ✅ Pianta completed:', data);
      
      setPuzzleState(data);
      stateRef.current = data;
      
      return data;
      
    } catch (err) {
      console.error('[useLivingRoomPuzzle] ❌ Error completing pianta:', err);
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  /**
   * Complete Condizionatore puzzle (Click + porta chiusa)
   * condizionatore: active → completed
   * Triggers game_completion → Porta LED (blinking)
   */
  const completeCondizionatore = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('[useLivingRoomPuzzle] Completing condizionatore puzzle...');
      
      const response = await fetch(
        `${BACKEND_URL}/sessions/${sessionId}/livingroom-puzzles/condizionatore/complete`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useLivingRoomPuzzle] ✅ Condizionatore completed! 🎉 Room complete!', data);
      
      setPuzzleState(data);
      stateRef.current = data;
      
      return data;
      
    } catch (err) {
      console.error('[useLivingRoomPuzzle] ❌ Error completing condizionatore:', err);
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  /**
   * Reset all puzzles (admin only)
   */
  const resetPuzzles = useCallback(async (level = 'full') => {
    if (!sessionId) return;

    try {
      console.log(`[useLivingRoomPuzzle] Resetting puzzles (level: ${level})...`);
      
      const response = await fetch(
        `${BACKEND_URL}/sessions/${sessionId}/livingroom-puzzles/reset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useLivingRoomPuzzle] ✅ Puzzles reset:', data);
      
      setPuzzleState(data);
      stateRef.current = data;
      
      return data;
      
    } catch (err) {
      console.error('[useLivingRoomPuzzle] ❌ Error resetting puzzles:', err);
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  /**
   * Get LED color for specific puzzle
   */
  const getLEDColor = useCallback((puzzleName) => {
    if (!puzzleState?.led_states) return 'off';
    return puzzleState.led_states[puzzleName] || 'off';
  }, [puzzleState]);

  /**
   * Check if puzzle is in specific status
   */
  const isPuzzleStatus = useCallback((puzzleName, status) => {
    if (!puzzleState?.states) return false;
    return puzzleState.states[puzzleName]?.status === status;
  }, [puzzleState]);

  // Initial fetch
  useEffect(() => {
    fetchPuzzleState();
  }, [fetchPuzzleState]);

  // 🔄 Polling periodico ogni 2 secondi (fallback se WebSocket lento)
  useEffect(() => {
    if (!sessionId) return;
    
    console.log('[useLivingRoomPuzzle] 🔄 Polling attivo ogni 2 secondi per session:', sessionId);
    
    const interval = setInterval(() => {
      console.log('[useLivingRoomPuzzle] 📡 Polling stato puzzle...');
      fetchPuzzleState();
    }, 2000); // Polling ogni 2 secondi
    
    return () => {
      console.log('[useLivingRoomPuzzle] 🛑 Polling fermato');
      clearInterval(interval);
    };
  }, [sessionId, fetchPuzzleState]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    const handlePuzzleUpdate = (event) => {
      if (event.detail?.session_id === sessionId) {
        console.log('[useLivingRoomPuzzle] 📡 WebSocket update received:', event.detail);
        setPuzzleState(event.detail);
        stateRef.current = event.detail;
      }
    };

    window.addEventListener('puzzle_state_update', handlePuzzleUpdate);

    return () => {
      window.removeEventListener('puzzle_state_update', handlePuzzleUpdate);
    };
  }, [sessionId]);

  return {
    puzzleState,
    loading,
    error,
    
    // Actions
    completeTV,
    completePianta,
    completeCondizionatore,
    resetPuzzles,
    refetch: fetchPuzzleState,
    
    // Helpers
    getLEDColor,
    isPuzzleStatus,
    
    // Quick access
    tvStatus: puzzleState?.states?.tv?.status,
    piantaStatus: puzzleState?.states?.pianta?.status,
    condizionatoreStatus: puzzleState?.states?.condizionatore?.status,
    
    ledStates: puzzleState?.led_states,
  };
}