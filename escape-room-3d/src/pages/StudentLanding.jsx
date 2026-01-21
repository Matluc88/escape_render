import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

const ROOM_CONFIG = {
  esterno: { name: 'Esterno', emoji: '🏡', color: '#8B4513' },
  cucina: { name: 'Cucina', emoji: '🍳', color: '#FF6B6B' },
  soggiorno: { name: 'Soggiorno', emoji: '📺', color: '#4ECDC4' },
  bagno: { name: 'Bagno', emoji: '🚿', color: '#95E1D3' },
  camera: { name: 'Camera', emoji: '🛏️', color: '#F38181' }
}

function StudentLanding() {
  const { sessionId, room } = useParams()
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const [nameSubmitted, setNameSubmitted] = useState(false)
  const [socket, setSocket] = useState(null)
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(null)
  
  const roomConfig = ROOM_CONFIG[room] || ROOM_CONFIG.cucina

  useEffect(() => {
    if (!nameSubmitted) return

    // Connessione WebSocket dopo aver inserito il nome
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    })

    newSocket.on('connect', () => {
      console.log('Student connected to waiting room')
      newSocket.emit('registerPlayer', {
        sessionId: parseInt(sessionId),
        nickname: playerName
      })
    })

    newSocket.on('updatePlayersList', (data) => {
      console.log('Players list updated:', data)
      setPlayers(data.players || [])
    })

    newSocket.on('playerConnected', (data) => {
      console.log('Player connected:', data)
      setPlayers(data.players || [])
    })

    newSocket.on('gameStarting', (data) => {
      console.log('Game starting!', data)
      // Avvia countdown locale
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
      console.log('Navigating to game:', data)
      // Reindirizza alla scena esterno
      navigate(`/play/${sessionId}/esterno?name=${encodeURIComponent(playerName)}`)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [nameSubmitted, sessionId, playerName, navigate])

  const handleSubmitName = () => {
    if (!playerName.trim()) {
      alert('Per favore, inserisci il tuo nome!')
      return
    }
    setNameSubmitted(true)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !nameSubmitted) {
      handleSubmitName()
    }
  }

  // Mostra waiting room dopo aver inserito il nome
  if (nameSubmitted) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: roomConfig.color,
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
            // Countdown
            <>
              <div style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: roomConfig.color,
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
            // Waiting
            <>
              <div style={{
                fontSize: '64px',
                marginBottom: '20px'
              }}>
                ⏳
              </div>
              <h2 style={{
                fontSize: '28px',
                color: '#333',
                marginTop: 0,
                marginBottom: '10px'
              }}>
                Ciao, {playerName}!
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
                        backgroundColor: name === playerName ? roomConfig.color : '#e0e0e0',
                        color: name === playerName ? 'white' : '#333',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: name === playerName ? 'bold' : 'normal'
                      }}
                    >
                      {name} {name === playerName && '(tu)'}
                    </span>
                  ))}
                </div>
              </div>

              <p style={{
                fontSize: '14px',
                color: '#999',
                margin: 0
              }}>
                Aspetta che tutti i giocatori si connettano...
              </p>
            </>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}</style>
      </div>
    )
  }

  // Mostra form inserimento nome

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: roomConfig.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: '20px',
          animation: 'bounce 2s infinite'
        }}>
          {roomConfig.emoji}
        </div>
        
        <h1 style={{
          fontSize: '32px',
          color: roomConfig.color,
          marginBottom: '10px',
          marginTop: 0
        }}>
          Stanza: {roomConfig.name}
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '30px'
        }}>
          Sessione: {sessionId}
        </p>
        
        <div style={{
          marginBottom: '20px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            color: '#333',
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            Il tuo nome
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
            placeholder="Inserisci il tuo nome..."
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              border: `2px solid ${roomConfig.color}`,
              borderRadius: '10px',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <button
          onClick={handleSubmitName}
          style={{
            width: '100%',
            padding: '15px 30px',
            backgroundColor: roomConfig.color,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          ENTRA 🚪
        </button>
        
        <p style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '20px',
          marginBottom: 0
        }}>
          Premi INVIO o clicca sul bottone per entrare
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        input:focus {
          box-shadow: 0 0 0 3px ${roomConfig.color}33;
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}

export default StudentLanding
