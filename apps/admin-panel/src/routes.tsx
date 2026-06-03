import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import VenueApprovals from './pages/VenueApprovals'
import Users from './pages/Users'
import Login from './pages/Login'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/403', element: <div>Access denied. Super admin only.</div> },

  {
    path: '/',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/approvals',
    element: <ProtectedRoute><VenueApprovals /></ProtectedRoute>,
  },
  {
    path: '/users',
    element: <ProtectedRoute><Users /></ProtectedRoute>,
  },
])
