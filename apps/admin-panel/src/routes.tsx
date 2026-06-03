import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import LoginSuccess from './pages/LoginSuccess'
import Forbidden from './pages/Forbidden'
import NotFound from './pages/NotFound'
import ComingSoon from './pages/ComingSoon'

export const router = createBrowserRouter([
  // Auth
  { path: '/login', element: <Login /> },
  { path: '/login/success', element: <LoginSuccess /> },
  { path: '/403', element: <Forbidden /> },

  // Root → dashboard
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Protected routes
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/venues/pending',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="Venue Approvals"
          description="Review, approve, and reject venue submissions from owners. Filtering and detail review coming soon."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="User Management"
          description="View and manage customer accounts, suspend users, and review activity. Coming soon."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owners',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="Venue Owners"
          description="View and manage registered venue owners, verify identities, and monitor listings. Coming soon."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/bookings',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="Bookings"
          description="Monitor marketplace bookings, resolve conflicts, and track payment activity. Coming soon."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/audit-log',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="Audit Log"
          description="Full immutable history of all admin actions — approvals, rejections, suspensions, and more. Coming soon."
        />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <ComingSoon
          title="Admin Settings"
          description="System configuration, notification settings, and platform-wide preferences. Coming soon."
        />
      </ProtectedRoute>
    ),
  },

  // Catch-all → 404
  { path: '*', element: <NotFound /> },
])
