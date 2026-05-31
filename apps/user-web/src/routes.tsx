import { createBrowserRouter } from 'react-router-dom'
import Home from './pages/Home'
import VenueDetails from './pages/VenueDetails'
import MyBookings from './pages/MyBookings'

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/venues/:id', element: <VenueDetails /> },
  { path: '/my-bookings', element: <MyBookings /> },
])
