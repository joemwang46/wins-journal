import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import LoadingScreen from './LoadingScreen'

// For routes that require a session but NOT a couple (i.e. /pair).
// Redirects away if not logged in, or if already paired.
export default function AuthRoute({ children }) {
  const { session, coupleId, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (coupleId) return <Navigate to="/" replace />
  return children
}
