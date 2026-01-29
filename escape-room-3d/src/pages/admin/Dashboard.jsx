import React, { useState, useEffect } from 'react'
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
      // Backend ritorna session con campo 'id'
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
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Logout button in top right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{
          fontSize: '14px',
          color: '#666'
        }}>
          👤 <strong>{adminUsername}</strong>
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
        >
          🚪 Logout
        </button>
      </div>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '32px',
          color: '#333',
          marginBottom: '10px',
          marginTop: 0
        }}>
          Dashboard Admin
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '30px'
        }}>
          Crea una nuova sessione per generare i QR code delle stanze
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
          style={{
            width: '100%',
            padding: '15px 30px',
            backgroundColor: loading ? '#cccccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? '⏳ Creazione in corso...' : '➕ Crea Nuova Sessione'}
        </button>
        
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'left'
        }}>
          <strong>ℹ️ Come funziona:</strong>
          <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Clicca su "Crea Nuova Sessione"</li>
            <li>Verranno generati 4 QR code (uno per stanza)</li>
            <li>Stampa i QR code e distribuiscili agli studenti</li>
            <li>Gli studenti scansionano il QR e inseriscono il loro nome</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default Dashboard