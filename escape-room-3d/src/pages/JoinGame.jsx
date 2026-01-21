import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

// In produzione (Docker) usa percorso relativo, nginx proxya /socket.io/
// In dev locale usa http://localhost:3000 se VITE_WS_URL non è impostato
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
const API_URL = import.meta.env.VITE_BACKEND_URL || ''

function JoinGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pinFromUrl = searchParams.get('pin')

  const [pin, setPin] = useState(pinFromUrl || '')
  const [nickname, setNickname] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [joined, setJoined] = useState(false)

  // Se c'è un PIN nell'URL, validalo automaticamente
  useEffect(() => {
    if (pinFromUrl && pinFromUrl.length === 4) {
      validatePin(pinFromUrl)
    }
  }, [pinFromUrl])

  // WebSocket per waiting room
  useEffect(() => {
    console.log('[JoinGame] useEffect triggered - joined:', joined, 'sessionId:', sessionId)
    
    if (!joined || !sessionId) {
      console.log('[JoinGame] ⚠️ useEffect blocked - joined:', joined, 'sessionId:', sessionId)
      return
    }

    console.log('[JoinGame] 🚀 Starting WebSocket connection...')
    console.log('[JoinGame] WS_URL:', WS_URL)
    
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      timeout: 10000
    })

    newSocket.on('connect', () => {
      console.log('[JoinGame] ✅ Socket connected! ID:', newSocket.id)
      console.log('Connected to waiting room')
      newSocket.emit('registerPlayer', {
        sessionId: parseInt(sessionId),
        nickname: nickname
      })
    })
    
    newSocket.on('registrationSuccess', (data) => {
      console.log('[JoinGame] ✅ Registration successful:', data)
      console.log('[JoinGame] Current players:', data.players)
      // Aggiorna immediatamente la lista giocatori con la conferma dal server
      setPlayers(data.players || [])
    })
    
    newSocket.on('registrationFailed', (data) => {
      console.log('[JoinGame] ❌ Registration failed:', data.error)
      // Disconnetti e torna al form con errore
      newSocket.disconnect()
      setJoined(false)
      setError(data.error)
      setSessionId(null)
    })

    newSocket.on('updatePlayersList', (data) => {
      setPlayers(data.players || [])
    })

    newSocket.on('playerConnected', (data) => {
      setPlayers(data.players || [])
    })

    newSocket.on('gameStarting', (data) => {
      let count = data.countdown || 5
      setCountdown(count)
      const interval = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          clearInterval(interval)
        }
      }, 1000)
    })

    newSocket.on('navigateToGame', (data) => {
      navigate(`/play/${sessionId}/esterno?name=${encodeURIComponent(nickname)}`)
    })

    // Gestisci reset gioco da admin
    newSocket.on('gameReset', () => {
      console.log('[JoinGame] 🔴 Game reset by admin - returning to PIN form')
      // Reset stato
      setJoined(false)
      setSessionId(null)
      setPin('')
      setNickname('')
      setPlayers([])
      setCountdown(null)
      setError('')
      // Mostra messaggio
      alert('⚠️ Il gioco è stato terminato dall\'amministratore.\nIl PIN non è più valido.')
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [joined, sessionId, nickname, navigate])

  const validatePin = async (pinToValidate) => {
    setValidating(true)
    setError('')

    try {
      // Chiama backend per ottenere session associata al PIN
      const response = await fetch(`${API_URL}/api/sessions/by-pin/${pinToValidate}`)
      
      if (!response.ok) {
        // Gestisci diversi tipi di errore
        if (response.status === 404) {
          throw new Error('PIN non valido')
        } else if (response.status === 410) {
          throw new Error('Sessione terminata - PIN non più valido')
        } else if (response.status === 403) {
          throw new Error('🔒 Gioco già iniziato, troppo tardi!')
        } else {
          throw new Error('Errore di connessione')
        }
      }
      
      const data = await response.json()
      
      // Usa l'id della sessione (stesso per tutti con questo PIN)
      // Formato: numerico (es: 123) non "session-123"
      setSessionId(data.id.toString())
      setPin(pinToValidate)
      setValidating(false)
    } catch (err) {
      setError(err.message || 'PIN non valido o sessione non trovata')
      setValidating(false)
      setSessionId(null)
    }
  }

  const handleJoinGame = () => {
    if (!pin || pin.length !== 4) {
      setError('Inserisci un PIN di 4 cifre')
      return
    }

    if (!nickname.trim()) {
      setError('Inserisci il tuo nome')
      return
    }

    if (!sessionId) {
      validatePin(pin)
      return
    }

    // PIN validato e nickname inserito, entra nella waiting room
    setJoined(true)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinGame()
    }
  }

  // Waiting Room (dopo aver inserito PIN e nickname)
  if (joined) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#4CAF50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          {countdown !== null ? (
            <>
              <div style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#4CAF50',
                marginBottom: '20px',
                animation: 'pulse 1s infinite'
              }}>
                {countdown}
              </div>
              <h2 style={{
                fontSize: '32px',
                color: '#333',
                margin: 0
              }}>
                Il gioco sta per iniziare!
              </h2>
            </>
          ) : (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
              <h2 style={{
                fontSize: '28px',
                color: '#333',
                marginTop: 0,
                marginBottom: '10px'
              }}>
                Ciao, {nickname}!
              </h2>
              <p style={{
                fontSize: '18px',
                color: '#666',
                marginBottom: '30px'
              }}>
                In attesa che l'admin avvii il gioco...
              </p>

              <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  color: '#333',
                  marginTop: 0,
                  marginBottom: '15px'
                }}>
                  👥 Giocatori connessi: {players.length}
                </h3>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  {players.map((name, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: name === nickname ? '#4CAF50' : '#e0e0e0',
                        color: name === nickname ? 'white' : '#333',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: name === nickname ? 'bold' : 'normal'
                      }}
                    >
                      {name} {name === nickname && '(tu)'}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    )
  }

  // Form Join (PIN + Nickname)
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: '20px'
        }}>
          🎮
        </div>

        <h1 style={{
          fontSize: '32px',
          color: '#333',
          marginTop: 0,
          marginBottom: '10px'
        }}>
          Entra nel Gioco
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '30px'
        }}>
          Inserisci il PIN e il tuo nome per unirti
        </p>

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {sessionId && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓ PIN valido! Inserisci il tuo nome
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
            textAlign: 'left',
            fontWeight: 'bold'
          }}>
            🔢 PIN (4 cifre)
          </label>
          <input
            type="text"
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4)
              setPin(value)
              if (value.length === 4) {
                validatePin(value)
              }
            }}
            placeholder="1234"
            maxLength={4}
            disabled={!!pinFromUrl}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '24px',
              textAlign: 'center',
              border: '2px solid #ddd',
              borderRadius: '10px',
              outline: 'none',
              letterSpacing: '8px',
              fontWeight: 'bold',
              boxSizing: 'border-box',
              backgroundColor: pinFromUrl ? '#f5f5f5' : 'white'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
            textAlign: 'left',
            fontWeight: 'bold'
          }}>
            👤 Il tuo nome
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Mario Rossi"
            autoFocus={!!pinFromUrl}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleJoinGame}
          disabled={validating || !pin || !nickname}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: validating || !pin || !nickname ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: validating || !pin || !nickname ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          {validating ? '⏳ Validazione...' : joined ? 'ENTRA 🚪' : sessionId ? 'ENTRA 🚪' : 'VALIDA PIN'}
        </button>

        <p style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '20px',
          marginBottom: 0
        }}>
          Ricevi il PIN dal tuo insegnante o scansiona il QR code
        </p>
      </div>
    </div>
  )
}

export default JoinGame