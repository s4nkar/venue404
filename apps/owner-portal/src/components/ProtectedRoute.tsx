import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const ALLOWED_ROLES = ['venue_owner', 'super_admin']

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (!ALLOWED_ROLES.some(r => user.roles.includes(r))) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
