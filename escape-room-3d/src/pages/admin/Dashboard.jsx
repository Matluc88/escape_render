import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../../utils/api'

function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adminUsername, setAdminUsername] = useState('')

  useEffect(() => {
    const username = localStorage.getItem('admin_username') || 'Admin'
    setAdminUsername(username)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_email')
    window.location.href = '/admin/login.html'
  }

  const handleCreateSession = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await createSession()
      const sessionId = response.id
      console.log('Sessione creata:', response)
      navigate(`/admin/session/${sessionId}/lobby`)
    } catch (err) {
      console.error('Errore creazione sessione:', err)
      setError('Errore durante la creazione della sessione. Riprova.')
      setLoading(false)
    }
  }

  return (
    <>
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

      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1
      }}>
        {/* Logout button in top right */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          zIndex: 1000
        }}>
          <span style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(58, 170, 53, 0.8)'
          }}>
            👤 <strong>{adminUsername}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="neon-button"
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: '2px solid #ff0000',
              borderRadius: '8px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 0 20px rgba(220, 53, 69, 0.6)',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            🚪 Logout
          </button>
        </div>

        <div className="glassmorphism glassmorphism-container particle-bg" style={{
          padding: 'clamp(20px, 5vw, 40px)',
          borderRadius: '15px',
          boxShadow: '0 0 40px rgba(58, 170, 53, 0.3), 0 10px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
          maxWidth: 'min(500px, 90vw)',
          width: '100%',
          border: '2px solid rgba(58, 170, 53, 0.3)'
        }}>
          <h1 className="glitch-hover" style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            color: '#3aaa35',
            marginBottom: '10px',
            marginTop: 0,
            fontFamily: "'Orbitron', sans-serif",
            textShadow: '0 0 20px rgba(58, 170, 53, 0.6)'
          }}>
            Dashboard Admin
          </h1>
          
          <p style={{
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            color: '#666',
            marginBottom: '30px'
          }}>
            Crea una nuova sessione
          </p>
          
          {error && (
            <div style={{
              backgroundColor: '#ffcccc',
              color: '#cc0000',
              padding: '10px 20px',
              borderRadius: '5px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className={loading ? '' : 'neon-button super-glow'}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px) clamp(20px, 5vw, 30px)',
              background: loading ? '#cccccc' : 'linear-gradient(135deg, #3aaa35 0%, #3c3c3b 100%)',
              color: 'white',
              border: '2px solid #3aaa35',
              borderRadius: '10px',
              fontSize: 'clamp(16px, 4vw, 18px)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            {loading ? '⏳ Creazione in corso...' : '➕ Crea Nuova Sessione'}
          </button>
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

export default Dashboard