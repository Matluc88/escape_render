import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
const API_URL = WS_URL.startsWith('/') 
  ? 'http://localhost:3000' 
  : WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')

function QRCodesPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [pin, setPin] = useState(null)

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

  const handlePrint = () => {
    window.print()
  }

  if (!pin) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#666' }}>Caricamento PIN...</p>
        </div>
      </div>
    )
  }

  const joinUrl = `${window.location.origin}/join?pin=${pin}`

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div className="no-print" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '28px',
          color: '#333',
          marginBottom: '10px'
        }}>
          QR Code Sessione
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '20px'
        }}>
          Sessione ID: <strong>{sessionId}</strong>
        </p>
        <button
          onClick={handlePrint}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          🖨️ Stampa QR Code
        </button>
      </div>

      {/* QR Code Unico */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        textAlign: 'center',
        border: '4px solid #4CAF50',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎮</div>
        
        <h2 style={{
          fontSize: '32px',
          color: '#333',
          marginBottom: '10px',
          marginTop: 0,
          fontFamily: "'Orbitron', sans-serif"
        }}>
          Scansiona per Entrare
        </h2>

        <div style={{
          backgroundColor: '#f0f7ff',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '30px',
          border: '2px solid #2196F3'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: '0 0 10px 0',
            fontWeight: 'bold'
          }}>
            PIN di Accesso
          </p>
          <div style={{
            fontSize: '56px',
            fontWeight: 'bold',
            color: '#2196F3',
            letterSpacing: '15px',
            fontFamily: 'monospace'
          }}>
            {pin}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          display: 'inline-block',
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          maxWidth: '100%'
        }}>
          <QRCodeSVG
            value={joinUrl}
            size={350}
            level="H"
            includeMargin={true}
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: '350px'
            }}
          />
        </div>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '10px'
        }}>
          <strong>Oppure vai su:</strong>
        </p>
        <p style={{
          fontSize: '16px',
          color: '#2196F3',
          fontWeight: 'bold',
          wordBreak: 'break-all',
          marginTop: '5px'
        }}>
          {window.location.origin}/join
        </p>
        <p style={{
          fontSize: '14px',
          color: '#999',
          marginTop: '10px'
        }}>
          e inserisci il PIN: <strong>{pin}</strong>
        </p>

        {/* Bottoni Test Admin */}
        <div className="no-print" style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #ccc'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}>
            🔧 Test Rapido Admin
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px'
          }}>
            <button
              onClick={() => navigate(`/play/${sessionId}/esterno?name=Admin`)}
              style={{
                padding: '12px',
                backgroundColor: '#8B4513',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🏡 Esterno
            </button>
            <button
              onClick={() => navigate(`/play/${sessionId}/cucina?name=Admin`)}
              style={{
                padding: '12px',
                backgroundColor: '#FF6B6B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🍳 Cucina
            </button>
            <button
              onClick={() => navigate(`/play/${sessionId}/soggiorno?name=Admin`)}
              style={{
                padding: '12px',
                backgroundColor: '#4ECDC4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📺 Soggiorno
            </button>
            <button
              onClick={() => navigate(`/play/${sessionId}/bagno?name=Admin`)}
              style={{
                padding: '12px',
                backgroundColor: '#95E1D3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🚿 Bagno
            </button>
            <button
              onClick={() => navigate(`/play/${sessionId}/camera?name=Admin`)}
              style={{
                padding: '12px',
                backgroundColor: '#F38181',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🛏️ Camera
            </button>
          </div>
        </div>
      </div>

      <div className="no-print" style={{
        maxWidth: '600px',
        margin: '30px auto 0',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '10px',
        border: '2px solid #ffc107',
        fontSize: '14px',
        color: '#856404'
      }}>
        <strong>ℹ️ Istruzioni:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Stampa questa pagina e distribuiscila agli studenti</li>
          <li>Gli studenti possono scansionare il QR code O digitare il PIN</li>
          <li>Dopo aver inserito il nome, entreranno nella waiting room</li>
          <li>Torna alla lobby per vedere i giocatori connessi e avviare il gioco</li>
        </ul>
        <Link
          to={`/admin/session/${sessionId}/lobby`}
          style={{
            display: 'inline-block',
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
          ← Torna alla Lobby
        </Link>
      </div>

      <style>{`
        @media print {
          body {
            background: white;
          }
          
          .no-print {
            display: none !important;
          }
          
          .qr-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}

export default QRCodesPage