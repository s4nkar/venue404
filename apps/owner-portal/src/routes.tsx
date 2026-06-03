import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import ManageVenues from './pages/ManageVenues'
import Bookings from './pages/Bookings'
import Login from './pages/Login'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/403', element: <div>Access denied. You need a venue owner account.</div> },

  {
    path: '/',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/venues',
    element: <ProtectedRoute><ManageVenues /></ProtectedRoute>,
  },
  {
    path: '/bookings',
    element: <ProtectedRoute><Bookings /></ProtectedRoute>,
  },
])
