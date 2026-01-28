import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import KitchenScene from '../components/scenes/KitchenScene'
import LivingRoomScene from '../components/scenes/LivingRoomScene'
import BathroomScene from '../components/scenes/BathroomScene'
import BedroomScene from '../components/scenes/BedroomScene'
import EsternoScene from '../components/scenes/EsternoScene'
import useWebSocket from '../hooks/useWebSocket'
import { useMqttFridge } from '../hooks/useMqttFridge'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
import { useMobileControls } from '../hooks/useMobileControls'
import NotificationToast from '../components/UI/NotificationToast'
import ProgressBar from '../components/UI/ProgressBar'
import MobileControls from '../components/UI/MobileControls'
import RotateDeviceOverlay from '../components/UI/RotateDeviceOverlay'
import Crosshair from '../components/UI/Crosshair'

const ROOM_EMOJIS = {
  esterno: '🏡',
  cucina: '🍳',
  bagno: '🚿',
  camera: '🛏️',
  soggiorno: '🛋️',
  default: '🏠'
}

// Number of puzzles per room
const PUZZLES_PER_ROOM = {
  esterno: 1,    // Solo fotocellula
  cucina: 3,
  bagno: 3,
  camera: 3,
  soggiorno: 3
}

function RoomScene() {
  const { sessionId: rawSessionId, room } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // DEV MODE: If no sessionId in URL (from /dev/:room route), use '1' as default
  const sessionId = rawSessionId || '1'
  const playerName = searchParams.get('name') || 'Guest'
  
  // Admin mode - ONLY show admin controls if explicitly ?name=Admin
  // Everyone else (including no ?name parameter) sees clean player interface
  const isAdmin = playerName.toLowerCase() === 'admin'

  const [objectStates, setObjectStates] = useState({
    forno: 'off',
    frigo: 'off',
    cassetto: 'aperto',
    valvola_gas: 'aperta',
    finestra: 'aperta'
  })

  // Mobile controls state
  const { isPortrait, isLandscape, isMobile: detectedMobile } = useDeviceOrientation()
  const mobileControls = useMobileControls()
  const [currentTarget, setCurrentTarget] = useState(null)
  const [currentTargetName, setCurrentTargetName] = useState(null)
  
  // Debug override: add ?forceMobile=1 to URL to force mobile mode
  const forceMobile = searchParams.get('forceMobile') === '1'
  const isMobile = forceMobile || detectedMobile
  
  // Fullscreen management for mobile
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  
  // Request fullscreen on mobile when entering landscape mode
  useEffect(() => {
    if (!isMobile || !isLandscape) return
    
    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement
        if (elem.requestFullscreen && !document.fullscreenElement) {
          await elem.requestFullscreen()
          setIsFullscreen(true)
        } else if (elem.webkitRequestFullscreen && !document.webkitFullscreenElement) {
          await elem.webkitRequestFullscreen()
          setIsFullscreen(true)
        }
      } catch (err) {
        console.log('Fullscreen request failed:', err)
      }
    }
    
    // Small delay to ensure the page is ready
    const timer = setTimeout(requestFullscreen, 500)
    return () => clearTimeout(timer)
  }, [isMobile, isLandscape])
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const { connected, sessionState, notifications, sendAction, socket } = useWebSocket(
    sessionId,
    room,
    playerName
  )

  const { connected: mqttConnected, fridgeStatus, setFridgeOn, setFridgeOff } = useMqttFridge()

  // Admin: Reset game with ESC key (only for admin)
  useEffect(() => {
    if (isAdmin && socket) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          const confirm = window.confirm('⚠️ RESET GIOCO: Tutti i giocatori torneranno alla pagina di inserimento PIN. Confermi?')
          if (confirm) {
            console.log('[RoomScene] 🔴 ADMIN RESET GAME')
            // Emit reset event to all players via WebSocket
            socket.emit('adminResetGame', { sessionId })
            // Admin also navigates back
            navigate('/join')
          }
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAdmin, socket, sessionId, navigate])

  // Listen for reset game event from admin
  useEffect(() => {
    if (!socket) return
    
    const handleResetGame = () => {
      console.log('[RoomScene] 🔴 Game reset by admin - redirecting to join page')
      navigate('/join')
    }
    
    socket.on('gameReset', handleResetGame)
    return () => {
      socket.off('gameReset', handleResetGame)
    }
  }, [socket, navigate])

  // Handle when player looks at an interactive object (for mobile interaction button)
  const handleLookAtChange = useCallback((target, targetName) => {
    setCurrentTarget(target)
    setCurrentTargetName(targetName)
  }, [])

  useEffect(() => {
    if (sessionState && sessionState.objectStates) {
      setObjectStates(prev => ({
        ...prev,
        ...sessionState.objectStates
      }))
    }
  }, [sessionState])

  // Wrap handleObjectClick in useCallback to avoid stale closure issues
  const handleObjectClick = useCallback((target) => {
    console.log('Click su:', target)
    
    // Fix: se target è un oggetto THREE.js, estrai il nome
    const targetName = typeof target === 'string' ? target : (target?.name || '')
    const key = targetName.toLowerCase()
    
    if (key === 'testcucina1') {
      console.log(`🧪 Test cube clicked: ${key} - Controlling LED`)
      if (fridgeStatus === 'ACCESO') {
        console.log(`Sending OFF command for ${key}`)
        setFridgeOff()
      } else {
        console.log(`Sending ON command for ${key}`)
        setFridgeOn()
      }
      return
    }
    
    if (key.startsWith('test')) {
      console.log(`🧪 Test cube clicked: ${key} - Not connected yet`)
      alert(`${target} non è ancora collegato. Solo testcucina1 controlla il LED.`)
      return
    }
    
    if (key === 'frigo') {
      if (fridgeStatus === 'ACCESO') {
        setFridgeOff()
      } else {
        setFridgeOn()
      }
    }
    
    let action
    if (key === 'forno' || key === 'frigo') {
      action = objectStates[key] === 'on' ? 'off' : 'on'
    } else if (key === 'cassetto') {
      action = objectStates.cassetto === 'aperto' ? 'close' : 'open'
    } else if (key === 'valvola_gas') {
      action = objectStates.valvola_gas === 'aperta' ? 'close' : 'open'
    } else if (key === 'finestra') {
      action = objectStates.finestra === 'aperta' ? 'close' : 'open'
    }
    
    if (action) {
      sendAction(action, key)
      
      const newState = { ...objectStates }
      if (key === 'forno' || key === 'frigo') {
        newState[key] = action === 'on' ? 'on' : 'off'
      } else if (key === 'cassetto') {
        newState.cassetto = action === 'close' ? 'chiuso' : 'aperto'
      } else if (key === 'valvola_gas') {
        newState.valvola_gas = action === 'close' ? 'chiusa' : 'aperta'
      } else if (key === 'finestra') {
        newState.finestra = action === 'close' ? 'chiusa' : 'aperta'
      }
      setObjectStates(newState)
    }
  }, [objectStates, fridgeStatus, sendAction, setFridgeOn, setFridgeOff])

  // Handle mobile interaction button press
  const handleMobileInteract = useCallback(() => {
    if (currentTarget) {
      handleObjectClick(currentTarget)
    }
  }, [currentTarget, handleObjectClick])

  const renderScene = () => {
    // Common props for all scenes
    // Always pass mobileControls - useFPSControls will decide internally whether to use mobile or desktop mode
    const sceneProps = {
      onObjectClick: handleObjectClick,
      onLookAtChange: handleLookAtChange,
      mobileInput: mobileControls,
      isAdmin: isAdmin
    }

    if (room === 'esterno') {
      return <EsternoScene 
        {...sceneProps} 
        isMobile={isMobile}
        socket={socket}
        sessionId={sessionId}
        playerName={playerName}
      />
    }
    if (room === 'cucina') {
      return <KitchenScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
    }
    if (room === 'soggiorno') {
      return <LivingRoomScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
    }
    if (room === 'bagno') {
      return <BathroomScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
    }
    if (room === 'camera') {
      return <BedroomScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
    }
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: '#666'
      }}>
        Stanza "{room}" - Coming Soon
      </div>
    )
  }

  const getCompletedPuzzles = () => {
    if (!sessionState || !sessionState.completed) return []
    return sessionState.completed
  }

  const getCurrentPuzzle = () => {
    if (!sessionState || !sessionState.currentPuzzle) return null
    return sessionState.currentPuzzle
  }

  const emoji = ROOM_EMOJIS[room] || ROOM_EMOJIS.default
  const truncatedSessionId = sessionId ? sessionId.substring(0, 8) : ''

  // 🆕 DEV MODE: Session 999 bypasses PIN validation - allow access even without backend
  const isDevSession = sessionId === '999'
  const shouldShowDisconnectOverlay = !connected && !isDevSession

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 🆕 OVERLAY: Blocca rendering se WebSocket disconnesso (ESCLUSA sessione 999) */}
      {shouldShowDisconnectOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Sessione Terminata</h1>
          <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '30px', maxWidth: '500px' }}>
            Il PIN di questa sessione non è più valido.<br/>
            L'amministratore ha creato una nuova sessione.
          </p>
          <button
            onClick={() => navigate('/join')}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            Torna alla Pagina di Inserimento PIN
          </button>
        </div>
      )}
      
      <header style={{
        backgroundColor: '#333',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: !isAdmin ? 'center' : 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {!isAdmin ? (
          // Header semplificato per giocatori
          <h1 style={{ margin: 0, fontSize: '24px', textAlign: 'center' }}>
            {room.charAt(0).toUpperCase() + room.slice(1)}
          </h1>
        ) : (
          // Header completo per admin
          <>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <span style={{ fontSize: '20px' }}>
                  {connected ? '🟢' : '🔴'}
                </span>
                <h1 style={{ margin: 0, fontSize: '20px' }}>
                  {emoji} {room.charAt(0).toUpperCase() + room.slice(1)}
                </h1>
              </div>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#ccc' }}>
                {playerName} | Sessione: {truncatedSessionId}
              </p>
            </div>
            <button
              onClick={async () => {
                console.log('[RoomScene] 🔴 ADMIN EXIT - Ending session and expelling all players')
                
                // 1. Invalida sessione (brucia PIN)
                try {
                  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
                  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
                    method: 'POST'
                  })
                  console.log('[RoomScene] ✅ Session end response:', response.status)
                } catch (error) {
                  console.error('[RoomScene] ❌ Error ending session:', error)
                }
                
                // 2. Espelli tutti i giocatori via WebSocket
                if (socket) {
                  socket.emit('adminResetGame', { sessionId })
                }
                
                // 3. Admin torna alla dashboard
                navigate('/admin')
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                minHeight: '44px',
                minWidth: '80px'
              }}
            >
              Esci
            </button>
          </>
        )}
      </header>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {renderScene()}
        
        {/* Crosshair - center screen reticle for all players (not admin) */}
        {!isAdmin && <Crosshair active={currentTarget !== null} />}
        
        {/* Mobile controls - only show in landscape mode on mobile */}
        {isMobile && isLandscape && (
          <MobileControls
            onMoveChange={mobileControls.setMoveVec}
            onLookChange={mobileControls.setLookVec}
            onInteract={handleMobileInteract}
            canInteract={currentTarget !== null}
            targetName={currentTargetName}
            visible={true}
          />
        )}
        
        {/* Rotate device overlay - show when mobile and portrait */}
        {isMobile && isPortrait && <RotateDeviceOverlay />}
        
        <NotificationToast notifications={notifications} />
        
        {/* MQTT Panel - Only visible for admin */}
        {isAdmin && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>🔌 MQTT ESP32:</strong> {mqttConnected ? '🟢 Connesso' : '🔴 Disconnesso'}
            </div>
            <div>
              <strong>💡 LED:</strong> {fridgeStatus || '❓ Sconosciuto'}
            </div>
          </div>
        )}
        
        {/* Admin Control Panel - Only visible for admin */}
        {isAdmin && socket && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 100
          }}>
            <button
              onClick={async () => {
                const confirm = window.confirm('⚠️ FERMA GIOCO\n\nTutti i giocatori verranno espulsi e torneranno alla pagina di inserimento PIN.\nIl PIN di questa sessione verrà invalidato.\n\nConfermi?')
                if (confirm) {
                  console.log('[RoomScene] 🔴 ADMIN STOP GAME - Expelling all players and invalidating PIN')
                  
                  // 1. Invalida sessione (brucia PIN)
                  try {
                    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
                    await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
                      method: 'POST'
                    })
                    console.log('[RoomScene] ✅ Session ended - PIN invalidated')
                  } catch (error) {
                    console.error('[RoomScene] ❌ Error ending session:', error)
                  }
                  
                  // 2. Espelli tutti i giocatori via WebSocket
                  socket.emit('adminResetGame', { sessionId })
                  
                  // 3. Admin torna alla dashboard
                  navigate('/admin')
                }
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: '2px solid #b71c1c',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.4)',
                transition: 'all 0.2s',
                minWidth: '180px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b71c1c'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#d32f2f'
                e.target.style.transform = 'scale(1)'
              }}
            >
              🛑 FERMA GIOCO
            </button>
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#fff',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Espelli tutti i giocatori
            </div>
          </div>
        )}
        
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 100
        }}>
          <ProgressBar
            room={room}
            completed={getCompletedPuzzles()}
            total={PUZZLES_PER_ROOM[room] || 5}
            current={getCurrentPuzzle()}
          />
        </div>
      </div>
    </div>
  )
}

export default RoomScene