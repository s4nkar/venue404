import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Home from './pages/Home'
import VenueDetails from './pages/VenueDetails'
import MyBookings from './pages/MyBookings'
import Login from './pages/Login'

export const router = createBrowserRouter([
  // public routes
  { path: '/', element: <Home /> },
  { path: '/venues/:id', element: <VenueDetails /> },
  { path: '/login', element: <Login /> },

  // protected routes — require any authenticated user
  {
    path: '/my-bookings',
    element: (
      <ProtectedRoute>
        <MyBookings />
      </ProtectedRoute>
    ),
  },

  // 403 fallback
  { path: '/403', element: <div>Access denied.</div> },
])
