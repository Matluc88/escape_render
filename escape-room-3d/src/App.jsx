import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/admin/Dashboard'
import Lobby from './pages/admin/Lobby'
import QRCodesPage from './pages/admin/QRCodesPage'
import SpawnEditor from './pages/admin/SpawnEditor'
import JoinGame from './pages/JoinGame'
import StudentLanding from './pages/StudentLanding'
import RoomScene from './pages/RoomScene'
import Victory from './pages/Victory'
import DebugCollisionScene from './components/scenes/DebugCollisionScene'
import LoadingScreen from './components/UI/LoadingScreen'
import ProtectedRoute from './components/auth/ProtectedRoute'
import MusicControl from './components/UI/MusicControl'
import { AudioProvider, useAudio } from './contexts/AudioContext'

// Componente per gestire l'avvio automatico della musica
const AutoPlayMusic = () => {
  const { playMusic, isPlaying } = useAudio()
  const location = useLocation()

  useEffect(() => {
    // Avvia la musica automaticamente quando l'utente entra nell'app
    // (dopo il login, quindi in qualsiasi route protetta)
    if (!isPlaying) {
      const timer = setTimeout(() => {
        playMusic()
      }, 500) // Piccolo delay per garantire che l'audio sia pronto
      
      return () => clearTimeout(timer)
    }
  }, [location.pathname]) // Si attiva al primo caricamento di qualsiasi pagina

  return null
}

function AppContent() {
  return (
    <>
      <AutoPlayMusic />
      <MusicControl />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/session/:sessionId/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/admin/session/:sessionId/qrcodes" element={<ProtectedRoute><QRCodesPage /></ProtectedRoute>} />
        <Route path="/admin/spawn-editor" element={<ProtectedRoute><SpawnEditor /></ProtectedRoute>} />
        
        <Route path="/join" element={<JoinGame />} />
        <Route path="/s/:sessionId/:room" element={<StudentLanding />} />
        <Route path="/play/:sessionId/:room" element={<RoomScene />} />
        
        <Route path="/victory/:sessionId" element={<Victory />} />
        
        {/* Debug scene for testing camera collision detection */}
        <Route path="/debug/collision" element={<DebugCollisionScene />} />
        
        {/* DEV: Quick access to scenes without lobby (session ID = 1) */}
        <Route path="/dev/:room" element={<RoomScene />} />
        <Route path="/dev" element={<Navigate to="/dev/cucina" replace />} />
        
        {/* Backward compatibility: /room/:room/:sessionId redirects to /play/:sessionId/:room */}
        <Route path="/room/:room/:sessionId" element={<RoomScene />} />
        
        {/* Backward compatibility: /:sessionId/:room (direct URL format) */}
        <Route path="/:sessionId/:room" element={<RoomScene />} />
        
        {/* Production: redirect to admin dashboard */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}

function App() {
  return (
    <AudioProvider>
      <Router>
        <AppContent />
      </Router>
    </AudioProvider>
  )
}

export default App