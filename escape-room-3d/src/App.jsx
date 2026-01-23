import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/session/:sessionId/lobby" element={<Lobby />} />
        <Route path="/admin/session/:sessionId/qrcodes" element={<QRCodesPage />} />
        <Route path="/admin/spawn-editor" element={<SpawnEditor />} />
        
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
    </Router>
  )
}

export default App