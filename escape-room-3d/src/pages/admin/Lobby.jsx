import React, { useState, useEffect } from 'react'
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

  // Recupera il PIN della sessione
  useEffect(() => {
    const fetchPin = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          // Se il PIN non esiste, usa l'ID sessione come fallback
          setPin(data.pin || sessionId.toString().padStart(4, '0').slice(-4))
        } else {
          // Fallback se la chiamata fallisce
          setPin(sessionId.toString().padStart(4, '0').slice(-4))
        }
      } catch (error) {
        console.error('Error fetching session PIN:', error)
        // Fallback in caso di errore
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
          // Admin rimane in Lobby per monitorare il gioco
          setTimeout(() => {
            setCountdown(null)
            setStarting(false)
          }, 500)
        }
      }, 1000)
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
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header con PIN */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '32px',
            color: '#333',
            marginBottom: '10px',
            marginTop: 0
          }}>
            🎮 Lobby - Sessione #{sessionId}
          </h1>
          
          {pin && (
            <div style={{
              backgroundColor: '#f0f7ff',
              padding: '20px',
              borderRadius: '10px',
              marginTop: '15px',
              marginBottom: '15px',
              border: '2px solid #2196F3',
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
                color: '#2196F3',
                letterSpacing: '12px',
                fontFamily: 'monospace'
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
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '40px',
            borderRadius: '15px',
            textAlign: 'center',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{
              fontSize: '48px',
              margin: '0',
              fontWeight: 'bold'
            }}>
              {countdown}
            </h2>
            <p style={{
              fontSize: '24px',
              margin: '10px 0 0 0'
            }}>
              Il gioco sta per iniziare!
            </p>
          </div>
        )}

        {/* Players List */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '24px',
            color: '#333',
            marginTop: 0,
            marginBottom: '20px'
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
                    backgroundColor: '#f9f9f9',
                    borderRadius: '10px',
                    border: '2px solid #4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
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
                    color: '#4CAF50',
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
              backgroundColor: starting || players.length === 0 ? '#cccccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '24px',
              cursor: starting || players.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
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
              backgroundColor: '#FF9800',
              color: 'white',
              border: '2px solid #F57C00',
              borderRadius: '10px',
              fontSize: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
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
              backgroundColor: players.length === 0 ? '#cccccc' : '#d32f2f',
              color: 'white',
              border: players.length === 0 ? 'none' : '2px solid #b71c1c',
              borderRadius: '10px',
              fontSize: '20px',
              cursor: players.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
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
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              textDecoration: 'none',
              textAlign: 'center',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
              backgroundColor: '#9C27B0',
              color: 'white',
              border: '2px solid #7B1FA2',
              borderRadius: '10px',
              fontSize: '18px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            ⚙️ MONITOR DISPOSITIVI
          </button>
        </div>

        {/* Info */}
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#fff3cd',
          borderRadius: '10px',
          border: '2px solid #ffc107',
          fontSize: '14px',
          color: '#856404'
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
  )
}

export default Lobby