import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

// Backend URL - IMPORTANT: This must point to the backend service
const API_URL = 'https://escape-house-backend.onrender.com'

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = loading, true/false = auth status
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token')
      
      if (!token) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/admin/auth/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          // Token invalid, clear storage
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_email')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
          <p style={{ fontSize: '18px', color: '#666' }}>Verifica autenticazione...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to static HTML login page
    window.location.href = '/admin/login.html'
    return null
  }

  return children
}

export default ProtectedRoute