import { createBrowserRouter } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ManageVenues from './pages/ManageVenues'
import Bookings from './pages/Bookings'

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/venues', element: <ManageVenues /> },
  { path: '/bookings', element: <Bookings /> },
])
