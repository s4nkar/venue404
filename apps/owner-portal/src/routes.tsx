import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import ManageVenues from './pages/ManageVenues'
import Bookings from './pages/Bookings'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterSuccess from './pages/RegisterSuccess'
import LoginSuccess from './pages/LoginSuccess'
import PendingApproval from './pages/PendingApproval'
import Rejected from './pages/Rejected'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/register/success', element: <RegisterSuccess /> },
  { path: '/login/success', element: <LoginSuccess /> },
  { path: '/pending-approval', element: <PendingApproval /> },
  { path: '/rejected', element: <Rejected /> },
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
