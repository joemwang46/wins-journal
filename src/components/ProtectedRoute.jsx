import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }) {
  const { session, coupleId, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!coupleId) return <Navigate to="/pair" replace />
  return children
}
