import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Hook per gestire lo stato degli enigmi del bagno
 * 
 * Enigmi sequenziali:
 * 1. specchio - Countdown luci specchio
 * 2. doccia - Chiusura anta doccia per spazio
 * 3. ventola - Chiusura porta-finestra per umidità
 * 
 * LED:
 * - LED_SPECCHIO: rosso→verde
 * - LED_PORTA_FINESTRA: off→rosso→verde
 * - LED_VENTOLA: off→rosso→verde
 * - LED_PORTA: rosso→lampeggia (game completion globale)
 */
export function useBathroomPuzzle(sessionId, socket = null) {
  const [puzzleState, setPuzzleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stato iniziale
  const fetchState = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/sessions/${sessionId}/bathroom-puzzles/state`);
      setPuzzleState(response.data);
      setError(null);
    } catch (err) {
      console.error('[useBathroomPuzzle] Errore nel caricamento stato:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // 🔥 FIX WEBSOCKET: Ascolta aggiornamenti in tempo reale dal backend
  useEffect(() => {
    if (!socket) {
      console.warn('[useBathroomPuzzle] ⚠️ Socket non disponibile - aggiornamenti in tempo reale disabilitati');
      return;
    }

    const handlePuzzleUpdate = (data) => {
      console.log('[useBathroomPuzzle] 📡 Ricevuto puzzle_state_update:', data);
      
      // Filtra solo aggiornamenti per il bagno
      if (data.room === 'bagno' && data.session_id === sessionId) {
        console.log('[useBathroomPuzzle] ✅ Aggiornamento bagno ricevuto - Stato doccia:', data.states?.doccia?.status);
        
        // Aggiorna stato locale con i nuovi dati
        setPuzzleState({
          states: data.states,
          led_states: data.led_states
        });
      }
    };

    console.log('[useBathroomPuzzle] 🔌 Registrazione listener WebSocket per puzzle_state_update');
    socket.on('puzzle_state_update', handlePuzzleUpdate);

    // Cleanup
    return () => {
      console.log('[useBathroomPuzzle] 🔌 Rimozione listener WebSocket');
      socket.off('puzzle_state_update', handlePuzzleUpdate);
    };
  }, [socket, sessionId]);

  // Completa un enigma
  const completePuzzle = useCallback(async (puzzleName) => {
    if (!sessionId) return false;
    
    try {
      const response = await api.post(
        `/api/sessions/${sessionId}/bathroom-puzzles/complete`,
        { puzzle_name: puzzleName }
      );
      
      setPuzzleState(response.data);
      return true;
    } catch (err) {
      console.error(`[useBathroomPuzzle] Errore nel completamento ${puzzleName}:`, err);
      setError(err.message);
      return false;
    }
  }, [sessionId]);

  // Helper per stato LED
  const getLEDColor = (ledName) => {
    if (!puzzleState) return 'off';
    return puzzleState.led_states?.[ledName] || 'off';
  };

  // Helper per stato enigma
  const getPuzzleStatus = (puzzleName) => {
    if (!puzzleState) return 'locked';
    return puzzleState.states?.[puzzleName]?.status || 'locked';
  };

  // Reset enigmi (per testing)
  const resetPuzzles = useCallback(async (level = 'full') => {
    if (!sessionId) return false;
    
    try {
      const response = await api.post(
        `/api/sessions/${sessionId}/bathroom-puzzles/reset`,
        { level }
      );
      
      setPuzzleState(response.data);
      return true;
    } catch (err) {
      console.error('[useBathroomPuzzle] Errore nel reset:', err);
      setError(err.message);
      return false;
    }
  }, [sessionId]);

  return {
    puzzleState,
    loading,
    error,
    completePuzzle,
    getLEDColor,
    getPuzzleStatus,
    resetPuzzles,
    refreshState: fetchState,
    
    // ✅ Quick access properties (come soggiorno!)
    specchioStatus: puzzleState?.states?.specchio?.status,
    docciaStatus: puzzleState?.states?.doccia?.status,
    ventolaStatus: puzzleState?.states?.ventola?.status,
    ledStates: puzzleState?.led_states
  };
}

export default useBathroomPuzzle;