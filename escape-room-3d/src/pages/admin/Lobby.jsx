import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { io } from 'socket.io-client'

// In produzione (Docker) usa percorso relativo, nginx proxya /socket.io/
// In dev locale usa http://localhost:3000 se VITE_WS_URL non è impostato
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
const API_URL = import.meta.env.VITE_BACKEND_URL || ''

function Lobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [socket, setSocket] = useState(null)
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [starting, setStarting] = useState(false)
  const [pin, setPin] = useState(null)
  const audioRef = useRef(null)
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

  // Recupera il PIN della sessione
  useEffect(() => {
    const fetchPin = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          setPin(data.pin || sessionId.toString().padStart(4, '0').slice(-4))
        } else {
          setPin(sessionId.toString().padStart(4, '0').slice(-4))
        }
      } catch (error) {
        console.error('Error fetching session PIN:', error)
        setPin(sessionId.toString().padStart(4, '0').slice(-4))
      }
    }
    fetchPin()
  }, [sessionId])

  useEffect(() => {
    // Connessione WebSocket
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    })

    newSocket.on('connect', () => {
      newSocket.emit('joinLobby', { sessionId: parseInt(sessionId) })
    })

    newSocket.on('updatePlayersList', (data) => {
      setPlayers(data.players || [])
    })

    newSocket.on('playerConnected', (data) => {
      setPlayers(data.players || [])
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [sessionId])

  const handleStartGame = async () => {
    if (players.length === 0) {
      alert('Nessun giocatore connesso!')
      return
    }

    if (!confirm(`Avviare il gioco con ${players.length} giocatori?`)) {
      return
    }

    setStarting(true)
    
    // Inizializza enigmi nel database
    try {
      await fetch(`${API_URL}/api/puzzles/session/${sessionId}/initialize`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error initializing puzzles:', error)
    }

    // Avvia countdown via WebSocket
    if (socket) {
      socket.emit('startCountdown', { sessionId: parseInt(sessionId) })
      
      // Countdown locale per admin
      let count = 5
      setCountdown(count)
      const interval = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          clearInterval(interval)
          setTimeout(() => {
            setCountdown(null)
            setStarting(false)
          }, 500)
        }
      }, 1000)
    }
  }

  const handleLogout = async () => {
    const confirmMessage = `⚠️ LOGOUT ADMIN\n\nSei sicuro di voler uscire?\n\n• Tutti i giocatori verranno ESPULSI\n• Gli enigmi verranno RESETTATI\n• La sessione verrà CHIUSA\n\nVuoi procedere?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      if (socket) {
        socket.emit('adminResetGame', { sessionId: parseInt(sessionId) })
        console.log('✅ Giocatori espulsi')
      }

      const response = await fetch(`${API_URL}/api/puzzles/session/${sessionId}/reset`, {
        method: 'POST'
      })
      
      if (response.ok) {
        console.log('✅ Enigmi resettati')
      } else {
        console.error('❌ Errore nel reset enigmi')
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      localStorage.removeItem('admin_email')
      window.location.href = '/admin/login.html'
      
    } catch (error) {
      console.error('Error during logout:', error)
      alert('❌ Errore durante il logout. Riprova.')
    }
  }

  const handleResetPuzzles = async () => {
    const confirmMessage = `⚠️ RESET ENIGMI\n\nQuesto resetterà tutti i 13 enigmi allo stato iniziale.\nTutti i progressi verranno cancellati.\n\nVuoi procedere?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/puzzles/session/${sessionId}/reset`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\n${data.reset_count} enigmi sono stati resettati con successo!`)
      } else {
        const error = await response.json()
        alert(`❌ Errore nel reset: ${error.detail || 'Errore sconosciuto'}`)
      }
    } catch (error) {
      console.error('Error resetting puzzles:', error)
      alert('❌ Errore di connessione durante il reset degli enigmi')
    }
  }

  return (
    <>
      {/* Audio background */}
      <audio ref={audioRef} loop>
        <source src="/audio/lobby-music.mp3" type="audio/mpeg" />
      </audio>

      {/* Tunnel 3D Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a0033 0%, #0d1b4d 25%, #4a1a4a 50%, #7c2a2a 75%, #1a0033 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          background: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(138, 43, 226, 0.3) 50px, rgba(138, 43, 226, 0.3) 52px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0, 191, 255, 0.3) 50px, rgba(0, 191, 255, 0.3) 52px)
          `,
          transform: 'translate(-50%, -50%)',
          animation: 'tunnel3D 20s linear infinite',
        }} />
      </div>

      {/* Audio Control Button */}
      <button
        onClick={toggleAudio}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
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
        padding: '20px',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* Header con PIN */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '30px',
            borderRadius: '15px',
            boxShadow: '0 0 40px rgba(58, 170, 53, 0.3), 0 10px 40px rgba(0,0,0,0.5)',
            marginBottom: '20px',
            position: 'relative',
            border: '2px solid rgba(58, 170, 53, 0.3)'
          }}>
            {/* Logout button */}
            <button
              onClick={handleLogout}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(220, 53, 69, 0.5)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
            >
              🚪 Logout
            </button>

            <h1 style={{
              fontSize: '32px',
              color: '#3aaa35',
              marginBottom: '10px',
              marginTop: 0,
              fontFamily: "'Orbitron', sans-serif",
              textShadow: '0 0 20px rgba(58, 170, 53, 0.6)'
            }}>
              🎮 Lobby - Sessione #{sessionId}
            </h1>
            
            {pin && (
              <div style={{
                backgroundColor: 'rgba(58, 170, 53, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                marginTop: '15px',
                marginBottom: '15px',
                border: '2px solid #3aaa35',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#666',
                  margin: '0 0 10px 0',
                  fontWeight: 'bold'
                }}>
                  🔢 PIN di Accesso
                </p>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#3aaa35',
                  letterSpacing: '12px',
                  fontFamily: "'Orbitron', sans-serif"
                }}>
                  {pin}
                </div>
                <p style={{
                  fontSize: '12px',
                  color: '#999',
                  margin: '10px 0 0 0'
                }}>
                  Gli studenti possono usare questo PIN su: {window.location.origin}/join
                </p>
              </div>
            )}
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: 0
            }}>
              Attendi che i giocatori si connettano, poi clicca "VIA!" per iniziare
            </p>
          </div>

          {/* Countdown */}
          {countdown !== null && (
            <div style={{
              backgroundColor: 'rgba(58, 170, 53, 0.95)',
              color: 'white',
              padding: '40px',
              borderRadius: '15px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 0 40px rgba(58, 170, 53, 0.5), 0 10px 40px rgba(0,0,0,0.5)',
              border: '2px solid #3aaa35'
            }}>
              <h2 style={{
                fontSize: '48px',
                margin: '0',
                fontWeight: 'bold',
                fontFamily: "'Orbitron', sans-serif"
              }}>
                {countdown}
              </h2>
              <p style={{
                fontSize: '24px',
                margin: '10px 0 0 0',
                fontFamily: "'Orbitron', sans-serif"
              }}>
                Il gioco sta per iniziare!
              </p>
            </div>
          )}

          {/* Players List */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '30px',
            borderRadius: '15px',
            boxShadow: '0 0 40px rgba(58, 170, 53, 0.3), 0 10px 40px rgba(0,0,0,0.5)',
            marginBottom: '20px',
            border: '2px solid rgba(58, 170, 53, 0.3)'
          }}>
            <h2 style={{
              fontSize: '24px',
              color: '#3aaa35',
              marginTop: 0,
              marginBottom: '20px',
              fontFamily: "'Orbitron', sans-serif"
            }}>
              👥 Giocatori Connessi: {players.length}
            </h2>

            {players.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999'
              }}>
                <p style={{ fontSize: '18px', margin: 0 }}>
                  In attesa dei giocatori...
                </p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>
                  Fai scansionare i QR code agli studenti
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '10px'
              }}>
                {players.map((nickname, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '15px 20px',
                      background: 'linear-gradient(135deg, rgba(58, 170, 53, 0.1) 0%, rgba(60, 60, 59, 0.1) 100%)',
                      borderRadius: '10px',
                      border: '2px solid #3aaa35',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 0 15px rgba(58, 170, 53, 0.2)'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👤</span>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      {nickname}
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      color: '#3aaa35',
                      fontWeight: 'bold'
                    }}>
                      ✓ CONNESSO
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleStartGame}
              disabled={starting || players.length === 0}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '20px 30px',
                background: starting || players.length === 0 ? '#cccccc' : 'linear-gradient(135deg, #3aaa35 0%, #3c3c3b 100%)',
                color: 'white',
                border: '2px solid #3aaa35',
                borderRadius: '10px',
                fontSize: '24px',
                cursor: starting || players.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(58, 170, 53, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              {starting ? '⏳ Avvio...' : '🚀 VIA!'}
            </button>

            <button
              onClick={handleResetPuzzles}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                color: 'white',
                border: '2px solid #F57C00',
                borderRadius: '10px',
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(255, 152, 0, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              🔄 RESET ENIGMI
            </button>

            <button
              onClick={() => {
                if (players.length === 0) {
                  alert('Non ci sono giocatori da espellere')
                  return
                }
                const confirm = window.confirm(`⚠️ ESPELLI TUTTI\n\n${players.length} giocator${players.length === 1 ? 'e' : 'i'} verr${players.length === 1 ? 'à' : 'anno'} espuls${players.length === 1 ? 'o' : 'i'} e dovrann${players.length === 1 ? 'o' : 'anno'} reinserire il PIN.\n\nConfermi?`)
                if (confirm && socket) {
                  socket.emit('adminResetGame', { sessionId: parseInt(sessionId) })
                  setPlayers([])
                }
              }}
              disabled={players.length === 0}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '20px 30px',
                background: players.length === 0 ? '#cccccc' : 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                color: 'white',
                border: players.length === 0 ? 'none' : '2px solid #b71c1c',
                borderRadius: '10px',
                fontSize: '20px',
                cursor: players.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                boxShadow: players.length === 0 ? 'none' : '0 0 20px rgba(211, 47, 47, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              🛑 ESPELLI TUTTI
            </button>

            <Link
              to={`/admin/session/${sessionId}/qrcodes`}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                color: 'white',
                border: '2px solid #1976D2',
                borderRadius: '10px',
                fontSize: '18px',
                textDecoration: 'none',
                textAlign: 'center',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(33, 150, 243, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              📱 Mostra QR Codes
            </Link>

            <button
              onClick={() => {
                window.open('/admin-panel/index.html', '_blank', 'width=1400,height=900')
              }}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                color: 'white',
                border: '2px solid #7B1FA2',
                borderRadius: '10px',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(156, 39, 176, 0.5), 0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              ⚙️ MONITOR DISPOSITIVI
            </button>
          </div>

          {/* Info */}
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: 'rgba(255, 243, 205, 0.95)',
            borderRadius: '10px',
            border: '2px solid #ffc107',
            fontSize: '14px',
            color: '#856404',
            boxShadow: '0 0 20px rgba(255, 193, 7, 0.3)'
          }}>
            <strong>ℹ️ Come funziona:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>Gli studenti scansionano il QR code e inseriscono il loro nome</li>
              <li>Vedrai i loro nomi apparire in tempo reale in questa lista</li>
              <li>Quando tutti sono pronti, clicca "VIA!" per avviare il countdown</li>
              <li>Dopo 5 secondi tutti verranno portati nella scena Esterno</li>
              <li>Il gioco include 13 enigmi totali (1 esterno + 12 nelle altre stanze)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes tunnel3D {
          0% {
            transform: translate(-50%, -50%) perspective(500px) rotateX(60deg) translateZ(0);
          }
          100% {
            transform: translate(-50%, -50%) perspective(500px) rotateX(60deg) translateZ(100px);
          }
        }
      `}</style>
    </>
  )
}

export default Lobby