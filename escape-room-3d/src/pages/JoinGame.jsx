import React, { useState, useEffect, useRef } from 'react'
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
  const audioRef = useRef(null)

  const [pin, setPin] = useState(pinFromUrl || '')
  const [nickname, setNickname] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [joined, setJoined] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  // Audio background
  useEffect(() => {
    // Prova ad avviare l'audio dopo il primo click
    const startAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.log('Autoplay bloccato:', err)
        })
      }
    }
    document.addEventListener('click', startAudio, { once: true })
    return () => document.removeEventListener('click', startAudio)
  }, [])

  // Se c'è un PIN nell'URL, validalo automaticamente
  useEffect(() => {
    if (pinFromUrl && pinFromUrl.length === 4) {
      validatePin(pinFromUrl)
    }
  }, [pinFromUrl])

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioMuted) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
      setAudioMuted(!audioMuted)
    }
  }

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
      // Ferma la musica quando inizia il gioco
      if (audioRef.current) {
        audioRef.current.pause()
      }
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
      <>
        {/* Audio background - stesso della join */}
        <audio ref={audioRef} loop>
          <source src="/audio/lobby-music.mp3" type="audio/mpeg" />
        </audio>

        {/* Grid 3D Background - stesso della join */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#000',
          overflow: 'hidden',
          zIndex: 0
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transform: 'translate(-50%, -50%)',
            perspective: '1000px',
          }}>
            <div className="grid-3d" style={{
              width: '100%',
              height: '100%',
              background: `
                linear-gradient(0deg, transparent 24%, rgba(58, 170, 53, .2) 25%, rgba(58, 170, 53, .2) 26%, transparent 27%, transparent 74%, rgba(58, 170, 53, .2) 75%, rgba(58, 170, 53, .2) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(58, 170, 53, .2) 25%, rgba(58, 170, 53, .2) 26%, transparent 27%, transparent 74%, rgba(58, 170, 53, .2) 75%, rgba(58, 170, 53, .2) 76%, transparent 77%, transparent)
              `,
              backgroundSize: '50px 50px',
              transform: 'rotateX(60deg)',
              animation: 'gridMove 20s linear infinite',
              boxShadow: '0 0 100px rgba(58, 170, 53, 0.5)',
            }} />
          </div>
        </div>

        {/* Audio Control Button */}
        <button
          onClick={toggleAudio}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid #3aaa35',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#3aaa35',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(58, 170, 53, 0.5)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
        >
          {audioMuted ? '🔇' : '🔊'}
        </button>

        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 0 40px rgba(58, 170, 53, 0.3), 0 10px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            border: '2px solid rgba(58, 170, 53, 0.3)'
          }}>
            {countdown !== null ? (
              <>
                <div style={{
                  fontSize: '120px',
                  fontWeight: 'bold',
                  color: '#3aaa35',
                  marginBottom: '20px',
                  animation: 'pulse 1s infinite',
                  textShadow: '0 0 30px rgba(58, 170, 53, 0.8), 0 0 50px rgba(58, 170, 53, 0.6)',
                  fontFamily: "'Creepster', cursive"
                }}>
                  {countdown}
                </div>
                <h2 style={{
                  fontSize: '32px',
                  color: '#3aaa35',
                  margin: 0,
                  fontFamily: "'Creepster', cursive",
                  textShadow: '0 0 20px rgba(58, 170, 53, 0.6)'
                }}>
                  Il gioco sta per iniziare!
                </h2>
              </>
            ) : (
              <>
                {/* Logo ITScrea in waiting room */}
                <svg 
                  style={{
                    width: '150px',
                    height: 'auto',
                    marginBottom: '20px',
                    filter: 'drop-shadow(0 0 10px rgba(58, 170, 53, 0.5))'
                  }}
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 600 114"
                >
                  <defs>
                    <style>{`.cls-1 { fill: #3aaa35; } .cls-2 { fill: #3c3c3b; } .cls-3 { fill: #5d4c4a; }`}</style>
                  </defs>
                  <polygon className="cls-3" points="10.46 92.47 0 92.47 0 1.08 101.94 1.08 101.94 11.54 10.46 11.54 10.46 92.47"/>
                  <polygon className="cls-3" points="124.77 114.86 22.83 114.86 22.83 102.66 112.57 102.66 112.57 47.81 124.77 47.81 124.77 114.86"/>
                  <rect className="cls-1" x="22.65" y="41.87" width="12.71" height="48.73" rx=".74" ry=".74"/>
                  <rect className="cls-1" x="22.72" y="23.27" width="12.56" height="12.71" rx=".74" ry=".74" transform="translate(-.62 58.63) rotate(-90)"/>
                  <rect className="cls-1" x="54.81" y="40.48" width="12.56" height="30.44" rx=".94" ry=".94" transform="translate(122.17 111.4) rotate(-180)"/>
                  <rect className="cls-1" x="54.81" y="12.96" width="12.56" height="33.25" rx=".94" ry=".94" transform="translate(90.67 -31.51) rotate(90)"/>
                  <path className="cls-1" d="M122.67,23.3h-35.2c-.46,0-.84.38-.84.84v52.55c0,.46-.37.84-.84.84l-40.5.09c-.46,0-.84.38-.84.84v11.35c0,.46.38.84.84.84l53.05-.09c.46,0,.84-.38.84-.84v-52.55c0-.46.38-.84.84-.84h22.64c.46,0,.84-.38.84-.84v-11.35c0-.46-.38-.84-.84-.84Z"/>
                  <rect className="cls-3" x="113.82" y="1.08" width="10.51" height="10.51"/>
                  <rect className="cls-3" x="0" y="104.35" width="10.51" height="10.51"/>
                  <g><path className="cls-2" d="M180.79,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM179.15,61.45l-7.07-16.07-7.07,16.07h14.15Z"/><path className="cls-2" d="M191.04,57c0-9.7,7.4-16.77,17.38-16.77,5.06,0,9.46,1.73,12.46,5.11l-3.04,2.95c-2.53-2.67-5.62-3.89-9.23-3.89-7.4,0-12.88,5.34-12.88,12.6s5.48,12.6,12.88,12.6c3.61,0,6.7-1.27,9.23-3.93l3.04,2.95c-3,3.37-7.4,5.15-12.51,5.15-9.93,0-17.33-7.07-17.33-16.77Z"/><path className="cls-2" d="M250.52,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM248.88,61.45l-7.07-16.07-7.07,16.07h14.15Z"/><path className="cls-2" d="M265.46,40.61h13.82c10.54,0,17.71,6.65,17.71,16.39s-7.17,16.39-17.71,16.39h-13.82v-32.79ZM279,69.32c8.1,0,13.3-4.97,13.3-12.32s-5.2-12.32-13.3-12.32h-8.85v24.64h8.85Z"/><path className="cls-2" d="M328.6,69.32v4.08h-23.8v-32.79h23.14v4.08h-18.46v10.07h16.44v3.98h-16.44v10.59h19.11Z"/><path className="cls-2" d="M366.77,73.39l-.05-23.89-11.85,19.91h-2.15l-11.85-19.77v23.75h-4.5v-32.79h3.84l13.68,23.05,13.49-23.05h3.84l.05,32.79h-4.5Z"/><path className="cls-2" d="M396.51,62.06v11.34h-4.64v-11.43l-13.02-21.36h5.01l10.49,17.28,10.54-17.28h4.64l-13.02,21.45Z"/><path className="cls-2" d="M424.18,57c0-9.7,7.4-16.77,17.38-16.77,5.06,0,9.46,1.73,12.46,5.11l-3.04,2.95c-2.53-2.67-5.62-3.89-9.23-3.89-7.4,0-12.88,5.34-12.88,12.6s5.48,12.6,12.88,12.6c3.61,0,6.7-1.27,9.23-3.93l3.04,2.95c-3,3.37-7.4,5.15-12.51,5.15-9.93,0-17.33-7.07-17.33-16.77Z"/><path className="cls-2" d="M458.56,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/><path className="cls-2" d="M493.88,73.39l-7.07-10.07c-.66.05-1.36.09-2.06.09h-8.1v9.98h-4.68v-32.79h12.79c8.53,0,13.68,4.31,13.68,11.43,0,5.06-2.62,8.71-7.21,10.35l7.78,11.01h-5.11ZM493.74,52.03c0-4.68-3.14-7.35-9.13-7.35h-7.96v14.76h7.96c6,0,9.13-2.72,9.13-7.4Z"/><path className="cls-2" d="M503.24,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/><path className="cls-2" d="M540.43,69.32v4.08h-23.8v-32.79h23.14v4.08h-18.46v10.07h16.44v3.98h-16.44v10.59h19.11Z"/><path className="cls-2" d="M545.72,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/><path className="cls-2" d="M581.55,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM579.91,61.45l-7.07-16.07-7.07,16.07h14.15Z"/><path className="cls-2" d="M593.72,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/></g>
                </svg>

                <h2 style={{
                  fontSize: '32px',
                  color: '#3aaa35',
                  marginTop: 0,
                  marginBottom: '10px',
                  fontFamily: "'Creepster', cursive",
                  textShadow: '0 0 20px rgba(58, 170, 53, 0.6)'
                }}>
                  Ciao, {nickname}!
                </h2>
                <p style={{
                  fontSize: '18px',
                  color: '#5d4c4a',
                  marginBottom: '30px'
                }}>
                  In attesa che l'admin avvii il gioco...
                </p>

                <div style={{
                  backgroundColor: 'rgba(58, 170, 53, 0.1)',
                  padding: '20px',
                  borderRadius: '15px',
                  marginBottom: '20px',
                  border: '2px solid rgba(58, 170, 53, 0.3)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    color: '#3aaa35',
                    marginTop: 0,
                    marginBottom: '15px',
                    textShadow: '0 0 10px rgba(58, 170, 53, 0.5)'
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
                          background: name === nickname 
                            ? 'linear-gradient(135deg, #3aaa35 0%, #3c3c3b 100%)' 
                            : 'rgba(93, 76, 74, 0.2)',
                          color: name === nickname ? 'white' : '#3c3c3b',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: name === nickname ? 'bold' : 'normal',
                          border: name === nickname ? '2px solid #3aaa35' : '1px solid rgba(93, 76, 74, 0.3)',
                          boxShadow: name === nickname ? '0 0 15px rgba(58, 170, 53, 0.5)' : 'none'
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
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
          
          @keyframes gridMove {
            0% {
              transform: rotateX(60deg) translateY(0);
            }
            100% {
              transform: rotateX(60deg) translateY(50px);
            }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </>
    )
  }

  // Form Join (PIN + Nickname)
  return (
    <>
      {/* Audio background */}
      <audio ref={audioRef} loop>
        <source src="/audio/lobby-music.mp3" type="audio/mpeg" />
      </audio>

      {/* Grid 3D Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          transform: 'translate(-50%, -50%)',
          perspective: '1000px',
        }}>
          <div className="grid-3d" style={{
            width: '100%',
            height: '100%',
            background: `
              linear-gradient(0deg, transparent 24%, rgba(58, 170, 53, .2) 25%, rgba(58, 170, 53, .2) 26%, transparent 27%, transparent 74%, rgba(58, 170, 53, .2) 75%, rgba(58, 170, 53, .2) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(58, 170, 53, .2) 25%, rgba(58, 170, 53, .2) 26%, transparent 27%, transparent 74%, rgba(58, 170, 53, .2) 75%, rgba(58, 170, 53, .2) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px',
            transform: 'rotateX(60deg)',
            animation: 'gridMove 20s linear infinite',
            boxShadow: '0 0 100px rgba(58, 170, 53, 0.5)',
          }} />
        </div>
      </div>

      {/* Audio Control Button */}
      <button
        onClick={toggleAudio}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '2px solid #3aaa35',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#3aaa35',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(58, 170, 53, 0.5)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
      >
        {audioMuted ? '🔇' : '🔊'}
      </button>

      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 0 40px rgba(58, 170, 53, 0.3), 0 10px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
          maxWidth: '450px',
          width: '100%',
          border: '2px solid rgba(58, 170, 53, 0.3)'
        }}>
          {/* Logo ITScrea */}
          <svg 
            style={{
              width: '200px',
              height: 'auto',
              marginBottom: '20px',
              filter: 'drop-shadow(0 0 10px rgba(58, 170, 53, 0.5))'
            }}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 600 114"
          >
            <defs>
              <style>{`.cls-1 { fill: #3aaa35; } .cls-2 { fill: #3c3c3b; } .cls-3 { fill: #5d4c4a; }`}</style>
            </defs>
            <polygon className="cls-3" points="10.46 92.47 0 92.47 0 1.08 101.94 1.08 101.94 11.54 10.46 11.54 10.46 92.47"/>
            <polygon className="cls-3" points="124.77 114.86 22.83 114.86 22.83 102.66 112.57 102.66 112.57 47.81 124.77 47.81 124.77 114.86"/>
            <rect className="cls-1" x="22.65" y="41.87" width="12.71" height="48.73" rx=".74" ry=".74"/>
            <rect className="cls-1" x="22.72" y="23.27" width="12.56" height="12.71" rx=".74" ry=".74" transform="translate(-.62 58.63) rotate(-90)"/>
            <rect className="cls-1" x="54.81" y="40.48" width="12.56" height="30.44" rx=".94" ry=".94" transform="translate(122.17 111.4) rotate(-180)"/>
            <rect className="cls-1" x="54.81" y="12.96" width="12.56" height="33.25" rx=".94" ry=".94" transform="translate(90.67 -31.51) rotate(90)"/>
            <path className="cls-1" d="M122.67,23.3h-35.2c-.46,0-.84.38-.84.84v52.55c0,.46-.37.84-.84.84l-40.5.09c-.46,0-.84.38-.84.84v11.35c0,.46.38.84.84.84l53.05-.09c.46,0,.84-.38.84-.84v-52.55c0-.46.38-.84.84-.84h22.64c.46,0,.84-.38.84-.84v-11.35c0-.46-.38-.84-.84-.84Z"/>
            <rect className="cls-3" x="113.82" y="1.08" width="10.51" height="10.51"/>
            <rect className="cls-3" x="0" y="104.35" width="10.51" height="10.51"/>
            <g>
              <path className="cls-2" d="M180.79,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM179.15,61.45l-7.07-16.07-7.07,16.07h14.15Z"/>
              <path className="cls-2" d="M191.04,57c0-9.7,7.4-16.77,17.38-16.77,5.06,0,9.46,1.73,12.46,5.11l-3.04,2.95c-2.53-2.67-5.62-3.89-9.23-3.89-7.4,0-12.88,5.34-12.88,12.6s5.48,12.6,12.88,12.6c3.61,0,6.7-1.27,9.23-3.93l3.04,2.95c-3,3.37-7.4,5.15-12.51,5.15-9.93,0-17.33-7.07-17.33-16.77Z"/>
              <path className="cls-2" d="M250.52,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM248.88,61.45l-7.07-16.07-7.07,16.07h14.15Z"/>
              <path className="cls-2" d="M265.46,40.61h13.82c10.54,0,17.71,6.65,17.71,16.39s-7.17,16.39-17.71,16.39h-13.82v-32.79ZM279,69.32c8.1,0,13.3-4.97,13.3-12.32s-5.2-12.32-13.3-12.32h-8.85v24.64h8.85Z"/>
              <path className="cls-2" d="M328.6,69.32v4.08h-23.8v-32.79h23.14v4.08h-18.46v10.07h16.44v3.98h-16.44v10.59h19.11Z"/>
              <path className="cls-2" d="M366.77,73.39l-.05-23.89-11.85,19.91h-2.15l-11.85-19.77v23.75h-4.5v-32.79h3.84l13.68,23.05,13.49-23.05h3.84l.05,32.79h-4.5Z"/>
              <path className="cls-2" d="M396.51,62.06v11.34h-4.64v-11.43l-13.02-21.36h5.01l10.49,17.28,10.54-17.28h4.64l-13.02,21.45Z"/>
              <path className="cls-2" d="M424.18,57c0-9.7,7.4-16.77,17.38-16.77,5.06,0,9.46,1.73,12.46,5.11l-3.04,2.95c-2.53-2.67-5.62-3.89-9.23-3.89-7.4,0-12.88,5.34-12.88,12.6s5.48,12.6,12.88,12.6c3.61,0,6.7-1.27,9.23-3.93l3.04,2.95c-3,3.37-7.4,5.15-12.51,5.15-9.93,0-17.33-7.07-17.33-16.77Z"/>
              <path className="cls-2" d="M458.56,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/>
              <path className="cls-2" d="M493.88,73.39l-7.07-10.07c-.66.05-1.36.09-2.06.09h-8.1v9.98h-4.68v-32.79h12.79c8.53,0,13.68,4.31,13.68,11.43,0,5.06-2.62,8.71-7.21,10.35l7.78,11.01h-5.11ZM493.74,52.03c0-4.68-3.14-7.35-9.13-7.35h-7.96v14.76h7.96c6,0,9.13-2.72,9.13-7.4Z"/>
              <path className="cls-2" d="M503.24,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/>
              <path className="cls-2" d="M540.43,69.32v4.08h-23.8v-32.79h23.14v4.08h-18.46v10.07h16.44v3.98h-16.44v10.59h19.11Z"/>
              <path className="cls-2" d="M545.72,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/>
              <path className="cls-2" d="M581.55,65.2h-17.42l-3.61,8.2h-4.82l14.85-32.79h4.64l14.9,32.79h-4.92l-3.61-8.2ZM579.91,61.45l-7.07-16.07-7.07,16.07h14.15Z"/>
              <path className="cls-2" d="M593.72,70.44c0-1.87,1.45-3.19,3.19-3.19s3.09,1.31,3.09,3.19-1.4,3.23-3.09,3.23-3.19-1.36-3.19-3.23Z"/>
            </g>
          </svg>

          <h1 style={{
            fontSize: '42px',
            color: '#3aaa35',
            marginTop: 0,
            marginBottom: '10px',
            fontFamily: "'Creepster', cursive",
            textShadow: '0 0 20px rgba(58, 170, 53, 0.8), 0 0 30px rgba(58, 170, 53, 0.6)',
            letterSpacing: '2px'
          }}>
            Entra nel Gioco
          </h1>

          <p style={{
            fontSize: '16px',
            color: '#5d4c4a',
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
              background: validating || !pin || !nickname 
                ? '#ccc' 
                : 'linear-gradient(135deg, #3aaa35 0%, #3c3c3b 100%)',
              color: 'white',
              border: '2px solid #3aaa35',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: validating || !pin || !nickname ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 20px rgba(58, 170, 53, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              textShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
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

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
        
        @keyframes gridMove {
          0% {
            transform: rotateX(60deg) translateY(0);
          }
          100% {
            transform: rotateX(60deg) translateY(50px);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  )
}

export default JoinGame