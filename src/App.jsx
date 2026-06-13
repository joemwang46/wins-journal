import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { useOnlineStatus } from './lib/useOnlineStatus'
import ProtectedRoute from './components/ProtectedRoute'
import AuthRoute from './components/AuthRoute'
import Home from './pages/Home'
import History from './pages/History'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pair from './pages/Pair'

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div
      className="fixed inset-x-0 z-50 bg-warm-800/95 text-cream-50 text-xs text-center
                 py-2 px-4 backdrop-blur-sm"
      style={{ top: 'env(safe-area-inset-top)' }}
    >
      You're offline — history is readable, new entries need a connection
    </div>
  )
}

// Inner component so useLocation can run inside BrowserRouter
function AppRoutes() {
  const { pathname } = useLocation()

  return (
    <>
      <OfflineBanner />
      {/* key=pathname causes the div to remount on navigation, triggering fade-in */}
      <div key={pathname} className="animate-fade-in">
        <Routes>
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/pair"    element={<AuthRoute><Pair /></AuthRoute>} />
          <Route path="/"        element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
